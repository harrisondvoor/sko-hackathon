const people = [
  {
    id: "alex",
    name: "Alex Rivera",
    initials: "AR",
    roleMode: "Mentee",
    jobTitle: "Cloud Solution Engineer",
    org: "OCI North America",
    location: "Seattle, WA",
    timezone: "PST",
    availability: "Two 30-minute sessions per month",
    mentoringStyle: "Structured, direct, and action-oriented",
    skillsOffered: ["customer discovery", "demo strategy", "competitive positioning"],
    skillsWanted: ["OCI architecture", "executive presence", "career navigation"],
    goals: ["Move toward solution architecture leadership", "Tell stronger customer transformation stories"],
    prompts: [
      ["I am working toward", "A broader architecture role with more executive-facing customer work."],
      ["A great mentor would", "Challenge my assumptions and help me turn field experience into strategy."]
    ],
    color: "#c74634"
  },
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    roleMode: "Mentor",
    jobTitle: "Principal Cloud Architect",
    org: "OCI Strategic Accounts",
    location: "Redwood City, CA",
    timezone: "PST",
    availability: "Biweekly Fridays",
    mentoringStyle: "Systems thinker, crisp feedback, practical homework",
    skillsOffered: ["OCI architecture", "executive presence", "career navigation", "technical storytelling"],
    skillsWanted: ["field signal", "customer discovery"],
    goals: ["Help high-potential ICs grow into trusted architecture advisors"],
    prompts: [
      ["I can help with", "Turning complex OCI tradeoffs into boardroom-clear narratives."],
      ["My favorite first session", "Map your next promotion packet to three visible customer outcomes."]
    ],
    color: "#0f766e"
  },
  {
    id: "jordan",
    name: "Jordan Patel",
    initials: "JP",
    roleMode: "Both",
    jobTitle: "Senior Product Manager",
    org: "Oracle Database",
    location: "Austin, TX",
    timezone: "CST",
    availability: "Monthly deep dives",
    mentoringStyle: "Curious, strategic, and narrative-heavy",
    skillsOffered: ["roadmap influence", "stakeholder management", "product strategy"],
    skillsWanted: ["technical storytelling", "field signal", "AI adoption"],
    goals: ["Trade mentorship across product strategy and customer-facing influence"],
    prompts: [
      ["I can help with", "Making a fuzzy product opportunity sound crisp enough to fund."],
      ["Ask me about", "How to turn customer pain into roadmap language."]
    ],
    color: "#4f46e5"
  },
  {
    id: "priya",
    name: "Priya Nair",
    initials: "PN",
    roleMode: "Mentor",
    jobTitle: "VP, Customer Success",
    org: "Oracle Applications",
    location: "New York, NY",
    timezone: "EST",
    availability: "One lunch session per month",
    mentoringStyle: "Warm, candid, and sponsorship-minded",
    skillsOffered: ["executive presence", "career navigation", "customer escalation", "sponsorship"],
    skillsWanted: ["AI adoption", "product strategy"],
    goals: ["Open doors for emerging leaders who want larger customer ownership"],
    prompts: [
      ["I can help with", "Reading the room when the room has a CIO, CFO, and a red account."],
      ["A win looks like", "You leave with a clearer story, a sharper ask, and one next sponsor."]
    ],
    color: "#b45309"
  },
  {
    id: "sam",
    name: "Sam Taylor",
    initials: "ST",
    roleMode: "Mentee",
    jobTitle: "Software Engineer",
    org: "Oracle Health",
    location: "Nashville, TN",
    timezone: "CST",
    availability: "Weekly 20-minute check-ins",
    mentoringStyle: "Hands-on, specific, and momentum-focused",
    skillsOffered: ["AI adoption", "prototype velocity", "developer empathy"],
    skillsWanted: ["career navigation", "stakeholder management", "executive presence"],
    goals: ["Grow from feature execution into product-minded technical leadership"],
    prompts: [
      ["I want to learn", "How senior ICs earn trust before they have formal authority."],
      ["I bring", "Fast prototypes and a fresh read on where developers get stuck."]
    ],
    color: "#2563eb"
  },
  {
    id: "lina",
    name: "Lina Garcia",
    initials: "LG",
    roleMode: "Both",
    jobTitle: "Sales Engineering Manager",
    org: "Oracle Cloud",
    location: "Miami, FL",
    timezone: "EST",
    availability: "Two short sessions per month",
    mentoringStyle: "Practical, energetic, and field-tested",
    skillsOffered: ["demo strategy", "customer discovery", "stakeholder management"],
    skillsWanted: ["OCI architecture", "sponsorship", "roadmap influence"],
    goals: ["Share field craft while learning how to shape larger cloud strategy"],
    prompts: [
      ["I can help with", "Turning discovery calls into demos that feel personal."],
      ["I am looking for", "A mentor who can connect cloud depth with business impact."]
    ],
    color: "#15803d"
  }
];

