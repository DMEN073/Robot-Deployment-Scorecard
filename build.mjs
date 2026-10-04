// Builds the site from data/scorecard.json into dist/.
// Outputs: index.html (all content as static HTML, no JavaScript needed),
// scorecard.md (plain-text copy for AI readers), scorecard.json, llms.txt.
// Run: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const data = JSON.parse(readFileSync("data/scorecard.json", "utf8"));
const css = readFileSync("src/style.css", "utf8");

// ---------- validation ----------
const errors = [];
const ids = new Set();
for (const a of data.areas) {
  if (!a.id || ids.has(a.id)) errors.push(`area id missing or duplicate: ${a.id}`);
  ids.add(a.id);
  if (![1, 2, 3].includes(a.necessity)) errors.push(`${a.id}: necessity must be 1, 2 or 3`);
  if (![0, 1, 2, 3, 4].includes(a.maturity)) errors.push(`${a.id}: maturity must be 0-4`);
  for (const k of ["name", "biggestGap", "goal"]) if (!a[k]) errors.push(`${a.id}: missing ${k}`);
  for (const k of ["evidence", "gaps", "metrics"]) if (!Array.isArray(a[k])) errors.push(`${a.id}: ${k} must be a list`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)) errors.push("asOf must be YYYY-MM-DD");
if (errors.length) { console.error("Invalid data/scorecard.json:\n- " + errors.join("\n- ")); process.exit(1); }

