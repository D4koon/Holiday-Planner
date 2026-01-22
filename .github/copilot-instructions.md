# Copilot instructions (Holiday-Planner)

## Project overview
- Static, client-only app served from GitHub Pages.
- Entry point: `index.html` loads plain scripts (no bundler):
  - `js/ics-parser.js` (ICS parsing utilities)
  - `js/public-holidays.js` (holiday calculations)
  - `js/main.js` (UI + state + rendering)
- Styling/themes live in `css/style.css` via `body.dark` / `body.light` classes.

## Architecture & data flow (important)
- Global state in `js/main.js`:
  - `year` (drives calendar rendering)
  - `selectedDays: Set<string>` (local date keys `YYYY-MM-DD`)
  - `publicHolidays: Record<string, {date,name,description,region}>`
  - `events: Array<{start,end,summary,description}>` from ICS
- Calendar rendering is “regen on change”: most actions end with `generateCalendar()`.
- Date keys must use local formatting helper `getLocalDateString(date)` (don’t use `toISOString()`; timezones will bite).

## Conventions & patterns
- Keep scripts browser-global (no modules/imports). New functions are referenced directly from inline `onclick` handlers in `index.html`.
- When adding a new UI control, update both:
  - `index.html` for the control + handler hook
  - `js/main.js` for behavior and any re-render calls
- Event highlighting: `highlightEvents()` adds `.event-day` class by matching `.day[data-date="YYYY-MM-DD"]`.
- Public holiday highlighting: `generateCalendar()` adds `.public-holiday` class when `publicHolidays[date]` exists.

## GitHub Pages & PR previews
- Deploy workflows live in `.github/workflows/`:
  - `deploy-main.yml` publishes repository root to `gh-pages` root (`keep_files: true`, excludes `.github`).
  - `pr-preview.yml` publishes PR contents to `gh-pages/pr-<number>/` and comments the preview URL.
- Keep `pr-*/` directories in mind: the main deploy preserves them.
- Notes on historical 404 fixes are in `FIXING_PR_PREVIEW.md`.

## Local development
- No build step. Open `index.html` directly, or use a simple static server for correct relative paths.
- If you run via VS Code Live Server, the page should be available at `http://127.0.0.1:5500/`.
- Quick server (PowerShell):
  ```powershell
  python -m http.server 8000
  ```
  Then open `http://localhost:8000/`.

## Safe edit checklist (project-specific)
- Preserve `YYYY-MM-DD` string format everywhere (`selectedDays`, `publicHolidays`, ICS `start/end`).
- If you change how dates are parsed/formatted, verify:
  - selection grouping in `displaySelectedHolidayBlocks()`
  - ICS exclusive end date handling in `displayEvents()` (end date minus one day)
  - week-number layout rules in `generateCalendar()` (8-column grid: KW + 7 days)
