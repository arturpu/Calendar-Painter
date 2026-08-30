const PREF_NAME = "extensions.calendar-painter.markers";
const PREF_TODAY_RING = "extensions.calendar-painter.todayRing";

let UI_LANG = "en";
const STRINGS = {
  pl: {yellow:"Żółty",orange:"Pomarańczowy",red:"Czerwony",pink:"Różowy",purple:"Fioletowy",blue:"Niebieski",turquoise:"Turkusowy",green:"Zielony",paintDay:"🎨  Pokoloruj ten dzień",setRangeStart:"📅  Ustaw jako początek zakresu",paintRange:"📆  Pokoloruj zakres",cancelRange:"✖  Anuluj wybór zakresu",enableEraser:"🧽  Włącz tryb gumki",eraserActive:"🧽  Tryb gumki jest aktywny",removeColor:"🗑  Usuń kolor z tego dnia",noWindow:"Nie znaleziono głównego okna Thunderbirda.",noDate:"Calendar Painter: znaleziono pole dnia, ale nie odczytano daty.",rangePainted:"✅ Zakres został pokolorowany.",modeStopped:"Calendar Painter: tryb został zakończony.",notStarted:"Calendar Painter nie został uruchomiony.",unknownMode:"Nieznany tryb", rangeStartLabel:"początek", rangeStartToast:"Początek zakresu", clickEnd:"Kliknij dzień końcowy.", rangeStartAlert1:"Początek zakresu", rangeStartAlert2:"Przejdź do dnia końcowego, użyj Ctrl + Shift + PPM i wybierz „Pokoloruj zakres”.", eraserAlert:"Tryb gumki został włączony.\n\nKlikaj lewym przyciskiem myszy na dniach, z których chcesz usunąć kolor.\n\nNaciśnij ESC, aby zakończyć."},
  en: {yellow:"Yellow",orange:"Orange",red:"Red",pink:"Pink",purple:"Purple",blue:"Blue",turquoise:"Turquoise",green:"Green",paintDay:"🎨  Paint this day",setRangeStart:"📅  Set as range start",paintRange:"📆  Paint range",cancelRange:"✖  Cancel range selection",enableEraser:"🧽  Enable eraser mode",eraserActive:"🧽  Eraser mode is active",removeColor:"🗑  Remove color from this day",noWindow:"Thunderbird's main window was not found.",noDate:"Calendar Painter: a day cell was found, but its date could not be read.",rangePainted:"✅ Range painted.",modeStopped:"Calendar Painter: mode stopped.",notStarted:"Calendar Painter has not been started.",unknownMode:"Unknown mode", rangeStartLabel:"start", rangeStartToast:"Range start", clickEnd:"Click the end date.", rangeStartAlert1:"Range start", rangeStartAlert2:"Go to the end date, use Ctrl + Shift + right-click and choose “Paint range”.", eraserAlert:"Eraser mode is enabled.\n\nLeft-click the days whose color you want to remove.\n\nPress ESC to finish."}
};
function T(key) { return (STRINGS[UI_LANG] || STRINGS.en)[key] || STRINGS.en[key] || key; }

const PALETTE = [
  { name: "yellow", symbol: "🟨", color: "#ffd54f" },
  { name: "orange", symbol: "🟧", color: "#ffb74d" },
  { name: "red", symbol: "🟥", color: "#ef9a9a" },
  { name: "pink", symbol: "🩷", color: "#f48fb1" },
  { name: "purple", symbol: "🟪", color: "#ce93d8" },
  { name: "blue", symbol: "🟦", color: "#90caf9" },
  { name: "turquoise", symbol: "🩵", color: "#80deea" },
  { name: "green", symbol: "🟩", color: "#a5d6a7" }
];

