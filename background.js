(async () => {
  try {
    await browser.calendarPainter.setLanguage(browser.i18n.getUILanguage());
    await browser.calendarPainter.start();
    console.log("Calendar Painter 1.1.7 started.");
  } catch (error) {
    console.error("Calendar Painter 1.1.7 — error:", error);
  }
})();
