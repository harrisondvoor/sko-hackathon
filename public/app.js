const form = document.querySelector("#briefForm");
const loadDemoButton = document.querySelector("#loadDemoButton");
const analyzeButton = document.querySelector("#analyzeButton");
const analyzeTopButton = document.querySelector("#analyzeTopButton");
const clearButton = document.querySelector("#clearButton");
const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const rawUpdates = document.querySelector("#rawUpdates");
const absenceWindow = document.querySelector("#absenceWindow");
const role = document.querySelector("#role");
const focus = document.querySelector("#focus");
const emptyState = document.querySelector("#emptyState");
const results = document.querySelector("#results");
const engineStatus = document.querySelector("#engineStatus");
const briefTitle = document.querySelector("#briefTitle");
const summary = document.querySelector("#summary");
const confidenceValue = document.querySelector("#confidenceValue");
const confidenceMeter = document.querySelector(".confidence-meter");
const highlights = document.querySelector("#highlights");
const tabPanel = document.querySelector("#tabPanel");
const copyButton = document.querySelector("#copyButton");
const copyStatus = document.querySelector("#copyStatus");

let activeBrief = null;
let activeTab = "actions";

loadDemoButton.addEventListener("click", loadDemoData);
clearButton.addEventListener("click", clearForm);
analyzeTopButton.addEventListener("click", () => form.requestSubmit());
form.addEventListener("submit", analyzeUpdates);
copyButton.addEventListener("click", copyBrief);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button === tab));
    renderTab();
  });
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) await readFileIntoTextarea(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", async (event) => {
  const file = event.dataTransfer.files?.[0];
  if (file) await readFileIntoTextarea(file);
});

async function loadDemoData() {
  setButtonsLoading(true, "Loading...");
  try {
    const response = await fetch("/api/sample");
    rawUpdates.value = await response.text();
    engineStatus.textContent = "Demo data loaded. Generate a brief to see the workflow.";
  } catch (error) {
    engineStatus.textContent = `Could not load demo data: ${error.message}`;
  } finally {
    setButtonsLoading(false);
  }
}

function clearForm() {
  rawUpdates.value = "";
  activeBrief = null;
  results.classList.add("hidden");
  emptyState.classList.remove("hidden");
  engineStatus.textContent = "Load the demo data, then generate a brief.";
  copyStatus.textContent = "";
}

async function readFileIntoTextarea(file) {
  const text = await file.text();
  rawUpdates.value = text;
  engineStatus.textContent = `${file.name} loaded. Generate a brief to analyze it.`;
}

async function analyzeUpdates(event) {
  event.preventDefault();

  if (rawUpdates.value.trim().length < 40) {
    engineStatus.textContent = "Paste more context or load the demo data first.";
    rawUpdates.focus();
    return;
  }

  setButtonsLoading(true, "Analyzing...");
  engineStatus.textContent = "Reading messy updates and separating signal from noise.";
  copyStatus.textContent = "";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawUpdates: rawUpdates.value,
        absenceWindow: absenceWindow.value,
        role: role.value,
        focus: focus.value,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to analyze updates.");
    }

    activeBrief = payload.brief;
    renderBrief(payload);
  } catch (error) {
    engineStatus.textContent = `Analysis failed: ${error.message}`;
  } finally {
    setButtonsLoading(false);
  }
}

function setButtonsLoading(isLoading, label = "Generate brief") {
  analyzeButton.disabled = isLoading;
  analyzeTopButton.disabled = isLoading;
  analyzeButton.textContent = isLoading ? label : "Generate catch-up brief";
  analyzeTopButton.textContent = isLoading ? label : "Generate brief";
}

function renderBrief(payload) {
  emptyState.classList.add("hidden");
  results.classList.remove("hidden");
  briefTitle.textContent = activeBrief.briefTitle;
  summary.textContent = activeBrief.summary;
  confidenceValue.textContent = `${Math.round(activeBrief.confidence)}%`;
  confidenceMeter.style.setProperty("--score", `${activeBrief.confidence}%`);
  engineStatus.textContent = `${engineLabel(payload.engine)} in ${payload.latencyMs} ms. Generated ${formatTime(payload.generatedAt)}.`;

  highlights.innerHTML = "";
  activeBrief.highlights.slice(0, 3).forEach((item) => {
    const block = document.createElement("div");
    block.className = "highlight";
    block.textContent = item;
    highlights.append(block);
  });

  renderTab();
}

function engineLabel(engine) {
  if (engine === "openai") return "Live AI brief";
  if (engine === "local-fallback") return "Local fallback brief";
  return "Local demo intelligence";
}

function formatTime(isoString) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
}

function renderTab() {
  if (!activeBrief) return;

  const renderers = {
    actions: renderActions,
    decisions: renderDecisions,
    risks: renderRisks,
    followups: renderFollowUps,
    signals: renderSignals,
    judge: renderJudgeView,
  };

  tabPanel.innerHTML = "";
  tabPanel.append(renderers[activeTab]());
}

