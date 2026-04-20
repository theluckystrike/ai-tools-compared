/**
 * bestremotetools.com — Homepage interactivity
 * Leaderboard, verdict cards, task spotlight, theme tweaks
 */
(function homeInit() {
  "use strict";

  /* ——— Tool data ——— */
  var TOOLS = [
    {rank:1,  name:"Claude Code",          sub:"Anthropic · CLI / agentic",  score:92, pass:40, time:"12m 44s", cost:0.41, ctx:"200K", note:"Best overall",       last:"Apr 20", ico:"\u25CE", c:"oklch(0.58 0.18 28)"},
    {rank:2,  name:"Cursor Composer",      sub:"Anysphere · IDE",            score:88, pass:39, time:"14m 21s", cost:0.52, ctx:"128K", note:"Best IDE UX",        last:"Apr 18", ico:"\u2318", c:"oklch(0.25 0.015 255)"},
    {rank:3,  name:"Aider",                sub:"OSS · CLI",                  score:86, pass:38, time:"11m 02s", cost:0.28, ctx:"varies",note:"Best $/task",       last:"Apr 17", ico:"ai",     c:"oklch(0.5 0.18 145)"},
    {rank:4,  name:"Windsurf Cascade",     sub:"Codeium · IDE",              score:83, pass:37, time:"15m 18s", cost:0.48, ctx:"100K", note:"Solid alternative", last:"Apr 18", ico:"ws",     c:"oklch(0.55 0.18 200)"},
    {rank:5,  name:"GitHub Copilot Agent", sub:"Microsoft · IDE + PR",       score:78, pass:35, time:"18m 04s", cost:0.39, ctx:"64K",  note:"Great for PRs",     last:"Apr 19", ico:"GH",     c:"oklch(0.22 0.015 255)"},
    {rank:6,  name:"Zed Agent",            sub:"Zed · IDE",                  score:74, pass:33, time:"13m 49s", cost:0.44, ctx:"128K", note:"Promising, rough",  last:"Apr 16", ico:"Z",      c:"oklch(0.55 0.18 260)"},
    {rank:7,  name:"Cline",                sub:"OSS · VS Code",              score:70, pass:31, time:"22m 13s", cost:0.56, ctx:"varies",note:"Setup-heavy",       last:"Apr 16", ico:"cl",     c:"oklch(0.55 0.12 180)"},
    {rank:8,  name:"Continue",             sub:"OSS · IDE plugin",           score:65, pass:28, time:"19m 47s", cost:0.35, ctx:"varies",note:"Config-heavy",      last:"Apr 14", ico:"co",     c:"oklch(0.58 0.12 80)"},
    {rank:9,  name:"Tabnine Agent",        sub:"Tabnine · IDE",              score:58, pass:24, time:"21m 18s", cost:0.62, ctx:"32K",  note:"Context-limited",   last:"Apr 12", ico:"tn",     c:"oklch(0.55 0.14 310)"},
    {rank:10, name:"Amazon Q Developer",   sub:"AWS · IDE",                  score:54, pass:22, time:"24m 02s", cost:0.71, ctx:"48K",  note:"AWS-centric",       last:"Apr 11", ico:"Q",      c:"oklch(0.55 0.16 60)"}
  ];

  var VERDICTS = [
    {name:"Claude Code", sub:"Anthropic \u00b7 terminal-first agent", ico:"\u25CE", c:"oklch(0.58 0.18 28)", score:92,
      pros:["Long-horizon tasks just work \u2014 sets up, runs tests, iterates.","Lowest failure rate across 42-task suite.","Excellent at reading existing code before writing."],
      cons:["Terminal-only \u2014 no IDE integration yet.","Cost adds up on exploratory tasks."],
      badge:"Best overall", price:"$20/mo + usage"},
    {name:"Cursor Composer", sub:"Anysphere \u00b7 IDE-native", ico:"\u2318", c:"oklch(0.25 0.015 255)", score:88,
      pros:["Tab completion is still the category standard.","Composer\u2019s inline diff-review flow is best-in-class.","Model picker that remembers your per-repo preference."],
      cons:["Slightly worse at multi-file changes without hand-holding.","Agent mode is newer \u2014 occasional loops."],
      badge:"Best IDE UX", price:"$20/mo"},
    {name:"Aider", sub:"OSS \u00b7 CLI, BYO-key", ico:"ai", c:"oklch(0.5 0.18 145)", score:86,
      pros:["Cheapest per task by a wide margin.","Git-native \u2014 every change is a commit.","Works with every frontier model."],
      cons:["Terminal UI has a learning curve.","No agent/tool-use \u2014 you drive."],
      badge:"Best $/task", price:"OSS \u00b7 pay per API"},
    {name:"Windsurf Cascade", sub:"Codeium \u00b7 IDE", ico:"ws", c:"oklch(0.55 0.18 200)", score:83,
      pros:["Cascade\u2019s awareness of past edits is uncannily good.","Free tier is actually usable.","Strong on mid-size refactors."],
      cons:["Falls behind on genuinely agentic tasks.","Fewer model options than Cursor."],
      badge:"Solid alternative", price:"Free \u00b7 $15/mo pro"},
    {name:"Copilot Agent", sub:"Microsoft \u00b7 IDE + PR reviews", ico:"GH", c:"oklch(0.22 0.015 255)", score:78,
      pros:["PR-review automation is the best of the bunch.","Org/enterprise story is unmatched.","Deep Azure / GH Actions integration."],
      cons:["Agent mode lags Cursor & Claude on hard tasks.","Context window smaller than advertised in practice."],
      badge:"Best for teams", price:"$10\u201339/mo"},
    {name:"Aider / Cline / Continue", sub:"The open-source tier", ico:"OS", c:"oklch(0.5 0.18 145)", score:72,
      pros:["No vendor lock-in. Bring your own key.","Community patches land fast \u2014 you can submit one yourself.","Cheapest path overall if you\u2019re already paying for API credit."],
      cons:["Setup varies from trivial (Aider) to fiddly (Cline).","Docs are uneven \u2014 expect to read source code."],
      badge:"Best for hackers", price:"Free \u00b7 BYO API"}
  ];

  var TASKS = [
    {num:17, kind:"Refactor", diff:4,
      title:"Extract auth logic from a 2,341-line monolithic module",
      code:'<span class="c">// prompt given to every tool:</span>\nExtract authentication middleware from <span class="g">server.ts</span>\ninto <span class="g">auth/</span> module. Preserve all existing\nbehavior. Tests must pass. No new deps.',
      desc:"The hardest task in the suite. Requires long-context reasoning, careful dependency tracing, and the discipline to not rewrite working code.",
      best:"Claude Code", median:"16m 52s", failed:"1 of 6"},
    {num:3, kind:"Bug fix", diff:2,
      title:"Fix a flaky test caused by timezone drift",
      code:'<span class="c">// given: failing test + CI log</span>\nDiagnose and fix. Must not change the semantics\nof the assertion \u2014 only the flakiness.',
      desc:"Looks easy, bites hard. Tools that reach for the test file alone fail. Tools that read the CI log first win in under two minutes.",
      best:"Aider", median:"4m 12s", failed:"0 of 6"},
    {num:28, kind:"Greenfield", diff:3,
      title:"Build a rate limiter from scratch with tests",
      code:'<span class="c">// spec sheet: token-bucket</span>\nImplement <span class="g">RateLimiter</span> with 4 methods.\nTable-driven tests. <span class="y">100%</span> branch coverage.',
      desc:"Well-specified greenfield is what every demo shows. Every tool looks great here. The tiebreaker is code quality \u2014 naming, abstractions, test design.",
      best:"Cursor", median:"8m 41s", failed:"0 of 6"},
    {num:34, kind:"Migration", diff:5,
      title:"Port 41 React class components to hooks",
      code:'<span class="c">// bulk migration, tests must still pass</span>\nConvert class components to functional.\nPreserve lifecycle semantics. No visual diff.',
      desc:"The repetition task. Where agentic tools shine and single-shot tools run out of context. Aider and Claude Code finished; three others got stuck mid-run.",
      best:"Claude Code", median:"41m 20s", failed:"3 of 6"}
  ];

  /* ——— Leaderboard rendering ——— */
  var sortKey = "score";
  var sortDir = -1;

  function escapeHtml(str) {
    if (str == null) { return ""; }
    if (typeof str !== "string") { return String(str); }
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderLeaderboard() {
    var body = document.getElementById("lbBody");
    if (!body) { return; }

    var rows = TOOLS.slice().sort(function(a, b) {
      var ka = a[sortKey];
      var kb = b[sortKey];
      if (typeof ka === "number" && typeof kb === "number") {
        return (ka - kb) * sortDir;
      }
      return String(ka).localeCompare(String(kb)) * sortDir;
    });

    var html = [];
    var maxRows = Math.min(rows.length, 20);
    for (var i = 0; i < maxRows; i++) {
      var t = rows[i];
      html.push(buildLeaderboardRow(t));
    }
    body.innerHTML = html.join("");
    updateSortIndicators();
  }

  function buildLeaderboardRow(t) {
    if (!t || typeof t.rank !== "number") { return ""; }
    var rankClass = t.rank === 1 ? "rank rank-1" : "rank";
    var badgeClass = t.rank <= 5 ? "badge best" : "badge";
    return '<tr>'
      + '<td class="' + rankClass + '">' + String(t.rank).padStart(2, "0") + '</td>'
      + '<td><div class="tool">'
      + '<span class="tool-ico" style="background:' + t.c + '">' + escapeHtml(t.ico) + '</span>'
      + '<div><div class="tool-name">' + escapeHtml(t.name) + '</div>'
      + '<div class="tool-sub">' + escapeHtml(t.sub) + '</div></div>'
      + '</div></td>'
      + '<td class="score-cell"><div class="score-bar">'
      + '<div class="bar"><div style="width:' + t.score + '%"></div></div>'
      + '<b>' + t.score + '</b></div></td>'
      + '<td class="pass-cell hide-sm"><div class="pc"><span>' + t.pass + '/42</span></div></td>'
      + '<td class="num hide-sm">' + escapeHtml(t.time) + '</td>'
      + '<td class="num hide-sm">$' + t.cost.toFixed(2) + '</td>'
      + '<td class="num hide-sm">' + escapeHtml(t.ctx) + '</td>'
      + '<td class="hide-sm"><span class="' + badgeClass + '">' + escapeHtml(t.note) + '</span></td>'
      + '<td class="hide-sm" style="font-family:var(--mono);font-size:11.5px;color:var(--ink-3);">' + escapeHtml(t.last) + '</td>'
      + '</tr>';
  }

  function updateSortIndicators() {
    var headers = document.querySelectorAll("#lbTable th");
    var maxH = Math.min(headers.length, 20);
    for (var i = 0; i < maxH; i++) {
      var th = headers[i];
      th.classList.remove("active");
      var existing = th.querySelector(".sort");
      if (existing) { existing.remove(); }
      if (th.dataset.k === sortKey) {
        th.classList.add("active");
        var s = document.createElement("span");
        s.className = "sort";
        s.textContent = sortDir === -1 ? "\u25BC" : "\u25B2";
        th.appendChild(s);
      }
    }
  }

  function initLeaderboardSort() {
    var headers = document.querySelectorAll("#lbTable thead th");
    var maxH = Math.min(headers.length, 20);
    for (var i = 0; i < maxH; i++) {
      var th = headers[i];
      if (!th.dataset.k) { continue; }
      th.addEventListener("click", handleSortClick);
    }
  }

  function handleSortClick(e) {
    var th = e.currentTarget;
    if (!th || !th.dataset.k) { return; }
    if (sortKey === th.dataset.k) {
      sortDir = -sortDir;
    } else {
      sortKey = th.dataset.k;
      sortDir = (sortKey === "name") ? 1 : -1;
    }
    renderLeaderboard();
  }

  /* ——— Verdict cards ——— */
  function renderVerdicts() {
    var container = document.getElementById("verdicts");
    if (!container) { return; }

    var html = [];
    var max = Math.min(VERDICTS.length, 10);
    for (var i = 0; i < max; i++) {
      html.push(buildVerdictCard(VERDICTS[i]));
    }
    container.innerHTML = html.join("");
  }

  function buildVerdictCard(v) {
    if (!v || !v.name) { return ""; }
    var prosHtml = buildListItems(v.pros, "");
    var consHtml = buildListItems(v.cons, "c");
    return '<article class="vc">'
      + '<div class="vc-head">'
      + '<span class="vc-ico" style="background:' + v.c + '">' + escapeHtml(v.ico) + '</span>'
      + '<div><h3>' + escapeHtml(v.name) + '</h3>'
      + '<div class="vc-meta">' + escapeHtml(v.sub) + '</div></div>'
      + '<div class="vc-score">' + v.score + '<small>/ 100</small></div></div>'
      + '<ul>' + prosHtml + consHtml + '</ul>'
      + '<div class="vc-foot">'
      + '<span class="vc-badge">' + escapeHtml(v.badge) + '</span>'
      + '<b>' + escapeHtml(v.price) + '</b></div>'
      + '</article>';
  }

  function buildListItems(items, className) {
    if (!items || !items.length) { return ""; }
    var html = "";
    var max = Math.min(items.length, 10);
    for (var i = 0; i < max; i++) {
      var cls = className ? ' class="' + className + '"' : "";
      html += "<li" + cls + ">" + escapeHtml(items[i]) + "</li>";
    }
    return html;
  }

  /* ——— Task spotlight ——— */
  function renderTasks() {
    var container = document.getElementById("taskGrid");
    if (!container) { return; }

    var html = [];
    var max = Math.min(TASKS.length, 8);
    for (var i = 0; i < max; i++) {
      html.push(buildTaskCard(TASKS[i]));
    }
    container.innerHTML = html.join("");
  }

  function buildTaskCard(t) {
    if (!t || typeof t.num !== "number") { return ""; }
    var diffDots = buildDifficultyDots(t.diff);
    var failClass = t.failed.charAt(0) === "0" ? "v" : "v red";
    return '<article class="task">'
      + '<div class="task-meta">'
      + '<span class="chip">Task ' + String(t.num).padStart(2, "0") + '</span>'
      + '<span class="chip">' + escapeHtml(t.kind) + '</span>'
      + '<span>Difficulty</span>'
      + '<span class="diff">' + diffDots + '</span>'
      + '<span>' + t.diff + '/5</span></div>'
      + '<h4>' + escapeHtml(t.title) + '</h4>'
      + '<pre class="task-code">' + t.code + '</pre>'
      + '<p class="task-desc">' + escapeHtml(t.desc) + '</p>'
      + '<div class="task-stats">'
      + '<div><div class="k">Best</div><div class="v green">' + escapeHtml(t.best) + '</div></div>'
      + '<div><div class="k">Median</div><div class="v">' + escapeHtml(t.median) + '</div></div>'
      + '<div><div class="k">Failed</div><div class="' + failClass + '">' + escapeHtml(t.failed) + '</div></div>'
      + '</div></article>';
  }

  function buildDifficultyDots(level) {
    var dots = "";
    for (var i = 0; i < 5; i++) {
      dots += '<span class="' + (i < level ? "on" : "") + '"></span>';
    }
    return dots;
  }

  /* ——— Theme tweaks ——— */
  var tweaks = {
    theme: "light",
    accentHue: 145,
    density: "comfy",
    logos: "on"
  };

  function applyTweaks() {
    document.body.classList.toggle("dark", tweaks.theme === "dark");
    document.body.classList.toggle("compact", tweaks.density === "compact");
    document.body.classList.toggle("no-logos", tweaks.logos === "off");

    var root = document.documentElement;
    root.style.setProperty("--accent",
      "oklch(0.58 0.18 " + tweaks.accentHue + ")");
    root.style.setProperty("--accent-ink",
      (tweaks.accentHue > 100 && tweaks.accentHue < 200)
        ? "oklch(0.15 0.04 150)"
        : "oklch(0.98 0.01 90)");

    syncTweakUI();
  }

  function syncTweakUI() {
    syncActiveClass("#swatches .sw", "hue", tweaks.accentHue);
    syncActiveClass("#themeSeg button", "t", tweaks.theme);
    syncActiveClass("#densSeg button", "d", tweaks.density);
    syncActiveClass("#logoSeg button", "l", tweaks.logos);
  }

  function syncActiveClass(selector, dataAttr, value) {
    var els = document.querySelectorAll(selector);
    var maxE = Math.min(els.length, 50);
    for (var i = 0; i < maxE; i++) {
      var match = String(els[i].dataset[dataAttr]) === String(value);
      els[i].classList.toggle("active", match);
    }
  }

  function setTweak(key, val) {
    if (!(key in tweaks)) { return; }
    tweaks[key] = val;
    applyTweaks();
  }

  function initTweaks() {
    addTweakListener("themeSeg", "t", "theme");
    addTweakListener("densSeg", "d", "density");
    addTweakListener("logoSeg", "l", "logos");

    var swatches = document.getElementById("swatches");
    if (swatches) {
      swatches.addEventListener("click", function(e) {
        var sw = e.target.closest(".sw");
        if (sw && sw.dataset.hue) {
          setTweak("accentHue", Number(sw.dataset.hue));
        }
      });
    }
  }

  function addTweakListener(segId, dataKey, tweakKey) {
    var el = document.getElementById(segId);
    if (!el) { return; }
    el.addEventListener("click", function(e) {
      var btn = e.target.closest("button");
      if (btn && btn.dataset[dataKey]) {
        setTweak(tweakKey, btn.dataset[dataKey]);
      }
    });
  }

  /* ——— Boot ——— */
  function boot() {
    renderLeaderboard();
    initLeaderboardSort();
    renderVerdicts();
    renderTasks();
    initTweaks();
    applyTweaks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
