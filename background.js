(async () => {
  try {
    await browser.calendarPainter.start();
    console.log("Calendar Painter 1.1 alpha 5 uruchomiony.");
  } catch (error) {
    console.error("Calendar Painter 1.1 alpha 5 — błąd:", error);
  }
})();