const initialState = {
  activeUserId: "alex",
  swipes: [
    { from: "maya", to: "alex", action: "like" },
    { from: "jordan", to: "alex", action: "like" },
    { from: "alex", to: "sam", action: "like" },
    { from: "sam", to: "alex", action: "like" }
  ],
  matches: [
    {
      id: "match-alex-sam",
      userIds: ["alex", "sam"],
      createdAt: "2026-06-10T16:15:00.000Z"
    }
  ],
  messages: [
    {
      id: "message-1",
      matchId: "match-alex-sam",
      senderId: "sam",
      body: "Alex, your customer discovery background is exactly what I wanted to learn from. Happy to compare notes this week.",
      createdAt: "2026-06-10T16:17:00.000Z"
    },
    {
      id: "message-2",
      matchId: "match-alex-sam",
      senderId: "alex",
      body: "Absolutely. I can share the discovery template I use before architecture workshops.",
      createdAt: "2026-06-10T16:20:00.000Z"
    }
  ]
};

const storageKey = "oracle-mentor-match-state-v1";
const screen = document.querySelector("#screen");
const screenTitle = document.querySelector("#screenTitle");
const personaList = document.querySelector("#personaList");
const metricGrid = document.querySelector("#metricGrid");
const resetButton = document.querySelector("#resetButton");
const activePersonaButton = document.querySelector("#activePersonaButton");
const toast = document.querySelector("#toast");
const tabButtons = [...document.querySelectorAll(".tab-button")];

let state = loadState();
let currentView = "discover";
let openMatchId = getUserMatches(state.activeUserId)[0]?.id || "";
let toastTimer = 0;

resetButton.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  state = clone(initialState);
  currentView = "discover";
  openMatchId = getUserMatches(state.activeUserId)[0]?.id || "";
  saveState();
  render();
  showToast("Demo reset");
});

activePersonaButton.addEventListener("click", () => {
  currentView = "profile";
  render();
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    render();
  });
});

render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved?.activeUserId && Array.isArray(saved.swipes) && Array.isArray(saved.matches) && Array.isArray(saved.messages)) {
      return saved;
    }
  } catch {
    localStorage.removeItem(storageKey);
  }

  return clone(initialState);
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function render() {
  const activeUser = getPerson(state.activeUserId);
  document.body.dataset.view = currentView;
  screenTitle.textContent = viewTitle(currentView);
  renderTabs();
  renderPersonas();
  renderMetrics();
  renderActivePersona(activeUser);

  if (currentView === "discover") renderDiscoverView(activeUser);
  if (currentView === "matches") renderMatchesView(activeUser);
  if (currentView === "chat") renderChatView(activeUser);
  if (currentView === "profile") renderProfileView(activeUser);
}