// ---------- helpers ----------
const MAT = data.scales.maturity;
const NEC = data.scales.necessity;
const NEC_CLASS = { 1: "nec-later", 2: "nec-needed", 3: "nec-core" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtDate = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const areas = [...data.areas].sort((a, b) => b.necessity - a.necessity || a.maturity - b.maturity);
const meter = (m) => `<div class="meter m${m}" aria-label="Maturity: ${MAT[m]}">${[0, 1, 2, 3, 4].map((i) => `<i class="${i <= m ? "on" : ""}"></i>`).join("")}<span>${MAT[m]}</span></div>`;
const chip = (n) => `<span class="chip ${NEC_CLASS[n]}">${NEC[n]}</span>`;
const metricRows = (list) => list.map((r) => `<tr><td>${esc(r.metric)}</td><td>${esc(r.measure)}</td><td class="num">${esc(r.target)}</td></tr>`).join("");
const metricTable = (list) => `<div class="scroll"><table><thead><tr><th>Metric</th><th>How to measure</th><th>Target</th></tr></thead><tbody>${metricRows(list)}</tbody></table></div>`;

// ---------- priority map (SVG drawn at build time) ----------
function mapSvg() {
  const L = 90, R = 620, T = 24, B = 290;
  const X = (m) => L + (m * (R - L)) / 4, Y = (n) => B - ((n - 0.5) * (B - T)) / 2.8;
  const colors = ["--open", "--early", "--partial", "--near", "--solved"];
  const mono = 'font-family="IBM Plex Mono, monospace" font-size="11" fill="var(--muted)"';
  let s = `<rect x="${L}" y="${T}" width="${X(2) - L}" height="${Y(2) - T}" fill="var(--focus-zone)"/>`;
  s += `<text x="${L + 8}" y="${T + 16}" ${mono}>FOCUS HERE</text>`;
  MAT.forEach((t, i) => {
    const x = X(i);
    s += `<line x1="${x}" y1="${T}" x2="${x}" y2="${B}" stroke="var(--line)" stroke-width="1"/>`;
    s += `<text x="${x}" y="${B + 20}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}" ${mono}>${t}</text>`;
  });
  [3, 2, 1].forEach((n) => {
    const y = Y(n);
    s += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="var(--line)" stroke-dasharray="3 4" stroke-width="1"/>`;
    s += `<text x="${L - 10}" y="${y + 4}" text-anchor="end" ${mono}>${NEC[n]}</text>`;
  });
  s += `<text x="${(L + R) / 2}" y="${B + 40}" text-anchor="middle" ${mono}>RESEARCH MATURITY →</text>`;
  for (const a of data.areas) {
    const x = X(a.map.x), y = Y(a.map.y), left = a.map.labelLeft;
    s += `<a href="#${a.id}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="var(${colors[a.maturity]})" stroke="var(--surface)" stroke-width="2"/>`;
    s += `<text x="${(left ? x - 12 : x + 12).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${left ? "end" : "start"}" font-family="Source Sans 3, sans-serif" font-size="13" font-weight="600" fill="var(--ink)">${esc(a.name)}</text></a>`;
  }
  return `<svg viewBox="0 0 660 340" role="img" aria-label="Priority map of research areas by necessity and maturity">${s}</svg>`;
}

// ---------- HTML ----------
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(data.title)}</title>
<meta name="description" content="${esc(data.intro)}">
<link rel="alternate" type="text/markdown" href="/scorecard.md" title="Scorecard as Markdown">
<link rel="alternate" type="application/json" href="/scorecard.json" title="Scorecard data">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..800&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
${css}</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="eyebrow">Research status · reviewed ${fmtDate(data.asOf)}</div>
    <h1>${esc(data.title)}</h1>
    <p class="lead">${esc(data.intro)}</p>
    <p class="note">Machine-readable copies: <a href="/scorecard.md">scorecard.md</a> · <a href="/scorecard.json">scorecard.json</a></p>
  </header>

  <section>
    <h2>At a glance</h2>
    <div class="scroll"><table><thead><tr><th>Area</th><th>Necessity</th><th>Research maturity</th><th>Biggest gap</th></tr></thead><tbody>
${areas.map((a) => `<tr><td><a href="#${a.id}">${esc(a.name)}</a></td><td>${chip(a.necessity)}</td><td>${meter(a.maturity)}</td><td>${esc(a.biggestGap)}</td></tr>`).join("\n")}
    </tbody></table></div>
  </section>

  <section>
    <h2>Where research effort pays off</h2>
    <p class="note">Higher means more necessary for deployment; further right means more mature in published work. The shaded corner holds what is needed and still unsolved.</p>
    <div class="map scroll">${mapSvg()}</div>
  </section>

  <section>
    <h2>Research areas</h2>
    <div class="areas">
${areas.map((a) => `    <article class="area m${a.maturity}" id="${a.id}">
      <div class="area-head"><h3>${esc(a.name)}</h3><div class="tags">${chip(a.necessity)}${meter(a.maturity)}</div></div>
      <p>${esc(a.goal)}</p>
      <div class="cols">
        <div><h4>Shown so far</h4><ul>${a.evidence.map((e) => `<li>${esc(e.text)}${e.source ? ` <a href="${esc(e.source)}" target="_blank" rel="noopener">Source</a>` : ""}</li>`).join("")}</ul></div>
        <div><h4>Still missing</h4><ul>${a.gaps.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>
      </div>
      <details><summary>Scorecard metrics (${a.metrics.length})</summary>${metricTable(a.metrics)}</details>
    </article>`).join("\n")}
    </div>
  </section>

  <section>
    <h2>Applies to every area</h2>
    ${metricTable(data.systemMetrics)}
    <p class="note">${esc(data.testProtocol)}</p>
  </section>

  <section class="two">
    <div><h2>Handled by engineering</h2><p class="note">Needed for deployment, but no research paper is required.</p><ul>${data.engineering.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    <div><h2>Not a priority yet</h2><p class="note">Useful later, once subtasks complete reliably.</p><ul>${data.notYet.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
  </section>

  <section>
    <h2>Change log</h2>
    <div class="scroll"><table><thead><tr><th>Date</th><th>Change</th></tr></thead><tbody>
${[...data.changelog].sort((a, b) => b.date.localeCompare(a.date)).map((r) => `<tr><td class="num">${fmtDate(r.date)}</td><td>${esc(r.change)}</td></tr>`).join("\n")}
    </tbody></table></div>
  </section>
</div>
</body>
</html>
`;

// ---------- Markdown ----------
const mdTable = (list) => ["| Metric | How to measure | Target |", "| --- | --- | --- |", ...list.map((r) => `| ${r.metric} | ${r.measure} | ${r.target} |`)].join("\n");
const md = `# ${data.title}

Reviewed ${data.asOf}. ${data.intro}

Maturity scale: ${MAT.map((m, i) => `${i} ${m}`).join(", ")}. Necessity: 3 Core, 2 Needed, 1 Later.
Source of truth: data/scorecard.json in the repository. This file is generated.

## At a glance

| Area | Necessity | Maturity | Biggest gap |
| --- | --- | --- | --- |
${areas.map((a) => `| ${a.name} | ${NEC[a.necessity]} | ${MAT[a.maturity]} | ${a.biggestGap} |`).join("\n")}

${areas.map((a) => `## ${a.name}

Necessity: ${NEC[a.necessity]}. Maturity: ${MAT[a.maturity]}.

${a.goal}

### Shown so far

${a.evidence.map((e) => `- ${e.text}${e.source ? ` ([source](${e.source}))` : ""}`).join("\n")}

### Still missing

${a.gaps.map((g) => `- ${g}`).join("\n")}

### Metrics

${mdTable(a.metrics)}
`).join("\n")}
## Applies to every area

${mdTable(data.systemMetrics)}

${data.testProtocol}

## Handled by engineering

${data.engineering.map((t) => `- ${t}`).join("\n")}

## Not a priority yet

${data.notYet.map((t) => `- ${t}`).join("\n")}

## Change log

${[...data.changelog].sort((a, b) => b.date.localeCompare(a.date)).map((r) => `- ${r.date}: ${r.change}`).join("\n")}
`;

const llms = `# ${data.title}

> ${data.intro}

- [Full scorecard as Markdown](/scorecard.md): every research area with evidence, gaps and metrics.
- [Scorecard data as JSON](/scorecard.json): the same content, structured.
`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
writeFileSync("dist/scorecard.md", md);
writeFileSync("dist/scorecard.json", JSON.stringify(data, null, 2) + "\n");
writeFileSync("dist/llms.txt", llms);
console.log(`Built dist/ with ${data.areas.length} areas (as of ${data.asOf}).`);
