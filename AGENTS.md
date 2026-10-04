# How to update this scorecard

This repository tracks which humanoid-robot capabilities still need research before deployment, how mature each is, and the metrics that decide when each is solved. It is maintained with AI help. Follow these rules for every change.

## Files

- `data/scorecard.json` is the only file to edit for content.
- `build.mjs` generates the site into `dist/`: `index.html`, `scorecard.md`, `scorecard.json` and `llms.txt`. Never edit `dist/` by hand; it is not committed.
- `src/style.css` holds the page styling.
- Vercel runs `node build.mjs` on every push and serves `dist/`.

To read the current scorecard as text, use `/scorecard.md` on the live site or `data/scorecard.json` in the repo.

## Data format (`data/scorecard.json`)

- `asOf`: date of the latest review, `YYYY-MM-DD`. Update it whenever content changes.
- `areas[]`: one entry per research area.
  - `id`: short slug, also the page anchor (`#edge`). Do not rename existing ids.
  - `necessity`: 3 Core, 2 Needed, 1 Later.
  - `maturity`: 0 Open, 1 Early, 2 Partial, 3 Near, 4 Solved enough.
  - `map`: position on the priority map. `x` is maturity (0 to 4), `y` is necessity (0.5 to 3.3). Keep `x` close to `maturity` and `y` close to `necessity`; nudge by up to 0.4 only to stop labels overlapping. `labelLeft: true` puts the label on the left of the dot.
  - `biggestGap`: one line.
  - `goal`: what the owner wants this capability to do.
  - `evidence[]`: `{ "text", "source" }`. What published work has shown, with numbers.
  - `gaps[]`: what is still missing for deployment.
  - `metrics[]`: `{ "metric", "measure", "target" }`. Targets are the owner's; mark new ones you propose as `"Proposed: …"`.
- `systemMetrics[]`: metrics that apply to every area.
- `engineering[]`: needs solved by engineering, not research.
- `notYet[]`: deliberately deprioritized for now.
- `changelog[]`: `{ "date", "change" }`, one entry per update, newest dates first in the output.

## Rules for changes

1. Cite only pages you actually opened. Put the paper or page URL in `source`. Say when a source is a community post or not peer reviewed.
2. Every evidence line states numbers: success rate, number of tasks or demos, hardware, rate in Hz or latency in ms.
3. Change `maturity` only with evidence, and say why in the changelog entry.
4. Add a `changelog` entry and update `asOf` for every change.
5. Do not delete the owner's metrics or targets. Propose changes in the changelog or ask.
6. Run `node build.mjs` before committing. It fails on invalid data.

## How the owner judges research

The owner deploys humanoid robots and cares about deployment, not general robot intelligence or benchmark scores. When assessing a paper, check:

- Real hardware, not simulation only. Simulators are not trusted for rigid mechanical contact (threads, latches, snap-fits).
- On-device rate and latency, ideally on Jetson Thor. The target is about 50 Hz reaction, not only action playback through chunking.
- Data budget: how many demonstrations, and success against the number of demos.
- A paired baseline on the same starts, not a published number from another setup.
- Generalization to unseen objects.
- Force: whether it uses force or tactile input, split into normal, shear and torsion.

Priorities: force-aware manipulation, edge inference, and workspace awareness (moving closer to reach or see, when to start a motion) come first. Long-running operation, speed tuning, people-safety behaviour, remote takeover and failure triggers are handled by engineering or deprioritized.