function renderActions() {
  return renderCards(activeBrief.actionItems, {
    empty: "No action items found.",
    pill: (item) => item.priority,
    pillClass: (item) => item.priority.toLowerCase(),
    source: (item) => item.source,
    title: (item) => item.task,
    body: (item) => `Owner: ${item.owner}. Due: ${item.due}.`,
  });
}

function renderDecisions() {
  return renderCards(activeBrief.decisions, {
    empty: "No decisions found.",
    pill: () => "Decision",
    pillClass: () => "decision",
    source: (item) => item.evidence,
    title: (item) => item.title,
    body: (item) => item.whyItMatters,
  });
}

function renderRisks() {
  return renderCards(activeBrief.risks, {
    empty: "No risks found.",
    pill: (item) => item.severity,
    pillClass: (item) => item.severity.toLowerCase(),
    source: (item) => item.source,
    title: (item) => item.risk,
    body: (item) => item.nextStep,
  });
}

function renderFollowUps() {
  return renderCards(activeBrief.followUps, {
    empty: "No follow-ups found.",
    pill: () => "Draft",
    pillClass: () => "decision",
    source: (item) => item.personOrTeam,
    title: (item) => item.reason,
    body: (item) => item.suggestedMessage,
  });
}

function renderCards(items, config) {
  const list = document.createElement("div");
  list.className = "result-list";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = config.empty;
    list.append(empty);
    return list;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="card-topline">
        <span class="pill ${escapeAttribute(config.pillClass(item))}">${escapeHtml(config.pill(item))}</span>
        <span class="source">${escapeHtml(config.source(item) || "")}</span>
      </div>
      <h4>${escapeHtml(config.title(item) || "")}</h4>
      <p>${escapeHtml(config.body(item) || "")}</p>
    `;
    list.append(card);
  });

  return list;
}

function renderSignals() {
  const wrapper = document.createElement("div");
  wrapper.className = "signal-list";
  const max = Math.max(...activeBrief.signalMap.map((item) => item.count), 1);

  activeBrief.signalMap.forEach((item) => {
    const row = document.createElement("div");
    row.className = "signal-row";
    row.innerHTML = `
      <strong>${escapeHtml(item.label)}</strong>
      <span class="bar-track"><span class="bar ${escapeAttribute(item.tone)}" style="width:${Math.max(12, (item.count / max) * 100)}%"></span></span>
      <span>${item.count}</span>
    `;
    wrapper.append(row);
  });

  if (activeBrief.timeline.length) {
    const timeline = document.createElement("div");
    timeline.className = "result-list";
    timeline.style.marginTop = "18px";
    activeBrief.timeline.forEach((item) => {
      const card = document.createElement("article");
      card.className = "result-card";
      card.innerHTML = `
        <div class="card-topline">
          <span class="pill ${escapeAttribute(item.importance.toLowerCase())}">${escapeHtml(item.importance)}</span>
          <span class="source">${escapeHtml(item.when)}</span>
        </div>
        <h4>${escapeHtml(item.event)}</h4>
      `;
      timeline.append(card);
    });
    wrapper.append(timeline);
  }

  return wrapper;
}

function renderJudgeView() {
  const grid = document.createElement("div");
  grid.className = "judge-grid";
  const narrative = activeBrief.judgeNarrative;
  const rows = [
    ["Demand reality", narrative.problem],
    ["Before workflow", narrative.before],
    ["After workflow", narrative.after],
    ["Differentiation", narrative.whyNow],
  ];

  rows.forEach(([title, body]) => {
    const card = document.createElement("article");
    card.className = "judge-card";
    card.innerHTML = `<h4>${escapeHtml(title)}</h4><p>${escapeHtml(body)}</p>`;
    grid.append(card);
  });

  return grid;
}

async function copyBrief() {
  if (!activeBrief) return;
  const lines = [
    activeBrief.briefTitle,
    "",
    activeBrief.summary,
    "",
    "Highlights:",
    ...activeBrief.highlights.map((item) => `- ${item}`),
    "",
    "Actions:",
    ...activeBrief.actionItems.map((item) => `- [${item.priority}] ${item.task} Owner: ${item.owner}. Due: ${item.due}.`),
    "",
    "Decisions:",
    ...activeBrief.decisions.map((item) => `- ${item.title}`),
    "",
    "Risks:",
    ...activeBrief.risks.map((item) => `- [${item.severity}] ${item.risk}`),
  ];

  const text = lines.join("\n");

  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "Brief copied.";
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.left = "-9999px";
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    copyStatus.textContent = copied ? "Brief copied." : "Copy blocked by browser.";
  }

  window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return String(value || "").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
}
