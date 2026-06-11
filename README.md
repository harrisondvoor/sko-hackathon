# Oracle Mentor Match

Oracle Mentor Match is a mobile-first hackathon demo for matching Oracle mentors and mentees. It turns the Hinge-style product idea into a runnable local prototype with seeded personas, profile cards, mutual likes, matches, and in-app chat.

## Run the demo

```bash
node server.js
```

Open:

```text
http://localhost:3000
```

If `node` is not on your PATH in the Codex desktop environment, use the bundled runtime:

```bash
/Users/harrisondvoor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.js
```

## What is implemented

- Seeded demo personas for judge-friendly walkthroughs.
- Users can be a mentor, mentee, or both.
- Mobile discovery cards with mentorship fit, goals, skills, availability, org context, and prompts.
- Like/pass flow with deterministic compatibility scoring.
- Mutual-like match creation.
- In-app chat scoped to matched users.
- Matches dashboard with profile completeness and active chats.
- Local state persistence with a reset button.

## Intended production stack

- Mobile app: Expo React Native + TypeScript.
- Backend MVP: Supabase Postgres, Auth, Storage, Realtime, and Edge Functions.
- Oracle pilot path: OCI Functions, Oracle Autonomous Database, OCI Object Storage, and OCI IAM / Identity Domains.

The current repo keeps the demo dependency-free so it runs reliably in a hackathon room. The included `supabase/schema.sql` captures the backend tables expected by the Expo/Supabase version.
