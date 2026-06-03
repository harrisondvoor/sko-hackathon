import http from "node:http";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const sampleFile = path.join(__dirname, "data", "sample-updates.txt");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

const briefShape = {
  briefTitle: "string",
  summary: "string",
  confidence: "number from 0 to 100",
  highlights: ["string"],
  decisions: [{ title: "string", whyItMatters: "string", evidence: "string" }],
  actionItems: [{ task: "string", owner: "string", due: "string", priority: "High|Medium|Low", source: "string" }],
  risks: [{ risk: "string", severity: "High|Medium|Low", nextStep: "string", source: "string" }],
  followUps: [{ personOrTeam: "string", reason: "string", suggestedMessage: "string" }],
  skipList: [{ item: "string", reason: "string" }],
  signalMap: [{ label: "string", count: "number", tone: "decision|action|risk|info" }],
  timeline: [{ when: "string", event: "string", importance: "High|Medium|Low" }],
  judgeNarrative: {
    problem: "string",
    before: "string",
    after: "string",
    whyNow: "string"
  }
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, payload) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(payload);
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_500_000) {
      throw new Error("Request body is too large. Keep the update dump under 1.5 MB.");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const pathname = decodedPath === "/" ? "/index.html" : decodedPath;
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  const extension = path.extname(filePath);
  const stream = createReadStream(filePath);

  stream.on("open", () => {
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extension) || "application/octet-stream",
    });
    stream.pipe(response);
  });

  stream.on("error", () => {
    sendText(response, 404, "Not found");
  });
}

