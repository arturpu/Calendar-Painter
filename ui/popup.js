function t(key, substitutions) {
  return browser.i18n.getMessage(key, substitutions) || key;
}

document.documentElement.lang = (browser.i18n.getUILanguage() || "en").split("-")[0];
for (const node of document.querySelectorAll("[data-i18n]")) {
  node.textContent = t(node.dataset.i18n);
}

const colors = [
  ["colorYellow", "#ffd54f"], ["colorOrange", "#ffb74d"],
  ["colorRed", "#ef9a9a"], ["colorPink", "#f48fb1"],
  ["colorPurple", "#ce93d8"], ["colorBlue", "#90caf9"],
  ["colorTurquoise", "#80deea"], ["colorGreen", "#a5d6a7"]
];

let selectedColor = "#ffd54f";

function selectColor(color) {
  selectedColor = color;
  for (const button of document.querySelectorAll(".swatch")) {
    button.classList.toggle("selected", button.dataset.color === color);
  }
}

function describe(state) {
  if (state.mode === "paint") return t("statusPaint");
  if (state.mode === "erase") return t("statusErase");
  if (state.mode === "range") {
    return state.rangeStart ? t("statusRangeFrom", state.rangeStart) : t("statusRange");
  }
  return t("statusIdle");
}

const palette = document.getElementById("palette");
for (const [nameKey, color] of colors) {
  const button = document.createElement("button");
  button.className = "swatch";
  button.dataset.color = color;
  button.title = t(nameKey);
  button.setAttribute("aria-label", t(nameKey));
  button.style.backgroundColor = color;
  button.addEventListener("click", () => selectColor(color));
  palette.appendChild(button);
}

document.getElementById("paint").addEventListener("click", async () => {
  await browser.calendarPainter.setMode("paint", selectedColor);
  window.close();
});
document.getElementById("range").addEventListener("click", async () => {
  await browser.calendarPainter.setMode("range", selectedColor);
  window.close();
});
document.getElementById("erase").addEventListener("click", async () => {
  await browser.calendarPainter.setMode("erase");
  window.close();
});
document.getElementById("stop").addEventListener("click", async () => {
  await browser.calendarPainter.stopMode();
  window.close();
});

document.getElementById("today-ring").addEventListener("change", async event => {
  await browser.calendarPainter.setTodayRing(event.target.checked);
});

(async () => {
  const state = await browser.calendarPainter.getState();
  if (state.color) selectColor(state.color);
  document.getElementById("today-ring").checked = state.todayRing !== false;
  document.getElementById("status").textContent = describe(state);
})();