function readMarkers() {
  try {
    const parsed = JSON.parse(
      Services.prefs.getStringPref(PREF_NAME, "{}")
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function writeMarkers(markers) {
  Services.prefs.setStringPref(PREF_NAME, JSON.stringify(markers));
}

function parseDate(value) {
  if (value === undefined || value === null) return null;

  try {
    if (value.icalString) {
      const match = String(value.icalString).match(/^(\d{4})(\d{2})(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
  } catch (e) {}

  let text;
  try {
    text = String(value);
  } catch (e) {
    return null;
  }

  let match = text.match(/(?:^|\D)(\d{4})(\d{2})(\d{2})(?:T\d{6}Z?)?(?:\D|$)/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  match = text.match(/(?:^|\D)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\D|$)/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  return null;
}

function getDateFromBox(box) {
  const candidates = [];

  for (const property of ["mDate", "date", "calendarDate", "_date"]) {
    try { candidates.push(box[property]); } catch (e) {}
  }

  for (const attribute of ["data-date", "date", "datetime", "value", "aria-label", "title"]) {
    try { candidates.push(box.getAttribute(attribute)); } catch (e) {}
  }

  for (const candidate of candidates) {
    const result = parseDate(candidate);
    if (result) return result;
  }
  return null;
}

function findDayBox(event) {
  const path = typeof event.composedPath === "function"
    ? event.composedPath()
    : [event.target];

  for (const node of path) {
    if (
      node &&
      node.nodeType === 1 &&
      String(node.localName).toLowerCase() === "calendar-month-day-box"
    ) {
      return node;
    }
  }

  try {
    return event.target.closest("calendar-month-day-box");
  } catch (e) {
    return null;
  }
}

function toRgba(hex, opacity) {
  const clean = hex.replace("#", "");
  return `rgba(${parseInt(clean.slice(0,2),16)}, ${parseInt(clean.slice(2,4),16)}, ${parseInt(clean.slice(4,6),16)}, ${opacity})`;
}

function createMarker(color) {
  return {
    background: color,
    opacity: 0.35,
    icon: null,
    note: "",
    tags: []
  };
}

function applyMarker(box, marker) {
  const color = toRgba(marker.background, marker.opacity);
  box.style.setProperty("background-color", color, "important");
  box.setAttribute("data-calendar-painter", "true");

  const cell = box.closest("td");
  if (cell) {
    cell.style.setProperty("background-color", color, "important");
    cell.setAttribute("data-calendar-painter-cell", "true");
  }
}

function clearMarker(box) {
  box.style.removeProperty("background-color");
  box.removeAttribute("data-calendar-painter");

  const cell = box.closest("td");
  if (cell && cell.getAttribute("data-calendar-painter-cell") === "true") {
    cell.style.removeProperty("background-color");
    cell.removeAttribute("data-calendar-painter-cell");
  }
}


function readTodayRingEnabled() {
  try {
    return Services.prefs.getBoolPref(PREF_TODAY_RING, true);
  } catch (e) {
    return true;
  }
}

function writeTodayRingEnabled(enabled) {
  Services.prefs.setBoolPref(PREF_TODAY_RING, Boolean(enabled));
}

function todayKeyLocal() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function isThunderbirdTodayBox(box) {
  try {
    if (
      box.getAttribute("relation") === "today" ||
      box.getAttribute("data-relation") === "today" ||
      box.getAttribute("data-today") === "true" ||
      box.classList.contains("today") ||
      box.classList.contains("calendar-month-day-box-today")
    ) {
      return true;
    }

    if (
      box.querySelector(
        '[relation="today"], [data-relation="today"], [data-today="true"], .today'
      )
    ) {
      return true;
    }
  } catch (e) {}

  return getDateFromBox(box) === todayKeyLocal();
}

function getDayNumber(box) {
  const key = getDateFromBox(box);
  if (!key) return null;
  const match = key.match(/-(\d{2})$/);
  return match ? String(Number(match[1])) : null;
}

function findDayNumberElement(box) {
  const day = getDayNumber(box);
  if (!day) return null;

  const preferredSelectors = [
    ".calendar-month-day-box-date-label",
    ".calendar-month-day-box-day-label",
    ".calendar-month-day-box-date",
    '[class*="date-label"]',
    '[class*="day-label"]'
  ];

  for (const selector of preferredSelectors) {
    try {
      for (const node of box.querySelectorAll(selector)) {
        const text = (node.textContent || node.getAttribute("value") || "").trim();
        if (text === day) return node;
      }
    } catch (e) {}
  }

  // Thunderbird widgets sometimes expose the day number through XUL value
  // instead of textContent. Search visible descendants and pick the smallest
  // matching element near the top of the day box.
  const candidates = [];
  try {
    for (const node of box.querySelectorAll("*")) {
      let text = "";
      try {
        text = (node.textContent || node.getAttribute("value") || "").trim();
      } catch (e) {}

      if (text !== day) continue;

      try {
        const rect = node.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.width <= 80 &&
          rect.height <= 50
        ) {
          candidates.push({ node, rect });
        }
      } catch (e) {}
    }
  } catch (e) {}

  if (candidates.length) {
    candidates.sort((a, b) => {
      if (Math.abs(a.rect.top - b.rect.top) > 3) {
        return a.rect.top - b.rect.top;
      }
      return a.rect.width * a.rect.height - b.rect.width * b.rect.height;
    });
    return candidates[0].node;
  }

  return null;
}

function clearNativeTodayBadge(target) {
  if (!target) return;

  target.setAttribute("data-calendar-painter-today-target", "true");
  target.style.setProperty("background", "transparent", "important");
  target.style.setProperty("background-color", "transparent", "important");
  target.style.setProperty("border-color", "transparent", "important");
  target.style.setProperty("box-shadow", "none", "important");
  target.style.setProperty("color", "CanvasText", "important");
}

function restoreNativeTodayBadge(target) {
  if (!target || target.getAttribute("data-calendar-painter-today-target") !== "true") {
    return;
  }

  target.style.removeProperty("background");
  target.style.removeProperty("background-color");
  target.style.removeProperty("border-color");
  target.style.removeProperty("box-shadow");
  target.style.removeProperty("color");
  target.removeAttribute("data-calendar-painter-today-target");

  if (target.getAttribute("data-calendar-painter-ring-positioned") === "true") {
    target.style.removeProperty("position");
    target.removeAttribute("data-calendar-painter-ring-positioned");
  }
}

function removeTodayRing(box) {
  try {
    for (const ring of box.querySelectorAll(".calendar-painter-today-ring")) {
      ring.remove();
    }

    for (const target of box.querySelectorAll('[data-calendar-painter-today-target="true"]')) {
      restoreNativeTodayBadge(target);
    }
  } catch (e) {}

  if (box.getAttribute("data-calendar-painter-positioned") === "true") {
    box.style.removeProperty("position");
    box.removeAttribute("data-calendar-painter-positioned");
  }
}

function createRoughTodayRing(document) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.classList.add("calendar-painter-today-ring");
  svg.setAttribute("viewBox", "0 0 34 22");
  svg.setAttribute("aria-hidden", "true");

  Object.assign(svg.style, {
    position: "absolute",
    width: "34px",
    height: "22px",
    zIndex: "40",
    overflow: "visible",
    pointerEvents: "none"
  });

  const p1 = document.createElementNS(ns, "path");
  p1.setAttribute(
    "d",
    "M3 12 C4 5, 10 2, 17 2 C25 2, 31 6, 31 11 " +
    "C31 17, 25 20, 17 20 C9 20, 4 17, 3 12"
  );
  p1.setAttribute("fill", "none");
  p1.setAttribute("stroke", "#c91f24");
  p1.setAttribute("stroke-width", "2.1");
  p1.setAttribute("stroke-linecap", "round");
  p1.setAttribute("stroke-linejoin", "round");

  const p2 = document.createElementNS(ns, "path");
  p2.setAttribute(
    "d",
    "M4 13 C3 7, 9 3, 16 2 C24 1, 30 5, 32 10 " +
    "C33 16, 26 20, 18 21 C10 22, 5 18, 4 13"
  );
  p2.setAttribute("fill", "none");
  p2.setAttribute("stroke", "#ef4740");
  p2.setAttribute("stroke-width", "0.9");
  p2.setAttribute("stroke-linecap", "round");
  p2.setAttribute("stroke-linejoin", "round");
  p2.setAttribute("opacity", "0.72");

  svg.append(p1, p2);
  return svg;
}

function applyTodayRing(box) {
  removeTodayRing(box);

  const target = findDayNumberElement(box);
  const win = box.ownerDocument.defaultView;

  if (win.getComputedStyle(box).position === "static") {
    box.style.setProperty("position", "relative");
    box.setAttribute("data-calendar-painter-positioned", "true");
  }

  const ring = createRoughTodayRing(box.ownerDocument);

  if (target) {
    clearNativeTodayBadge(target);

    try {
      const boxRect = box.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const centerX = targetRect.left - boxRect.left + targetRect.width / 2;
      const centerY = targetRect.top - boxRect.top + targetRect.height / 2;

      ring.style.left = `${Math.round(centerX - 17)}px`;
      ring.style.top = `${Math.round(centerY - 11)}px`;
      ring.style.transform = "rotate(-5deg)";
    } catch (e) {
      ring.style.top = "0px";
      ring.style.right = "1px";
      ring.style.transform = "rotate(-5deg)";
    }
  } else {
    ring.style.top = "-1px";
    ring.style.right = "0px";
    ring.style.transform = "rotate(-5deg)";
  }

  box.appendChild(ring);
}

function removeMiniTodayRing(document) {
  try {
    for (const ring of document.querySelectorAll(".calendar-painter-mini-today-ring")) {
      ring.remove();
    }

    for (const cell of document.querySelectorAll('[data-calendar-painter-mini-positioned="true"]')) {
      cell.style.removeProperty("position");
      cell.removeAttribute("data-calendar-painter-mini-positioned");
    }
  } catch (e) {}
}

function createMiniRoughTodayRing(document) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.classList.add("calendar-painter-mini-today-ring");
  svg.setAttribute("viewBox", "0 0 30 23");
  svg.setAttribute("aria-hidden", "true");

  Object.assign(svg.style, {
    position: "absolute",
    width: "30px",
    height: "23px",
    left: "50%",
    top: "46%",
    transform: "translate(-50%, -50%) rotate(-6deg)",
    zIndex: "20",
    overflow: "visible",
    pointerEvents: "none"
  });

  const p1 = document.createElementNS(ns, "path");
  p1.setAttribute(
    "d",
    "M2 12 C3 4, 9 2, 15 2 C23 2, 28 5, 28 11 " +
    "C28 17, 23 21, 15 21 C8 21, 3 18, 2 12"
  );
  p1.setAttribute("fill", "none");
  p1.setAttribute("stroke", "#c91f24");
  p1.setAttribute("stroke-width", "1.7");
  p1.setAttribute("stroke-linecap", "round");
  p1.setAttribute("stroke-linejoin", "round");

  const p2 = document.createElementNS(ns, "path");
  p2.setAttribute(
    "d",
    "M3 13 C2 6, 8 3, 15 2 C22 1, 28 4, 29 10 " +
    "C30 16, 23 21, 16 22 C9 23, 4 19, 3 13"
  );
  p2.setAttribute("fill", "none");
  p2.setAttribute("stroke", "#ef4740");
  p2.setAttribute("stroke-width", "0.75");
  p2.setAttribute("stroke-linecap", "round");
  p2.setAttribute("stroke-linejoin", "round");
  p2.setAttribute("opacity", "0.72");

  svg.append(p1, p2);
  return svg;
}

function refreshMiniTodayRing(document) {
  removeMiniTodayRing(document);
  if (!readTodayRingEnabled()) return;

  // Thunderbird's mini-month marks today's TD with today="true".
  // Keep Thunderbird's own selected/today styling and draw our small
  // hand-drawn ring over the day number.
  let cells = [];
  try {
    cells = [...document.querySelectorAll(
      'calendar-minimonth .minimonth-day[today="true"], .minimonth-day[today="true"]'
    )];
  } catch (e) {}

  for (const cell of cells) {
    try {
      const win = cell.ownerDocument.defaultView;
      if (win.getComputedStyle(cell).position === "static") {
        cell.style.setProperty("position", "relative");
        cell.setAttribute("data-calendar-painter-mini-positioned", "true");
      }
      cell.appendChild(createMiniRoughTodayRing(cell.ownerDocument));
    } catch (e) {}
  }
}

function refreshTodayRing(document) {
  const enabled = readTodayRingEnabled();
  const boxes = document.querySelectorAll("calendar-month-day-box");

  for (const box of boxes) {
    removeTodayRing(box);
  }

  if (!enabled) return;

  // Prefer Thunderbird's own "today" relation/state. Only if the current
  // widget does not expose it do we fall back to its calendar date.
  const nativeTodayBoxes = [];
  const fallbackTodayBoxes = [];

  for (const box of boxes) {
    let nativeToday = false;

    try {
      nativeToday =
        box.getAttribute("relation") === "today" ||
        box.getAttribute("data-relation") === "today" ||
        box.getAttribute("data-today") === "true" ||
        box.classList.contains("today") ||
        box.classList.contains("calendar-month-day-box-today") ||
        Boolean(
          box.querySelector(
            '[relation="today"], [data-relation="today"], [data-today="true"], .today'
          )
        );
    } catch (e) {}

    if (nativeToday) {
      nativeTodayBoxes.push(box);
    } else if (getDateFromBox(box) === todayKeyLocal()) {
      fallbackTodayBoxes.push(box);
    }
  }

  const targets = nativeTodayBoxes.length ? nativeTodayBoxes : fallbackTodayBoxes;

  for (const box of targets) {
    applyTodayRing(box);
  }

  refreshMiniTodayRing(document);
}


function getDateFromWeekColumn(container) {
  if (!container) return null;

  // Thunderbird's Day/Week view stores the represented date directly on
  // calendar-event-column and calendar-header-container as a calIDateTime.
  // Prefer those stable widget properties over parsing the visible heading.
  for (const selector of ["calendar-event-column", "calendar-header-container"]) {
    try {
      const widget = container.querySelector(selector);
      if (widget) {
        const result = parseDate(widget.date);
        if (result) return result;
      }
    } catch (e) {}
  }

  return getDateFromBox(container);
}

function applyWeekMarker(container, marker) {
  // Do not paint every nested layer with the same semi-transparent colour.
  // In the week view those layers overlap and the alpha values accumulate,
  // making the result much darker than the month view.  Paint only the two
  // main, non-overlapping surfaces instead and use a slightly lighter alpha
  // so Thunderbird's day separators and hour grid remain clearly visible.
  const weekOpacity = Math.max(0.08, Math.min(0.22, marker.opacity * 0.50));
  const color = toRgba(marker.background, weekOpacity);
  container.setAttribute("data-calendar-painter-week", "true");

  const targets = [];
  try {
    const header = container.querySelector("calendar-header-container");
    const column = container.querySelector("calendar-event-column");
    if (header) targets.push(header);
    if (column) targets.push(column);

    // Fallback for a Thunderbird layout where one of the widgets is absent.
    if (!targets.length) targets.push(container);
  } catch (e) {
    targets.push(container);
  }

  for (const target of targets) {
    try {
      target.style.setProperty("background-color", color, "important");
      target.setAttribute("data-calendar-painter-week-part", "true");
    } catch (e) {}
  }
}

function clearWeekMarker(container) {
  if (!container) return;

  const targets = [container];
  try {
    targets.push(...container.querySelectorAll(
      '[data-calendar-painter-week-part="true"]'
    ));
  } catch (e) {}

  for (const target of targets) {
    try {
      if (target.getAttribute("data-calendar-painter-week-part") === "true") {
        target.style.removeProperty("background-color");
        target.removeAttribute("data-calendar-painter-week-part");
      }
    } catch (e) {}
  }

  container.removeAttribute("data-calendar-painter-week");
}

function repaintWeekView(document, markers) {
  const columns = document.querySelectorAll(".day-column-container");

  for (const container of columns) {
    clearWeekMarker(container);
  }

  for (const container of columns) {
    const date = getDateFromWeekColumn(container);
    if (date && markers[date]) {
      applyWeekMarker(container, markers[date]);
    }
  }
}

function repaint(document) {
  const markers = readMarkers();
  const boxes = document.querySelectorAll("calendar-month-day-box");

  for (const box of boxes) {
    clearMarker(box);
  }

  for (const box of boxes) {
    const date = getDateFromBox(box);
    if (date && markers[date]) {
      applyMarker(box, markers[date]);
    }
  }

  // Mirror the same saved day colours into Thunderbird's Day/Week view.
  // No duplicate data is stored: both views read the exact same marker map.
  repaintWeekView(document, markers);

  refreshTodayRing(document);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function keyFromDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function keysInRange(firstKey, secondKey) {
  let start = dateFromKey(firstKey);
  let end = dateFromKey(secondKey);

  if (start > end) {
    [start, end] = [end, start];
  }

  const keys = [];
  const cursor = new Date(start.getTime());

  while (cursor <= end) {
    keys.push(keyFromDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}


function showToast(document, message, duration = 2600) {
  const window = document.defaultView;
  const previous = document.getElementById("calendar-painter-toast");
  if (previous) {
    previous.remove();
  }

  const toast = document.createElement("div");
  toast.id = "calendar-painter-toast";
  toast.textContent = message;

  Object.assign(toast.style, {
    position: "fixed",
    right: "22px",
    bottom: "22px",
    zIndex: "2147483647",
    maxWidth: "360px",
    padding: "11px 15px",
    borderRadius: "8px",
    background: "rgba(35, 39, 47, 0.94)",
    color: "#ffffff",
    font: "message-box",
    fontSize: "13px",
    lineHeight: "1.35",
    whiteSpace: "pre-line",
    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.35)",
    pointerEvents: "none",
    opacity: "0",
    transform: "translateY(8px)",
    transition: "opacity 160ms ease, transform 160ms ease"
  });

  document.documentElement.appendChild(toast);

  window.requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    window.setTimeout(() => toast.remove(), 180);
  }, duration);
}

function paintSingle(document, dateKey, color) {
  const markers = readMarkers();
  markers[dateKey] = createMarker(color);
  writeMarkers(markers);
  repaint(document);
}

function paintRange(document, startKey, endKey, color) {
  const markers = readMarkers();
  const marker = createMarker(color);

  for (const key of keysInRange(startKey, endKey)) {
    markers[key] = { ...marker };
  }

  writeMarkers(markers);
  repaint(document);
}

function eraseDate(document, dateKey) {
  const markers = readMarkers();
  delete markers[dateKey];
  writeMarkers(markers);
  repaint(document);
}

function addColorItems(document, parent, callback) {
  for (const entry of PALETTE) {
    const item = document.createXULElement("menuitem");
    item.setAttribute("label", `${entry.symbol}  ${T(entry.name)}`);
    item.setAttribute("data-color", entry.color);
    item.addEventListener("command", () => callback(entry.color, entry.name));
    parent.appendChild(item);
  }
}

function createMenu(document, window, state) {
  let popupSet = document.getElementById("calendar-painter-popupset");
  if (!popupSet) {
    popupSet = document.createXULElement("popupset");
    popupSet.id = "calendar-painter-popupset";
    document.documentElement.appendChild(popupSet);
  }

  let menu = document.getElementById("calendar-painter-menu");
  if (menu) return menu;

  menu = document.createXULElement("menupopup");
  menu.id = "calendar-painter-menu";

  const title = document.createXULElement("menuitem");
  title.id = "calendar-painter-title";
  title.setAttribute("disabled", "true");
  menu.appendChild(title);

  menu.appendChild(document.createXULElement("menuseparator"));

  const dayColorMenu = document.createXULElement("menu");
  dayColorMenu.setAttribute("label", T("paintDay"));
  const dayColorPopup = document.createXULElement("menupopup");
  addColorItems(document, dayColorPopup, color => {
    if (!menu._dateKey) return;
    paintSingle(document, menu._dateKey, color);
    state.lastColor = color;
  });
  dayColorMenu.appendChild(dayColorPopup);
  menu.appendChild(dayColorMenu);

  const rangeStart = document.createXULElement("menuitem");
  rangeStart.id = "calendar-painter-range-start";
  rangeStart.setAttribute("label", T("setRangeStart"));
  rangeStart.addEventListener("command", () => {
    if (!menu._dateKey) return;
    state.rangeStart = menu._dateKey;
    window.alert(
      `Calendar Painter\n\n${T("rangeStartAlert1")}: ${state.rangeStart}\n\n${T("rangeStartAlert2")}`
    );
  });
  menu.appendChild(rangeStart);

  const rangeMenu = document.createXULElement("menu");
  rangeMenu.id = "calendar-painter-range-menu";
  rangeMenu.setAttribute("label", T("paintRange"));
  const rangePopup = document.createXULElement("menupopup");
  addColorItems(document, rangePopup, color => {
    if (!state.rangeStart || !menu._dateKey) return;
    paintRange(document, state.rangeStart, menu._dateKey, color);
    state.lastColor = color;
    state.rangeStart = null;
  });
  rangeMenu.appendChild(rangePopup);
  menu.appendChild(rangeMenu);

  const cancelRange = document.createXULElement("menuitem");
  cancelRange.id = "calendar-painter-range-cancel";
  cancelRange.setAttribute("label", T("cancelRange"));
  cancelRange.addEventListener("command", () => {
    state.rangeStart = null;
  });
  menu.appendChild(cancelRange);

  menu.appendChild(document.createXULElement("menuseparator"));

  const eraser = document.createXULElement("menuitem");
  eraser.id = "calendar-painter-eraser";
  eraser.setAttribute("label", T("enableEraser"));
  eraser.addEventListener("command", () => {
    state.eraser = true;
    window.alert(
      T("eraserAlert")
    );
  });
  menu.appendChild(eraser);

  const remove = document.createXULElement("menuitem");
  remove.setAttribute("label", T("removeColor"));
  remove.addEventListener("command", () => {
    if (!menu._dateKey) return;
    eraseDate(document, menu._dateKey);
  });
  menu.appendChild(remove);

  menu.addEventListener("popupshowing", () => {
    const hasRange = Boolean(state.rangeStart);

    // W XUL atrybuty logiczne działają przez samą obecność.
    // disabled="false" nadal może pozostawić element nieaktywny,
    // dlatego przy włączaniu trzeba atrybut całkowicie usunąć.
    if (hasRange) {
      rangeMenu.removeAttribute("disabled");
      cancelRange.removeAttribute("hidden");
      rangeMenu.setAttribute(
        "label",
        `${T("paintRange")} ${state.rangeStart} → ${menu._dateKey}`
      );
    } else {
      rangeMenu.setAttribute("disabled", "true");
      cancelRange.setAttribute("hidden", "true");
      rangeMenu.setAttribute("label", T("paintRange"));
    }

    eraser.setAttribute(
      "label",
      state.eraser ? T("eraserActive") : T("enableEraser")
    );
  });

  popupSet.appendChild(menu);
  return menu;
}

var calendarPainter = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      calendarPainter: {
        async setLanguage(language) {
          UI_LANG = String(language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
        },

        async start() {
          const window = Services.wm.getMostRecentWindow("mail:3pane");
          if (!window) {
            throw new Error(T("noWindow"));
          }

          const document = window.document;

          if (window.__calendarPainter112Active) {
            repaint(document);
            return;
          }
          window.__calendarPainter112Active = true;

          const state = window.__calendarPainterState = {
            mode: "idle",
            rangeStart: null,
            eraser: false,
            lastColor: "#ffd54f"
          };

          const menu = createMenu(document, window, state);

          document.addEventListener("contextmenu", event => {
            if (!(event.ctrlKey && event.shiftKey)) return;

            const box = findDayBox(event);
            if (!box) return;

            const date = getDateFromBox(box);
            if (!date) {
              window.alert(T("noDate"));
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            menu._targetBox = box;
            menu._dateKey = date;

            const title = document.getElementById("calendar-painter-title");
            title.setAttribute(
              "label",
              state.rangeStart
                ? `Calendar Painter — ${date}  |  ${T("rangeStartLabel")}: ${state.rangeStart}`
                : `Calendar Painter — ${date}`
            );

            menu.openPopupAtScreen(event.screenX, event.screenY, true);
          }, true);

          document.addEventListener("click", event => {
            if (event.button !== 0 || state.mode === "idle") return;

            const box = findDayBox(event);
            if (!box) return;

            const date = getDateFromBox(box);
            if (!date) return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (state.mode === "erase") {
              eraseDate(document, date);
              return;
            }

            if (state.mode === "paint") {
              paintSingle(document, date, state.lastColor);
              return;
            }

            if (state.mode === "range") {
              if (!state.rangeStart) {
                state.rangeStart = date;
                showToast(document, `📅 ${T("rangeStartToast")}: ${date}\n${T("clickEnd")}`);
              } else {
                paintRange(document, state.rangeStart, date, state.lastColor);
                state.rangeStart = null;
                state.mode = "idle";
                showToast(document, T("rangePainted"));
              }
            }
          }, true);

          document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
              const hadMode = state.mode !== "idle" || state.rangeStart;
              state.mode = "idle";
              state.eraser = false;
              state.rangeStart = null;

              if (hadMode) {
                showToast(document, T("modeStopped"));
              }
            }
          }, true);

          const observer = new window.MutationObserver(() => {
            window.clearTimeout(window.__calendarPainter112Timer);
            window.__calendarPainter112Timer = window.setTimeout(
              () => repaint(document),
              150
            );
          });

          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });

          // At midnight move the hand-drawn ring to the new current day,
          // even if Thunderbird remains open overnight.
          const scheduleMidnightRefresh = () => {
            if (window.__calendarPainterMidnightTimer) {
              window.clearTimeout(window.__calendarPainterMidnightTimer);
            }

            const now = new Date();
            const next = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
              0, 0, 2, 0
            );

            window.__calendarPainterMidnightTimer = window.setTimeout(() => {
              repaint(document);
              scheduleMidnightRefresh();
            }, Math.max(1000, next.getTime() - now.getTime()));
          };

          scheduleMidnightRefresh();
          repaint(document);
},

        async setMode(mode, color) {
          const window = Services.wm.getMostRecentWindow("mail:3pane");
          const state = window?.__calendarPainterState;
          if (!state) throw new Error(T("notStarted"));
          if (!["idle", "paint", "erase", "range"].includes(mode)) {
            throw new Error(`${T("unknownMode")}: ${mode}`);
          }

          state.mode = mode;
          state.eraser = mode === "erase";
          state.rangeStart = null;

          if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
            state.lastColor = color;
          }

          return {
            mode: state.mode,
            color: state.lastColor,
            rangeStart: state.rangeStart,
            todayRing: readTodayRingEnabled()
          };
        },

        async getState() {
          const window = Services.wm.getMostRecentWindow("mail:3pane");
          const state = window?.__calendarPainterState;
          return state
            ? {
                mode: state.mode,
                color: state.lastColor,
                rangeStart: state.rangeStart,
                todayRing: readTodayRingEnabled()
              }
            : {
                mode: "idle",
                color: "#ffd54f",
                rangeStart: null,
                todayRing: readTodayRingEnabled()
              };
        },

        async setTodayRing(enabled) {
          const window = Services.wm.getMostRecentWindow("mail:3pane");
          writeTodayRingEnabled(enabled);

          if (window) {
            repaint(window.document);
          }

          return { todayRing: readTodayRingEnabled() };
        },

        async stopMode() {
          const window = Services.wm.getMostRecentWindow("mail:3pane");
          const state = window?.__calendarPainterState;
          if (state) {
            state.mode = "idle";
            state.eraser = false;
            state.rangeStart = null;
          }
        }
      }
    };
  }
};