async function handleAnalyze(request, response) {
  try {
    const body = await readRequestBody(request);
    const input = JSON.parse(body || "{}");

    if (!input.rawUpdates || input.rawUpdates.trim().length < 40) {
      sendJson(response, 400, {
        error: "Paste or upload at least a few updates so the app has something to analyze.",
      });
      return;
    }

    const startedAt = Date.now();
    let brief;
    let engine = "local";

    if (process.env.OPENAI_API_KEY && process.env.FORCE_LOCAL_AI !== "true") {
      try {
        brief = await createOpenAiBrief(input);
        engine = "openai";
      } catch (error) {
        brief = createLocalBrief(input, error.message);
        engine = "local-fallback";
      }
    } else {
      brief = createLocalBrief(input);
    }

    sendJson(response, 200, {
      engine,
      latencyMs: Date.now() - startedAt,
      generatedAt: new Date().toISOString(),
      brief: normalizeBrief(brief),
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Unable to analyze updates." });
  }
}

async function createOpenAiBrief(input) {
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const prompt = [
    "You are What Did I Miss?, an AI catch-up assistant for busy employees returning from PTO, travel, illness, or meeting overload.",
    "Create a concise, evidence-backed catch-up brief from the provided updates.",
    "Prioritize decisions, actions assigned to the user, urgent risks, and follow-ups.",
    "Be specific. Avoid generic summaries. Return only valid JSON matching this shape:",
    JSON.stringify(briefShape, null, 2),
    "Use short evidence snippets. Do not invent people, dates, or facts."
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            absenceWindow: input.absenceWindow,
            role: input.role,
            focus: input.focus,
            rawUpdates: input.rawUpdates,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${detail.slice(0, 220)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response did not include a message.");
  }

  return JSON.parse(content);
}

function normalizeBrief(brief) {
  return {
    briefTitle: brief.briefTitle || "Your Catch-Up Brief",
    summary: brief.summary || "The app found important updates, actions, and decisions in the missed context.",
    confidence: clampNumber(brief.confidence, 0, 100, 78),
    highlights: ensureArray(brief.highlights).slice(0, 5),
    decisions: ensureArray(brief.decisions).slice(0, 6),
    actionItems: ensureArray(brief.actionItems).slice(0, 8),
    risks: ensureArray(brief.risks).slice(0, 6),
    followUps: ensureArray(brief.followUps).slice(0, 6),
    skipList: ensureArray(brief.skipList).slice(0, 6),
    signalMap: ensureArray(brief.signalMap).slice(0, 8),
    timeline: ensureArray(brief.timeline).slice(0, 8),
    judgeNarrative: {
      problem: brief.judgeNarrative?.problem || "Knowledge workers returning from time away have to reconstruct what changed across scattered messages, meetings, and documents.",
      before: brief.judgeNarrative?.before || "They skim feeds, search manually, ask teammates for context, and still miss decisions or action items.",
      after: brief.judgeNarrative?.after || "They paste or upload updates and receive a prioritized brief with decisions, owners, risks, follow-up drafts, and low-value noise separated out.",
      whyNow: brief.judgeNarrative?.whyNow || "Modern AI can turn messy communication streams into actionable context fast enough to change the first hour back at work.",
    },
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function createLocalBrief(input, fallbackReason = "") {
  const entries = parseEntries(input.rawUpdates);
  const decisions = entries.filter((entry) => entry.kinds.has("decision"));
  const actions = entries.filter((entry) => entry.kinds.has("action"));
  const risks = entries.filter((entry) => entry.kinds.has("risk"));
  const lowValue = entries.filter((entry) => entry.kinds.has("low"));
  const channels = buildSignalMap(entries);
  const topTopics = extractTopics(entries);
  const role = input.role || "employee";

  const highlights = [
    `${actions.length} action item${actions.length === 1 ? "" : "s"} ${actions.length === 1 ? "needs" : "need"} review before you fully re-enter the workstream.`,
    `${decisions.length} decision${decisions.length === 1 ? "" : "s"} ${decisions.length === 1 ? "changed" : "changed"} the state of work while you were away.`,
    `${risks.length} risk signal${risks.length === 1 ? "" : "s"} ${risks.length === 1 ? "may" : "may"} require escalation or a quick owner check.`,
  ];

  if (topTopics.length > 0) {
    highlights.unshift(`The strongest themes are ${topTopics.slice(0, 3).join(", ")}.`);
  }

  if (fallbackReason) {
    highlights.push("The remote AI call was unavailable, so the local analyzer produced this demo-safe brief.");
  }

  return {
    briefTitle: makeBriefTitle(input, entries),
    summary: makeSummary(entries, decisions, actions, risks, topTopics),
    confidence: Math.min(94, 60 + decisions.length * 5 + actions.length * 4 + risks.length * 3),
    highlights,
    decisions: decisions.slice(0, 6).map((entry) => ({
      title: cleanSentence(entry.text),
      whyItMatters: "This looks like a decision or alignment point that changes what the team should do next.",
      evidence: entry.original,
    })),
    actionItems: actions.slice(0, 8).map((entry) => ({
      task: cleanAction(entry.text),
      owner: extractOwner(entry.text),
      due: extractDue(entry.text),
      priority: entry.priority,
      source: entry.channel,
    })),
    risks: risks.slice(0, 6).map((entry) => ({
      risk: cleanSentence(entry.text),
      severity: entry.priority,
      nextStep: "Confirm owner, current status, and whether this blocks the next customer or team milestone.",
      source: entry.channel,
    })),
    followUps: makeFollowUps(actions, risks, role),
    skipList: lowValue.slice(0, 6).map((entry) => ({
      item: cleanSentence(entry.text),
      reason: "Likely low urgency, FYI-only, or useful context after the immediate re-entry work is handled.",
    })),
    signalMap: channels,
    timeline: entries.slice(0, 8).map((entry) => ({
      when: entry.when,
      event: cleanSentence(entry.text),
      importance: entry.priority,
    })),
    judgeNarrative: {
      problem: "Employees returning from PTO, business travel, sick leave, or back-to-back meeting days face a messy wall of missed Slack messages, email threads, docs, and tickets.",
      before: "They skim chronologically, ask coworkers for summaries, miss buried decisions, and spend the first hour back doing information archaeology instead of useful work.",
      after: "What Did I Miss? converts scattered updates into a prioritized re-entry plan: decisions, action items, risks, follow-up drafts, and low-value noise are separated in one screen.",
      whyNow: "Large language models can understand messy human updates well enough to turn communication overload into an actionable workflow, not just a passive summary.",
    },
  };
}

function parseEntries(rawUpdates) {
  return rawUpdates
    .replace(/\s+(?=\[20\d{2}-\d{2}-\d{2}\s)/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const channelMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      const channel = channelMatch ? channelMatch[1] : inferChannel(line);
      const text = channelMatch ? channelMatch[2] : line.replace(/^[A-Za-z -]+:\s*/, "");
      const kinds = classify(text);

      return {
        original: line,
        text,
        channel,
        when: extractWhen(channel) || `Update ${index + 1}`,
        kinds,
        priority: scorePriority(text, kinds),
      };
    });
}

function inferChannel(line) {
  const match = line.match(/^([#A-Za-z][A-Za-z0-9 #_-]{1,28}):/);
  return match ? match[1].trim() : "Mixed updates";
}

function extractWhen(channel) {
  const match = channel.match(/(20\d{2}-\d{2}-\d{2}|Jun(?:e)?\s+\d{1,2}|Mon|Tue|Wed|Thu|Fri)/i);
  return match ? match[1] : "";
}

function classify(text) {
  const kinds = new Set(["info"]);
  if (/\b(decided|decision|approved|confirmed|aligned|finalized|go\/no-go|selected|locked|greenlit)\b/i.test(text)) {
    kinds.add("decision");
  }
  if (/\b(action|todo|to do|owner|assigned|please|need|needs|can you|review|send|follow up|follow-up|due|by eod|by friday|before)\b/i.test(text)) {
    kinds.add("action");
  }
  if (/\b(risk|blocked|blocker|issue|delay|delayed|slip|slipped|urgent|escalate|red|concern|outage|failed|missing|policy|security)\b/i.test(text)) {
    kinds.add("risk");
  }
  if (/\b(fyi|nice to know|optional|low priority|social|photo|snack|swag|parking validation|reminder only)\b/i.test(text)) {
    kinds.add("low");
  }
  return kinds;
}

function scorePriority(text, kinds) {
  if (/\b(urgent|today|by eod|exec|customer|blocked|security|risk|red|deadline|launch|renewal)\b/i.test(text)) {
    return "High";
  }
  if (kinds.has("action") || kinds.has("decision") || kinds.has("risk")) {
    return "Medium";
  }
  return "Low";
}

function extractTopics(entries) {
  const topicPatterns = [
    ["customer", /\b(customer|account|renewal|deal|acme|globex|call)\b/i],
    ["launch readiness", /\b(launch|release|ship|rollout|go-live|demo)\b/i],
    ["pricing and approvals", /\b(pricing|discount|exception|approval|procurement)\b/i],
    ["project delivery", /\b(project|milestone|sprint|jira|roadmap|owner)\b/i],
    ["travel and expenses", /\b(expense|receipt|travel|hotel|meal|reimbursement)\b/i],
    ["risk management", /\b(risk|blocker|security|incident|policy|delay)\b/i],
    ["team coordination", /\b(team|offsite|standup|workshop|sync|handoff)\b/i],
  ];

  return topicPatterns
    .map(([label, pattern]) => ({
      label,
      count: entries.filter((entry) => pattern.test(entry.text)).length,
    }))
    .filter((topic) => topic.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((topic) => topic.label);
}

function buildSignalMap(entries) {
  const buckets = new Map();

  for (const entry of entries) {
    const key = entry.channel.replace(/^\d{4}-\d{2}-\d{2}\s*/, "");
    const current = buckets.get(key) || { label: key, count: 0, tone: "info", weight: 0 };
    current.count += 1;

    const weight = (entry.kinds.has("risk") ? 4 : 0) + (entry.kinds.has("action") ? 3 : 0) + (entry.kinds.has("decision") ? 2 : 0);
    if (weight > current.weight) {
      current.weight = weight;
      current.tone = entry.kinds.has("risk") ? "risk" : entry.kinds.has("action") ? "action" : entry.kinds.has("decision") ? "decision" : "info";
    }
    buckets.set(key, current);
  }

  return [...buckets.values()]
    .sort((a, b) => b.weight - a.weight || b.count - a.count)
    .slice(0, 8)
    .map(({ label, count, tone }) => ({ label, count, tone }));
}

function makeBriefTitle(input, entries) {
  const window = input.absenceWindow || "your time away";
  return `${entries.length} missed updates from ${window}`;
}

function makeSummary(entries, decisions, actions, risks, topTopics) {
  const themes = topTopics.length ? ` The main themes are ${topTopics.slice(0, 3).join(", ")}.` : "";
  return `You missed ${entries.length} updates. The brief found ${actions.length} action items, ${decisions.length} decisions, and ${risks.length} risk signals.${themes} Start with the high-priority actions and risk checks, then scan the low-value items later.`;
}

function makeFollowUps(actions, risks, role) {
  const followUps = [];
  const candidates = [...actions.slice(0, 3), ...risks.slice(0, 3)];

  for (const entry of candidates) {
    const owner = extractOwner(entry.text);
    const personOrTeam = owner === "You" || owner === "Unassigned" ? cleanChannelName(entry.channel) : owner;
    followUps.push({
      personOrTeam,
      reason: entry.kinds.has("risk") ? "Risk or blocker needs current status." : "Action item needs confirmation.",
      suggestedMessage: `Hi ${personOrTeam}, I am catching up as the ${role}. Can you confirm the latest status on: ${trimForMessage(entry.text)}?`,
    });
  }

  return followUps;
}

function cleanChannelName(channel) {
  return channel.replace(/^20\d{2}-\d{2}-\d{2}\s*/, "").trim() || "team";
}

function extractOwner(text) {
  if (/\b(you|your|harrison)\b/i.test(text)) return "You";

  const ownerMatch = text.match(/\bowner[:=]\s*(@?[A-Z][A-Za-z.-]+(?:\s[A-Z][A-Za-z.-]+)?|@[a-z0-9_.-]+)/);
  if (ownerMatch) return ownerMatch[1].replace(/^@/, "");

  const assignedMatch = text.match(/\bassigned to\s+(@?[A-Z][A-Za-z.-]+(?:\s[A-Z][A-Za-z.-]+)?|@[a-z0-9_.-]+)/i);
  if (assignedMatch) return assignedMatch[1].replace(/^@/, "");

  const mentionMatch = text.match(/@([a-z0-9_.-]+)/i);
  if (mentionMatch) return mentionMatch[1];

  return "Unassigned";
}

function extractDue(text) {
  const explicitDue = text.match(/\bDue\s+((?:EOD|today|tomorrow|Friday|Thursday|Wednesday|Tuesday|Monday|Jun(?:e)?\s+\d{1,2}|\d{1,2}\/\d{1,2})(?:\s+\w+)*)/i);
  if (explicitDue) return explicitDue[1].replace(/[.,;:]$/, "");

  const dueMatch = text.match(/\b(?:by|before)\s+((?:EOD|today|tomorrow|Friday|Thursday|Wednesday|Tuesday|Monday|Jun(?:e)?\s+\d{1,2}|\d{1,2}\/\d{1,2})(?:\s+\w+)*)/i);
  return dueMatch ? dueMatch[1].replace(/[.,;:]$/, "") : "No date found";
}

function cleanAction(text) {
  return cleanSentence(text)
    .replace(/^action[:\s-]*/i, "")
    .replace(/^todo[:\s-]*/i, "")
    .replace(/\bOwner[:=]\s*[^.]+\.?/i, "")
    .replace(/\bDue\s+[^.]+\.?/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSentence(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned;
}

function trimForMessage(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 110 ? `${cleaned.slice(0, 107)}...` : cleaned;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/sample") {
    const sample = await readFile(sampleFile, "utf8");
    sendText(response, 200, sample);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/analyze") {
    await handleAnalyze(request, response);
    return;
  }

  if (request.method === "GET") {
    await serveStatic(request, response);
    return;
  }

  sendText(response, 405, "Method not allowed");
});

server.listen(port, host, () => {
  console.log(`What Did I Miss? is running at http://${host}:${port}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log("No OPENAI_API_KEY found. Using local fallback analyzer for demo mode.");
  }
});
