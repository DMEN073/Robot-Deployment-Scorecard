# Robot Deployment Scorecard

Tracks which humanoid-robot capabilities still need research before deployment, how mature each one is, and the metrics that decide when it is solved.

- Content lives in `data/scorecard.json`.
- `node build.mjs` generates the site into `dist/` (no dependencies needed).
- The live site also serves `/scorecard.md`, `/scorecard.json` and `/llms.txt` so AI tools can read it.
- Update rules for people and AI agents: see `AGENTS.md`.
