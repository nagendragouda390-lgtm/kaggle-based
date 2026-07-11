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
    } catch (err) {
      errorBanner.textContent = "Connection dropped. Try again.";
      errorBanner.classList.add("show");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Predict Win %";
    }
  });
});
