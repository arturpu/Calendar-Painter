# Calendar Painter

Calendar Painter is a Thunderbird extension that lets you color individual days
and date ranges directly in the monthly calendar view — without creating fake
all-day events.

## Why Calendar Painter?

Thunderbird can color calendars and events, but it does not provide a simple way
to visually mark the background of arbitrary days. Calendar Painter fills that
gap.

It is useful for:

- work rotations,
- holidays,
- travel periods,
- free days,
- personal planning,
- any visual schedule that should not become a calendar event.

## Features

- Paint a single day.
- Paint a date range.
- Erase previously applied colors.
- Keep colors after restarting Thunderbird.
- Use Calendar Painter directly from the Calendar toolbar.
- Receive non-blocking toast notifications instead of intrusive dialog boxes.
- Keep painted days separate from calendar events.

## Screenshots

### Monthly calendar view

![Calendar Painter in Thunderbird](docs/screenshots/calendar-view.png)

### Add-on Manager

![Calendar Painter in Add-on Manager](docs/screenshots/addon-manager.png)

### Calendar toolbar button

![Calendar Painter toolbar button](docs/screenshots/toolbar-button.png)

## Current version

**1.1 alpha 5**

This is the first public alpha release.

## Compatibility

Currently tested on:

- Thunderbird 153
- Windows 11

Planned before the stable release:

- Linux testing
- macOS testing
- English localization of the extension interface

## Installation

### Install the release package

1. Download the `.xpi` file from the latest GitHub release.
2. Open Thunderbird.
3. Open **Add-ons and Themes**.
4. Click the gear button.
5. Choose **Install Add-on From File**.
6. Select the downloaded `.xpi` file.

### Development installation

1. Open Thunderbird.
2. Open **Add-ons and Themes**.
3. Open **Debug Add-ons**.
4. Choose **Load Temporary Add-on**.
5. Select `manifest.json`.

## Usage

1. Open the Thunderbird Calendar.
2. Add the Calendar Painter button through **Customize Toolbars** if needed.
3. Click the Calendar Painter button.
4. Choose a color.
5. Select one of the modes:
   - Paint days
   - Paint range
   - Eraser
6. Press `Esc` to stop the active mode.

## Important

Calendar Painter changes only the visual background of calendar days.

It does not create, edit, or delete calendar events.

## Roadmap

- Linux support verification
- macOS support verification
- English interface
- recurring painting patterns
- import and export of painted-day data
- user-defined color palettes

## License

Calendar Painter is licensed under the MIT License.
