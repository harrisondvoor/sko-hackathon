# What Did I Miss?

What Did I Miss? is an AI-powered catch-up assistant for employees returning from PTO, customer travel, sick leave, conferences, or a few days of meeting overload.

It converts scattered Slack updates, email snippets, meeting notes, and ticket comments into a prioritized re-entry brief:

- Decisions that changed the state of work
- Action items, owners, and due dates
- Risk signals and likely blockers
- Follow-up message drafts
- Low-priority noise to skip until later
- A judge-ready product narrative aligned to the hackathon rubric

## Run the demo

```bash
node server.js
```

Open:

```text
http://localhost:3000
```

Demo steps:

1. Click `Load demo data`.
2. Click `Generate brief`.
3. Review the tabs: `Actions`, `Decisions`, `Risks`, `Follow-ups`, `Signal map`, and `Judge view`.
4. Click `Copy brief` to copy a shareable catch-up summary.

## Optional live AI mode

The app works without any dependencies or network calls by using a local fallback analyzer. To use a hosted AI model, start it with an OpenAI API key:

```bash
OPENAI_API_KEY=your_key_here node server.js
```

Optional model override:

```bash
OPENAI_MODEL=gpt-4.1-mini OPENAI_API_KEY=your_key_here node server.js
```

If the AI call fails, the app automatically falls back to local demo intelligence so the presentation flow still works.

## Hackathon rubric framing

Demand reality:

Employees returning from time away lose time reconstructing context across Slack, email, tickets, docs, and meetings. The pain is specific: missed decisions, buried action items, duplicated catch-up meetings, and late follow-ups.

Target customer:

The first user is any knowledge worker in a large organization who returns from PTO, customer travel, sick leave, conferences, or heavy meeting days. The broader buyer is a team leader or operations group trying to reduce coordination drag.

Solution fit:

Before, the user manually scrolls and asks teammates what changed. After, they paste or upload updates and receive a prioritized plan for the first hour back.

Technical execution:

The project is a no-dependency Node web app with a static frontend and `/api/analyze` endpoint. The endpoint can use a real AI call when configured, with a local fallback analyzer for reliable demos.

Differentiation:

The app is not just a summary tool. It separates signal from noise, extracts owners and due dates, highlights risks, drafts follow-ups, and gives the user a re-entry workflow.
