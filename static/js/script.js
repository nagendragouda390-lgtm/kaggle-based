const TEAM_VAR = {
  RR: "--team-RR", RCB: "--team-RCB", GT: "--team-GT", PBKS: "--team-PBKS",
  SRH: "--team-SRH", DC: "--team-DC", KKR: "--team-KKR", CSK: "--team-CSK",
  LSG: "--team-LSG", MI: "--team-MI",
};

function teamColor(code) {
  const v = TEAM_VAR[code];
  return v ? getComputedStyle(document.documentElement).getPropertyValue(v).trim() : null;
}

function paintPanel(panelEl, codeEl, code) {
  const color = teamColor(code);
  codeEl.textContent = code || "—";
  panelEl.style.setProperty("--panel-accent", color || "#6b7a90");
}

function animateCount(el, from, to, duration = 900) {
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const val = (from + (to - from) * eased).toFixed(1);
    el.textContent = val;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = to.toFixed(1);
  };
  requestAnimationFrame(step);
}

class TrendChart {
  constructor(canvas, emptyStateEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.emptyStateEl = emptyStateEl;
    this.points = []; // { ball, prob }
    this.dpr = window.devicePixelRatio || 1;
    this._resize();
    window.addEventListener("resize", () => { this._resize(); this.draw(); });
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssHeight = 160;
    this.canvas.style.height = cssHeight + "px";
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = cssHeight * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = rect.width;
    this.height = cssHeight;
  }

  addPoint(ball, prob) {
    this.points.push({ ball, prob });
    if (this.points.length > 40) this.points.shift();
    this.emptyStateEl.classList.add("hidden");
    this._animateDraw();
  }

  _animateDraw() {
    const start = performance.now();
    const duration = 500;
    const prevLen = this._drawnCount || 0;
    const targetLen = this.points.length;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      this.draw(prevLen + (targetLen - prevLen) * t);
      if (t < 1) requestAnimationFrame(step);
      else this._drawnCount = targetLen;
    };
    requestAnimationFrame(step);
  }

  draw(revealCount = this.points.length) {
    const ctx = this.ctx;
    const { width: w, height: h } = this;
    ctx.clearRect(0, 0, w, h);
    if (this.points.length === 0) return;

    const padL = 34, padR = 8, padT = 10, padB = 20;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // grid lines at 0/25/50/75/100
    ctx.strokeStyle = "rgba(107,122,144,0.18)";
    ctx.lineWidth = 1;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#6b7a90";
    [0, 25, 50, 75, 100].forEach((v) => {
      const y = padT + plotH * (1 - v / 100);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(v + "%", 2, y + 3);
    });

    const n = this.points.length;
    const xFor = (i) => padL + (n === 1 ? plotW : (plotW * i) / (n - 1));
    const yFor = (p) => padT + plotH * (1 - p / 100);

    const visible = Math.max(1, Math.round(revealCount));
    const pts = this.points.slice(0, visible);

    // glow fill under line
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.prob);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(xFor(pts.length - 1), padT + plotH);
    ctx.lineTo(xFor(0), padT + plotH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, "rgba(255,176,32,0.28)");
    grad.addColorStop(1, "rgba(255,176,32,0.0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.prob);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#ffb020";
    ctx.lineWidth = 2.25;
    ctx.shadowColor = "rgba(255,176,32,0.6)";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // last point marker
    if (pts.length) {
      const last = pts[pts.length - 1];
      const x = xFor(pts.length - 1), y = yFor(last.prob);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffb020";
      ctx.fill();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const battingSelect = form.querySelector('[name="team_batting"]');
  const bowlingSelect = form.querySelector('[name="team_bowling"]');
  const battingPanel = document.getElementById("battingPanel");
  const bowlingPanel = document.getElementById("bowlingPanel");
  const battingCode = document.getElementById("battingCode");
  const bowlingCode = document.getElementById("bowlingCode");
  const battingProb = document.getElementById("battingProb");
  const bowlingProb = document.getElementById("bowlingProb");
  const meterFill = document.getElementById("meterFill");
  const errorBanner = document.getElementById("errorBanner");
  const submitBtn = document.getElementById("submitBtn");
  const trendChart = new TrendChart(
    document.getElementById("trendChart"),
    document.getElementById("chartEmpty")
  );

  let currentBattingProb = 50;

  const syncTeamPanels = () => {
    paintPanel(battingPanel, battingCode, battingSelect.value);
    paintPanel(bowlingPanel, bowlingCode, bowlingSelect.value);
  };
  battingSelect.addEventListener("change", syncTeamPanels);
  bowlingSelect.addEventListener("change", syncTeamPanels);
  syncTeamPanels();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBanner.classList.remove("show");
    submitBtn.disabled = true;
    submitBtn.textContent = "Reading the game…";

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) {
        errorBanner.textContent = data.error;
        errorBanner.classList.add("show");
        return;
      }

      const newBatting = data.batting_team_win_probability;
      const newBowling = data.bowling_team_win_probability;

      animateCount(battingProb, currentBattingProb, newBatting);
      animateCount(bowlingProb, 100 - currentBattingProb, newBowling);
      meterFill.style.height = `${newBatting}%`;

      currentBattingProb = newBatting;
      trendChart.addPoint(Number(payload.curr_ball), newBatting);
    } catch (err) {
      errorBanner.textContent = "Connection dropped. Try again.";
      errorBanner.classList.add("show");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Predict Win %";
    }
  });
});