function renderTabs() {
  tabButtons.forEach((button) => {
    const active = button.dataset.view === currentView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

function renderPersonas() {
  personaList.innerHTML = "";

  people.forEach((person) => {
    const button = document.createElement("button");
    button.className = `persona-chip${person.id === state.activeUserId ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      ${renderAvatar(person)}
      <span>
        <strong>${escapeHtml(person.name)}</strong>
        <small>${escapeHtml(person.roleMode)} | ${escapeHtml(person.jobTitle)}</small>
      </span>
    `;
    button.addEventListener("click", () => {
      state.activeUserId = person.id;
      currentView = "discover";
      openMatchId = getUserMatches(person.id)[0]?.id || "";
      saveState();
      render();
      showToast(`${person.name} selected`);
    });
    personaList.append(button);
  });
}

function renderMetrics() {
  const activeUser = getPerson(state.activeUserId);
  const metrics = [
    ["Fit queue", getCandidates(activeUser).length],
    ["Matches", getUserMatches(activeUser.id).length],
    ["Inbound likes", getInboundLikes(activeUser.id).length],
    ["Profile", `${profileCompleteness(activeUser)}%`]
  ];

  metricGrid.innerHTML = metrics.map(([label, value]) => `
    <div class="metric">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join("");
}

function renderActivePersona(person) {
  activePersonaButton.innerHTML = `
    ${renderAvatar(person)}
    <span>${escapeHtml(person.name.split(" ")[0])}</span>
  `;
}

function renderDiscoverView(activeUser) {
  const candidates = getCandidates(activeUser);
  const candidate = candidates[0];

  if (!candidate) {
    screen.innerHTML = `
      <section class="empty-state">
        <div class="empty-mark">+</div>
        <h3>No more profiles in this queue</h3>
        <p>This persona has reviewed every high-fit mentorship profile.</p>
      </section>
    `;
    return;
  }

  const person = candidate.person;
  const reasons = getFitReasons(activeUser, person);
  const incoming = hasLike(person.id, activeUser.id);

  screen.innerHTML = `
    <article class="profile-card">
      <div class="profile-media" style="${personStyle(person)}">
        <img src="/mentor-match-collage.png" alt="">
        <div class="media-shade"></div>
        <div class="profile-avatar-wrap">${renderAvatar(person, "large")}</div>
        <span class="fit-badge">${candidate.score}% fit</span>
      </div>

      <div class="profile-main">
        <div class="profile-heading">
          <div>
            <p class="eyebrow">${escapeHtml(person.roleMode)}</p>
            <h3>${escapeHtml(person.name)}</h3>
            <p>${escapeHtml(person.jobTitle)} | ${escapeHtml(person.org)}</p>
          </div>
          ${incoming ? `<span class="inbound-pill">Liked you</span>` : ""}
        </div>

        <div class="detail-row">
          <span>${escapeHtml(person.location)}</span>
          <span>${escapeHtml(person.availability)}</span>
        </div>

        <div class="prompt-stack">
          ${person.prompts.map(([label, body]) => `
            <section class="prompt">
              <span>${escapeHtml(label)}</span>
              <p>${escapeHtml(body)}</p>
            </section>
          `).join("")}
        </div>

        <section class="fit-panel">
          <h4>${escapeHtml(fitBand(candidate.score))}</h4>
          <ul>
            ${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
          </ul>
        </section>

        <div class="tag-cloud">
          ${person.skillsOffered.slice(0, 4).map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
        </div>
      </div>
    </article>

    <div class="swipe-actions">
      <button class="round-action pass-action" id="passButton" type="button" aria-label="Pass on ${escapeAttribute(person.name)}">
        <span aria-hidden="true">x</span>
      </button>
      <button class="round-action like-action" id="likeButton" type="button" aria-label="Like ${escapeAttribute(person.name)}">
        <span aria-hidden="true">+</span>
      </button>
    </div>
  `;

  document.querySelector("#passButton").addEventListener("click", () => passCandidate(person.id));
  document.querySelector("#likeButton").addEventListener("click", () => likeCandidate(person.id));
}

function renderMatchesView(activeUser) {
  const matches = getUserMatches(activeUser.id);
  const pending = getInboundLikes(activeUser.id);

  screen.innerHTML = `
    <section class="dashboard-band">
      <div>
        <span>${profileCompleteness(activeUser)}%</span>
        <p>Profile strength</p>
      </div>
      <div>
        <span>${matches.length}</span>
        <p>Active matches</p>
      </div>
      <div>
        <span>${pending.length}</span>
        <p>Inbound likes</p>
      </div>
    </section>

    ${pending.length ? `
      <section class="section-block">
        <h3>New interest</h3>
        <div class="mini-list">
          ${pending.map((person) => renderMiniProfile(person, "Likes your mentorship profile")).join("")}
        </div>
      </section>
    ` : ""}

    <section class="section-block">
      <h3>Matches</h3>
      ${matches.length ? `
        <div class="match-list">
          ${matches.map((match) => renderMatchCard(match, activeUser.id)).join("")}
        </div>
      ` : `
        <div class="empty-inline">
          <h4>No matches yet</h4>
          <p>Mutual mentorship interest will appear here.</p>
        </div>
      `}
    </section>
  `;

  screen.querySelectorAll("[data-open-match]").forEach((button) => {
    button.addEventListener("click", () => {
      openMatchId = button.dataset.openMatch;
      currentView = "chat";
      render();
    });
  });
}

function renderChatView(activeUser) {
  const matches = getUserMatches(activeUser.id);
  if (!matches.length) {
    screen.innerHTML = `
      <section class="empty-state">
        <div class="empty-mark">&gt;</div>
        <h3>No active chats</h3>
        <p>Matched mentorship conversations will appear here.</p>
      </section>
    `;
    return;
  }

  if (!matches.some((match) => match.id === openMatchId)) {
    openMatchId = matches[0].id;
  }

  const match = matches.find((item) => item.id === openMatchId);
  const other = getOtherParticipant(match, activeUser.id);
  const messages = getMessages(match.id);

  screen.innerHTML = `
    <section class="chat-picker" aria-label="Match conversations">
      ${matches.map((item) => {
        const person = getOtherParticipant(item, activeUser.id);
        return `
          <button class="conversation-chip${item.id === match.id ? " active" : ""}" type="button" data-open-match="${escapeAttribute(item.id)}">
            ${renderAvatar(person)}
            <span>${escapeHtml(person.name.split(" ")[0])}</span>
          </button>
        `;
      }).join("")}
    </section>

    <section class="chat-panel">
      <header class="chat-header">
        ${renderAvatar(other)}
        <div>
          <h3>${escapeHtml(other.name)}</h3>
          <p>${escapeHtml(other.jobTitle)}</p>
        </div>
      </header>

      <div class="message-list" id="messageList">
        ${messages.map((message) => renderMessage(message, activeUser.id)).join("")}
      </div>

      <form class="message-form" id="messageForm">
        <input id="messageInput" type="text" autocomplete="off" maxlength="220" placeholder="Message ${escapeAttribute(other.name.split(" ")[0])}">
        <button type="submit" aria-label="Send message">
          <span aria-hidden="true">&gt;</span>
        </button>
      </form>
    </section>
  `;

  screen.querySelectorAll("[data-open-match]").forEach((button) => {
    button.addEventListener("click", () => {
      openMatchId = button.dataset.openMatch;
      render();
    });
  });

  document.querySelector("#messageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#messageInput");
    sendMessage(match.id, activeUser.id, input.value);
  });

  const messageList = document.querySelector("#messageList");
  messageList.scrollTop = messageList.scrollHeight;
}

function renderProfileView(activeUser) {
  screen.innerHTML = `
    <section class="profile-summary">
      <div class="profile-cover" style="${personStyle(activeUser)}">
        ${renderAvatar(activeUser, "large")}
      </div>
      <h3>${escapeHtml(activeUser.name)}</h3>
      <p>${escapeHtml(activeUser.jobTitle)} | ${escapeHtml(activeUser.org)}</p>
      <div class="detail-row centered">
        <span>${escapeHtml(activeUser.roleMode)}</span>
        <span>${escapeHtml(activeUser.location)}</span>
      </div>
    </section>

    <section class="section-block">
      <h3>Goals</h3>
      <div class="stack-list">
        ${activeUser.goals.map((goal) => `<p>${escapeHtml(goal)}</p>`).join("")}
      </div>
    </section>

    <section class="section-block two-column">
      <div>
        <h3>Offers</h3>
        <div class="tag-cloud">
          ${activeUser.skillsOffered.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
        </div>
      </div>
      <div>
        <h3>Wants</h3>
        <div class="tag-cloud">
          ${activeUser.skillsWanted.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
        </div>
      </div>
    </section>

    <section class="section-block">
      <h3>Prompts</h3>
      <div class="prompt-stack">
        ${activeUser.prompts.map(([label, body]) => `
          <section class="prompt">
            <span>${escapeHtml(label)}</span>
            <p>${escapeHtml(body)}</p>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function passCandidate(candidateId) {
  setSwipe(state.activeUserId, candidateId, "pass");
  saveState();
  render();
  showToast("Passed");
}

function likeCandidate(candidateId) {
  const activeUser = getPerson(state.activeUserId);
  const candidate = getPerson(candidateId);
  setSwipe(activeUser.id, candidate.id, "like");

  if (hasLike(candidate.id, activeUser.id)) {
    const match = ensureMatch(activeUser.id, candidate.id);
    openMatchId = match.id;
    currentView = "chat";
    showToast(`Matched with ${candidate.name}`);
  } else {
    showToast(`Interest sent to ${candidate.name}`);
  }

  saveState();
  render();
}

function sendMessage(matchId, senderId, body) {
  const trimmed = body.trim();
  if (!trimmed) return;

  state.messages.push({
    id: `message-${Date.now()}`,
    matchId,
    senderId,
    body: trimmed,
    createdAt: new Date().toISOString()
  });

  saveState();
  render();
}

function setSwipe(from, to, action) {
  state.swipes = state.swipes.filter((swipe) => !(swipe.from === from && swipe.to === to));
  state.swipes.push({ from, to, action });
}

function ensureMatch(firstId, secondId) {
  const existing = state.matches.find((match) => includesPair(match.userIds, firstId, secondId));
  if (existing) return existing;

  const id = `match-${[firstId, secondId].sort().join("-")}-${Date.now()}`;
  const match = {
    id,
    userIds: [firstId, secondId],
    createdAt: new Date().toISOString()
  };
  state.matches.unshift(match);

  const first = getPerson(firstId);
  const second = getPerson(secondId);
  state.messages.push({
    id: `message-${Date.now()}-starter`,
    matchId: id,
    senderId: secondId,
    body: `${first.name.split(" ")[0]}, glad we matched. Your goals line up nicely with what I can help with.`,
    createdAt: new Date().toISOString()
  });

  return match;
}

function getCandidates(activeUser) {
  return people
    .filter((person) => person.id !== activeUser.id)
    .filter((person) => isRoleCompatible(activeUser, person))
    .filter((person) => !isMatched(activeUser.id, person.id))
    .filter((person) => !hasSwipe(activeUser.id, person.id))
    .map((person) => ({
      person,
      score: computeScore(activeUser, person)
    }))
    .sort((a, b) => Number(hasLike(b.person.id, activeUser.id)) - Number(hasLike(a.person.id, activeUser.id)) || b.score - a.score);
}

function isRoleCompatible(activeUser, candidate) {
  if (activeUser.roleMode === "Mentee") return candidate.roleMode === "Mentor" || candidate.roleMode === "Both";
  if (activeUser.roleMode === "Mentor") return candidate.roleMode === "Mentee" || candidate.roleMode === "Both";
  return candidate.roleMode !== activeUser.roleMode || candidate.roleMode === "Both";
}

function computeScore(activeUser, candidate) {
  const offeredToActive = overlap(activeUser.skillsWanted, candidate.skillsOffered).length;
  const activeCanHelp = overlap(activeUser.skillsOffered, candidate.skillsWanted).length;
  const sharedGoalSignal = overlap(words(activeUser.goals.join(" ")), words(candidate.goals.join(" "))).length;
  const incomingBoost = hasLike(candidate.id, activeUser.id) ? 7 : 0;
  const bothBoost = activeUser.roleMode === "Both" || candidate.roleMode === "Both" ? 4 : 0;
  const score = 70 + offeredToActive * 7 + activeCanHelp * 5 + Math.min(sharedGoalSignal, 4) + incomingBoost + bothBoost;
  return Math.max(72, Math.min(score, 98));
}

function getFitReasons(activeUser, candidate) {
  const reasons = [];
  const offeredToActive = overlap(activeUser.skillsWanted, candidate.skillsOffered);
  const activeCanHelp = overlap(activeUser.skillsOffered, candidate.skillsWanted);

  if (offeredToActive.length) {
    reasons.push(`Can help with ${offeredToActive.slice(0, 2).join(" and ")}`);
  }

  if (activeCanHelp.length) {
    reasons.push(`Shared learning loop around ${activeCanHelp.slice(0, 2).join(" and ")}`);
  }

  reasons.push(candidate.availability);
  reasons.push(candidate.mentoringStyle);
  return reasons.slice(0, 4);
}

function getInboundLikes(userId) {
  return state.swipes
    .filter((swipe) => swipe.to === userId && swipe.action === "like")
    .filter((swipe) => !hasSwipe(userId, swipe.from))
    .filter((swipe) => !isMatched(userId, swipe.from))
    .map((swipe) => getPerson(swipe.from));
}

function getUserMatches(userId) {
  return state.matches
    .filter((match) => match.userIds.includes(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getMessages(matchId) {
  return state.messages
    .filter((message) => message.matchId === matchId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function getOtherParticipant(match, userId) {
  return getPerson(match.userIds.find((id) => id !== userId));
}

function getPerson(id) {
  return people.find((person) => person.id === id);
}

function hasSwipe(from, to) {
  return state.swipes.some((swipe) => swipe.from === from && swipe.to === to);
}

function hasLike(from, to) {
  return state.swipes.some((swipe) => swipe.from === from && swipe.to === to && swipe.action === "like");
}

function isMatched(firstId, secondId) {
  return state.matches.some((match) => includesPair(match.userIds, firstId, secondId));
}

function includesPair(userIds, firstId, secondId) {
  return userIds.includes(firstId) && userIds.includes(secondId);
}

function overlap(first, second) {
  const normalized = new Set(second.map((item) => item.toLowerCase()));
  return first.filter((item) => normalized.has(item.toLowerCase()));
}

function words(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4);
}

function profileCompleteness(person) {
  const values = [
    person.name,
    person.roleMode,
    person.jobTitle,
    person.org,
    person.location,
    person.availability,
    person.mentoringStyle,
    person.skillsOffered.length,
    person.skillsWanted.length,
    person.goals.length,
    person.prompts.length
  ];
  const complete = values.filter(Boolean).length;
  return Math.round((complete / values.length) * 100);
}

function fitBand(score) {
  if (score >= 92) return "Exceptional mentorship fit";
  if (score >= 84) return "Strong mentorship fit";
  return "Promising mentorship fit";
}

function viewTitle(view) {
  return {
    discover: "Discover",
    matches: "Matches",
    chat: "Chat",
    profile: "Profile"
  }[view];
}

function renderMiniProfile(person, note) {
  return `
    <article class="mini-profile">
      ${renderAvatar(person)}
      <div>
        <h4>${escapeHtml(person.name)}</h4>
        <p>${escapeHtml(note)}</p>
      </div>
    </article>
  `;
}

function renderMatchCard(match, activeUserId) {
  const person = getOtherParticipant(match, activeUserId);
  const messages = getMessages(match.id);
  const latest = messages[messages.length - 1];

  return `
    <button class="match-card" type="button" data-open-match="${escapeAttribute(match.id)}">
      ${renderAvatar(person)}
      <span>
        <strong>${escapeHtml(person.name)}</strong>
        <small>${escapeHtml(latest?.body || "Start the conversation")}</small>
      </span>
      <em>${escapeHtml(person.roleMode)}</em>
    </button>
  `;
}

function renderMessage(message, activeUserId) {
  const mine = message.senderId === activeUserId;
  const sender = getPerson(message.senderId);
  const time = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt));

  return `
    <article class="message ${mine ? "mine" : "theirs"}">
      <p>${escapeHtml(message.body)}</p>
      <span>${escapeHtml(mine ? "You" : sender.name.split(" ")[0])} | ${escapeHtml(time)}</span>
    </article>
  `;
}

function renderAvatar(person, size = "") {
  return `
    <span class="avatar ${escapeAttribute(size)}" style="${personStyle(person)}" aria-hidden="true">
      ${escapeHtml(person.initials)}
    </span>
  `;
}

function personStyle(person) {
  return `--person-color:${escapeAttribute(person.color)}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
