// js/main.js
// Contains the main functionality for the Holiday Planner

// Global constants.
const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const months = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Set default year.
let year = new Date().getFullYear();
document.getElementById('year-input').value = year;

// Global variables.
let selectedDays = new Set();
let selectedDaysByYear = {};
let publicHolidays = {}; // keys: local date string, values: holiday objects
let events = []; // school holiday events
let bavariaSchoolHolidaysEnabled = false;
const SELECTED_DAYS_STORAGE_KEY = 'holidayPlanner.selectedDays';

// Hover tooltip state.
let hoverTooltipEl = null;
let hoverActiveDayEl = null;
let clearSelectedDialogTriggerEl = null;

function ensureHoverTooltip() {
  if (hoverTooltipEl) return hoverTooltipEl;
  hoverTooltipEl = document.createElement('div');
  hoverTooltipEl.id = 'day-hover-tooltip';
  hoverTooltipEl.setAttribute('role', 'tooltip');
  hoverTooltipEl.style.display = 'none';
  document.body.appendChild(hoverTooltipEl);
  return hoverTooltipEl;
}

function hideDayHoverTooltip() {
  const el = ensureHoverTooltip();
  el.style.display = 'none';
  el.innerHTML = '';
  if (hoverActiveDayEl) {
    hoverActiveDayEl.removeAttribute('aria-describedby');
    hoverActiveDayEl = null;
  }
}

function positionDayHoverTooltip(targetEl) {
  const el = ensureHoverTooltip();
  const rect = targetEl.getBoundingClientRect();
  const margin = 10;

  // Place above the day by default.
  let top = rect.top + window.scrollY - el.offsetHeight - margin;
  let left = rect.left + window.scrollX + rect.width / 2 - el.offsetWidth / 2;

  // Clamp horizontally to viewport.
  const minLeft = window.scrollX + 8;
  const maxLeft = window.scrollX + window.innerWidth - el.offsetWidth - 8;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  // If off-screen above, place below.
  const minTop = window.scrollY + 8;
  if (top < minTop) {
    top = rect.bottom + window.scrollY + margin;
  }

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

function showDayHoverTooltip(targetEl, htmlContent) {
  const el = ensureHoverTooltip();
  el.innerHTML = htmlContent;
  el.style.display = 'block';
  // First position after content renders (needs size).
  positionDayHoverTooltip(targetEl);
  hoverActiveDayEl = targetEl;
  targetEl.setAttribute('aria-describedby', el.id);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Helper: Returns a local date string (YYYY-MM-DD) from a Date object.
function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Format a Date as dd.mm.
function formatDateLocal(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}.${m}`;
}

// Helper: Format a Date as dd.mm.yyyy.
function formatDateWithYear(date) {
  return formatDateLocal(date) + '.' + date.getFullYear();
}

function saveSelectedDays() {
  try {
    selectedDaysByYear[String(year)] = Array.from(selectedDays)
      .filter(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
      .sort();
    localStorage.setItem(SELECTED_DAYS_STORAGE_KEY, JSON.stringify(selectedDaysByYear));
  } catch (error) {
    console.warn('Could not persist selected holidays.', error);
  }
}

function applySelectedDaysForCurrentYear() {
  const currentYearEntries = selectedDaysByYear[String(year)] || [];
  selectedDays = new Set(currentYearEntries);
}

function loadSelectedDays() {
  try {
    const raw = localStorage.getItem(SELECTED_DAYS_STORAGE_KEY);
    if (!raw) {
      selectedDaysByYear = {};
      selectedDays = new Set();
      return;
    }

    const parsed = JSON.parse(raw);

    // Legacy format support: persisted as a flat array.
    if (Array.isArray(parsed)) {
      const migrated = {};
      parsed
        .filter(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
        .forEach(date => {
          const dateYear = date.slice(0, 4);
          if (!migrated[dateYear]) migrated[dateYear] = [];
          migrated[dateYear].push(date);
        });

      Object.keys(migrated).forEach(y => {
        migrated[y].sort();
      });

      selectedDaysByYear = migrated;
      applySelectedDaysForCurrentYear();
      saveSelectedDays();
      return;
    }

    if (parsed && typeof parsed === 'object') {
      const normalized = {};
      Object.keys(parsed).forEach(yearKey => {
        const entries = parsed[yearKey];
        if (!Array.isArray(entries)) return;
        normalized[yearKey] = entries
          .filter(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
          .sort();
      });

      selectedDaysByYear = normalized;
      applySelectedDaysForCurrentYear();
      return;
    }

    selectedDaysByYear = {};
    selectedDays = new Set();
  } catch (error) {
    console.warn('Could not load persisted selected holidays.', error);
    selectedDaysByYear = {};
    selectedDays = new Set();
  }
}

// Helper: Get ISO week number for a date.
function getISOWeekNumber(date) {
  const target = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNum + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

// Update document title and main heading.
function updateTitleAndHeading() {
  document.title = 'Holiday Planner ' + year;
  document.querySelector('h1').textContent = 'Holiday Planner ' + year;
}
updateTitleAndHeading();

// Generate the calendar view.
function generateCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  months.forEach((month, monthIndex) => {
    const monthDiv = document.createElement('div');
    monthDiv.className = 'month';
    monthDiv.innerHTML = `<h3>${monthIndex + 1}. ${month}</h3>`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'days-header';
    // Add KW header
    const kwHeader = document.createElement('div');
    kwHeader.className = 'kw-header';
    kwHeader.textContent = 'KW';
    headerDiv.appendChild(kwHeader);
    weekdays.forEach(day => {
      const dayAbbr = document.createElement('div');
      dayAbbr.textContent = day.charAt(0);
      headerDiv.appendChild(dayAbbr);
    });
    monthDiv.appendChild(headerDiv);

    const daysDiv = document.createElement('div');
    daysDiv.className = 'days';

    let firstDate = new Date(year, monthIndex, 1);
    let firstDay = firstDate.getDay();
    firstDay = firstDay === 0 ? 7 : firstDay;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Add week number for the first week
    const firstWeekNum = getISOWeekNumber(firstDate);
    const weekNumDiv = document.createElement('div');
    weekNumDiv.className = 'week-number';
    weekNumDiv.textContent = firstWeekNum;
    daysDiv.appendChild(weekNumDiv);

    // Add empty cells before the first day of the month.
    // Important: do NOT use the `.day` class here, otherwise styling/highlighting logic
    // (and border changes for events/holidays) can affect layout and make numbers look shifted.
    for (let i = 1; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'empty-day';
      daysDiv.appendChild(emptyCell);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, monthIndex, day);
      const dayOfWeek = dateObj.getDay();
      const dayOfWeekMon = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to Monday = 1, Sunday = 7

      // Add week number at the start of each new week (Monday)
      if (dayOfWeekMon === 1 && day > 1) {
        const weekNum = getISOWeekNumber(dateObj);
        const weekNumDiv = document.createElement('div');
        weekNumDiv.className = 'week-number';
        weekNumDiv.textContent = weekNum;
        daysDiv.appendChild(weekNumDiv);
      }

      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      dayDiv.textContent = day;
      const date = getLocalDateString(dateObj);
      dayDiv.setAttribute('data-date', date);
      if (selectedDays.has(date)) {
        dayDiv.classList.add('selected');
      }
      if (publicHolidays[date]) {
        dayDiv.classList.add('public-holiday');
      }
      // Mark weekend days (Saturday = 6, Sunday = 0).
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayDiv.classList.add('weekend');
      }
      dayDiv.addEventListener('click', () => toggleDay(dayDiv, date));

      dayDiv.addEventListener('mouseenter', () => {
        const html = buildDayInfoTooltipHtml(date);
        if (html) showDayHoverTooltip(dayDiv, html);
      });
      dayDiv.addEventListener('mousemove', () => {
        if (hoverTooltipEl && hoverTooltipEl.style.display === 'block') {
          positionDayHoverTooltip(dayDiv);
        }
      });
      dayDiv.addEventListener('mouseleave', () => {
        if (hoverActiveDayEl === dayDiv) hideDayHoverTooltip();
      });

      daysDiv.appendChild(dayDiv);
    }

    monthDiv.appendChild(daysDiv);
    calendar.appendChild(monthDiv);
  });
  updateSelectedDays();
  highlightEvents();
  displayPublicHolidays();
  displaySelectedHolidayBlocks();
}

function eventCoversLocalDate(event, isoDate) {
  const startDate = new Date(event.start);
  const endDateExclusive = new Date(event.end);
  for (let d = new Date(startDate); d < endDateExclusive; d.setDate(d.getDate() + 1)) {
    if (getLocalDateString(d) === isoDate) return true;
  }
  return false;
}

function buildDayInfoTooltipHtml(isoDate) {
  const sections = [];

  const holiday = publicHolidays[isoDate];
  if (holiday) {
    const title = escapeHtml(holiday.name || 'Feiertag');
    const desc = escapeHtml(holiday.description || '');
    const region = escapeHtml(holiday.region || '');
    const metaParts = [desc, region ? `Region: ${region}` : ''].filter(Boolean);
    sections.push(
      `<div class="tip-section">
         <div class="tip-title">Feiertag</div>
         <div class="tip-line"><strong>${title}</strong>${metaParts.length ? ` – ${metaParts.join(' · ')}` : ''}</div>
       </div>`
    );
  }

  const matchingEvents = events.filter(ev => eventCoversLocalDate(ev, isoDate));
  if (matchingEvents.length) {
    const lines = matchingEvents
      .map(ev => {
        const summary = escapeHtml(ev.summary || 'Schulferien');
        const desc = ev.description ? ` – ${escapeHtml(ev.description)}` : '';
        return `<div class="tip-line"><strong>${summary}</strong>${desc}</div>`;
      })
      .join('');

    sections.push(
      `<div class="tip-section">
         <div class="tip-title">Schulferien</div>
         ${lines}
       </div>`
    );
  }

  if (!sections.length) return '';
  return `<div class="tip-date">${escapeHtml(isoDate)}</div>${sections.join('')}`;
}

// Toggle the selection state when a day is clicked.
function toggleDay(dayDiv, date) {
  if (selectedDays.has(date)) {
    selectedDays.delete(date);
    dayDiv.classList.remove('selected');
  } else {
    selectedDays.add(date);
    dayDiv.classList.add('selected');
  }
  saveSelectedDays();
  updateSelectedDays();
  displaySelectedHolidayBlocks();
}

// Update the display of selected days count.
function updateSelectedDays() {
  const availableDays = parseInt(document.getElementById('holiday-count').value, 10) || 0;
  const selectedCount = selectedDays.size;
  const display = document.getElementById('selected-display');
  display.textContent = `(${selectedCount} von ${availableDays} verfügbaren Urlaubstagen ausgewählt)`;
  display.style.color = selectedCount > availableDays ? 'red' : 'inherit';
}

// Group consecutive selected days into blocks and display them.
function displaySelectedHolidayBlocks() {
  const ul = document.getElementById('selected-holidays');
  let arr = Array.from(selectedDays);
  arr.sort();
  let groups = [];
  if (arr.length > 0) {
    let currentGroup = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      let prev = new Date(arr[i - 1]);
      let current = new Date(arr[i]);
      let nextDay = new Date(prev);
      nextDay.setDate(prev.getDate() + 1);
      if (getLocalDateString(nextDay) === arr[i]) {
        currentGroup.push(arr[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [arr[i]];
      }
    }
    groups.push(currentGroup);
  }

  const items = groups.map(group => {
    if (group.length === 1) {
      let d = new Date(group[0]);
      return formatDateLocal(d);
    } else {
      let d1 = new Date(group[0]);
      let d2 = new Date(group[group.length - 1]);
      return `${formatDateLocal(d1)} - ${formatDateLocal(d2)}`;
    }
  });

  ul.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
}

// Re-render calendar state after control changes.
function updateCalendar() {
  const newYear = parseInt(document.getElementById('year-input').value, 10);
  if (!isNaN(newYear) && newYear !== year) {
    saveSelectedDays();
    year = newYear;
    applySelectedDaysForCurrentYear();
    publicHolidays = {};
    document.getElementById("bavarianHolidaysCheckbox").checked = false;
    document.getElementById("hohesFriedensfestCheckbox").checked = false;
    const schoolCb = document.getElementById("bavariaSchoolHolidaysCheckbox");
    if (schoolCb) schoolCb.checked = false;
    bavariaSchoolHolidaysEnabled = false;
    events = [];
  }
  updateTitleAndHeading();
  generateCalendar();
}

function openClearSelectedConfirm() {
  clearSelectedDialogTriggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.getElementById('clearSelectedConfirmOverlay');
  overlay.style.display = 'flex';
  const cancelButton = document.getElementById('cancel-clear-selected-button');
  if (cancelButton) {
    cancelButton.focus();
  }
}

function closeClearSelectedConfirm() {
  document.getElementById('clearSelectedConfirmOverlay').style.display = 'none';
  if (clearSelectedDialogTriggerEl && typeof clearSelectedDialogTriggerEl.focus === 'function') {
    clearSelectedDialogTriggerEl.focus();
  }
  clearSelectedDialogTriggerEl = null;
}

function confirmClearSelectedHolidaysCurrentYear() {
  closeClearSelectedConfirm();
  clearSelectedHolidaysCurrentYear();
}

function setupClearSelectedConfirmInteractions() {
  const overlay = document.getElementById('clearSelectedConfirmOverlay');
  if (!overlay) return;

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeClearSelectedConfirm();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.style.display === 'flex') {
      closeClearSelectedConfirm();
    }
  });
}

function clearSelectedHolidaysCurrentYear() {
  const currentYearPrefix = `${year}-`;
  Array.from(selectedDays).forEach(date => {
    if (date.startsWith(currentYearPrefix)) {
      selectedDays.delete(date);
    }
  });
  saveSelectedDays();
  generateCalendar();
}

function exportSelectedHolidaysAsCal() {
  const selectedCurrentYearDays = Array.from(selectedDays)
    .filter(date => date.startsWith(`${year}-`))
    .sort();

  if (!selectedCurrentYearDays.length) {
    alert(`Keine ausgewählten Urlaubstage im Jahr ${year} zum Exportieren.`);
    return;
  }

  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;

  const eventsContent = selectedCurrentYearDays.map(isoDate => {
    const [y, m, d] = isoDate.split('-').map(value => parseInt(value, 10));
    const endDate = new Date(y, m - 1, d);
    endDate.setDate(endDate.getDate() + 1);
    const dtEnd = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}`;
    const dtStart = `${String(y).padStart(4, '0')}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
    const uid = `${isoDate}-holiday-planner@local`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      'SUMMARY:Urlaub',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const calContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Holiday Planner//EN',
    'CALSCALE:GREGORIAN',
    eventsContent,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([calContent], { type: 'text/calendar;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `holiday-planner-${year}.cal`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

function triggerCalImport() {
  const input = document.getElementById('import-cal-input');
  if (!input) return;
  input.click();
}

function unfoldCalLines(calText) {
  const rawLines = calText.replace(/\r/g, '').split('\n');
  const unfolded = [];

  rawLines.forEach(rawLine => {
    if (!rawLine) return;
    if ((rawLine.startsWith(' ') || rawLine.startsWith('\t')) && unfolded.length) {
      unfolded[unfolded.length - 1] += rawLine.slice(1);
      return;
    }
    unfolded.push(rawLine);
  });

  return unfolded;
}

function parseCalValueToIsoDate(value) {
  if (!value) return null;
  const clean = value.trim();
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function isoDateToLocalDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(v => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

function importDatesToSelection(importedIsoDates) {
  importedIsoDates.forEach(isoDate => {
    const yearKey = isoDate.slice(0, 4);
    if (!selectedDaysByYear[yearKey]) {
      selectedDaysByYear[yearKey] = [];
    }
    if (!selectedDaysByYear[yearKey].includes(isoDate)) {
      selectedDaysByYear[yearKey].push(isoDate);
    }
  });

  Object.keys(selectedDaysByYear).forEach(yearKey => {
    selectedDaysByYear[yearKey].sort();
  });
}

function extractHolidayDatesFromCal(calText) {
  const lines = unfoldCalLines(calText);
  const importedDates = new Set();
  let inEvent = false;
  let startIso = null;
  let endIsoExclusive = null;

  lines.forEach(line => {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      startIso = null;
      endIsoExclusive = null;
      return;
    }

    if (line === 'END:VEVENT') {
      if (startIso) {
        const startDate = isoDateToLocalDate(startIso);
        const endDateExclusive = endIsoExclusive ? isoDateToLocalDate(endIsoExclusive) : null;

        if (endDateExclusive && endDateExclusive > startDate) {
          for (let dateCursor = new Date(startDate); dateCursor < endDateExclusive; dateCursor.setDate(dateCursor.getDate() + 1)) {
            importedDates.add(getLocalDateString(dateCursor));
          }
        } else {
          importedDates.add(startIso);
        }
      }

      inEvent = false;
      startIso = null;
      endIsoExclusive = null;
      return;
    }

    if (!inEvent) return;

    if (line.startsWith('DTSTART')) {
      const value = line.split(':').slice(1).join(':');
      startIso = parseCalValueToIsoDate(value);
      return;
    }

    if (line.startsWith('DTEND')) {
      const value = line.split(':').slice(1).join(':');
      endIsoExclusive = parseCalValueToIsoDate(value);
    }
  });

  return Array.from(importedDates).sort();
}

async function importSelectedHolidaysFromCal(event) {
  const fileInput = event && event.target ? event.target : null;
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;
  if (!file) return;

  try {
    const calText = await file.text();
    const importedDates = extractHolidayDatesFromCal(calText);

    if (!importedDates.length) {
      alert('Keine importierbaren Urlaubstage in der .cal-Datei gefunden.');
      return;
    }

    importDatesToSelection(importedDates);
    applySelectedDaysForCurrentYear();
    saveSelectedDays();
    generateCalendar();

    const importedCurrentYearCount = importedDates.filter(date => date.startsWith(`${year}-`)).length;
    alert(`${importedDates.length} Urlaubstag(e) importiert (${importedCurrentYearCount} im aktuellen Jahr ${year}).`);
  } catch (error) {
    console.error('Failed to import .cal file:', error);
    alert('Die .cal-Datei konnte nicht importiert werden.');
  } finally {
    if (fileInput) {
      fileInput.value = '';
    }
  }
}

let yearInputDebounceTimer = null;

function setupImmediateControlUpdates() {
  const yearInput = document.getElementById('year-input');
  const holidayCountInput = document.getElementById('holiday-count');

  if (yearInput) {
    yearInput.addEventListener('input', () => {
      if (yearInput.value === '' || yearInput.validity.badInput) {
        return;
      }
      if (yearInputDebounceTimer) {
        clearTimeout(yearInputDebounceTimer);
      }
      yearInputDebounceTimer = setTimeout(() => {
        updateCalendar();
      }, 250);
    });

    yearInput.addEventListener('change', () => {
      if (yearInputDebounceTimer) {
        clearTimeout(yearInputDebounceTimer);
        yearInputDebounceTimer = null;
      }
      updateCalendar();
    });
  }

  if (holidayCountInput) {
    holidayCountInput.addEventListener('input', updateSelectedDays);
    holidayCountInput.addEventListener('change', updateSelectedDays);
  }
}

async function loadBavariaSchoolHolidays() {
  const response = await fetch('data/school_holidays/bavaria_holidays_2024_2030.ical', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ICS (${response.status})`);
  }
  const icsText = await response.text();
  events = parseICSData(icsText);
  displayEvents();
  highlightEvents();
}

async function toggleBavariaSchoolHolidays() {
  const checkBox = document.getElementById('bavariaSchoolHolidaysCheckbox');
  bavariaSchoolHolidaysEnabled = !!(checkBox && checkBox.checked);

  if (!bavariaSchoolHolidaysEnabled) {
    events = [];
    displayEvents();
    highlightEvents();
    return;
  }

  try {
    await loadBavariaSchoolHolidays();
  } catch (err) {
    events = [];
    displayEvents();
    highlightEvents();
    if (checkBox) checkBox.checked = false;
    bavariaSchoolHolidaysEnabled = false;
    alert('Konnte die Schulferien-Datei nicht laden. Bitte über einen lokalen Server öffnen (nicht als file://).');
    console.error(err);
  }
}

// Add Bavarian public holidays by calling the external function from public-holidays.js.
function addBavarianHolidays() {
  // Preserve any existing "Hohes Friedensfest" entry.
  const hfIso = getLocalDateString(new Date(year, 7, 8));
  let hfHoliday = publicHolidays[hfIso] || null;

  // calculateBavarianHolidays is defined in js/public-holidays.js.
  let newHolidays = calculateBavarianHolidays(year, getLocalDateString);

  // Preserve the optional "Hohes Friedensfest" if it exists.
  if (hfHoliday) {
    newHolidays[hfIso] = hfHoliday;
  }

  publicHolidays = newHolidays;
  generateCalendar();
}

// Toggle Bavarian public holidays.
function toggleBavarianHolidays() {
  const checkBox = document.getElementById("bavarianHolidaysCheckbox");
  if (checkBox.checked) {
    addBavarianHolidays();
  } else {
    for (let iso in publicHolidays) {
      if (publicHolidays[iso].name !== "Hohes Friedensfest") {
        delete publicHolidays[iso];
      }
    }
    generateCalendar();
  }
}

// Toggle the optional "Hohes Friedensfest" (observed on August 8).
function toggleHohesFriedensfest() {
  const checkBox = document.getElementById("hohesFriedensfestCheckbox");
  const iso = getLocalDateString(new Date(year, 7, 8)); // August 8
  if (checkBox.checked) {
    publicHolidays[iso] = { date: new Date(year, 7, 8), name: "Hohes Friedensfest", description: "optional, regional", region: "regional" };
  } else {
    if (publicHolidays[iso]) {
      delete publicHolidays[iso];
    }
  }
  generateCalendar();
}

// Display public holidays as a list.
function displayPublicHolidays() {
  const phList = document.getElementById('public-holidays');
  phList.innerHTML = '';
  const keys = Object.keys(publicHolidays).sort();
  keys.forEach(iso => {
    const holiday = publicHolidays[iso];
    const parts = iso.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
    const li = document.createElement('li');
    li.textContent = `${formattedDate}: ${holiday.name} – ${holiday.description} (Region: ${holiday.region})`;
    phList.appendChild(li);
  });
}

// ICS parsing and event display for school holidays.
// parseICSData is defined in js/ics-parser.js.
function parseICS() {
  const icsData = document.getElementById('ics-data').value;
  events = parseICSData(icsData);
  displayEvents();
  highlightEvents();
}

function displayEvents() {
  const eventsList = document.getElementById('events');
  eventsList.innerHTML = '';
  events.forEach(event => {
    const li = document.createElement('li');
    // Format dates as dd.mm.yyyy for display
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    // Adjust end date by subtracting one day (ICS end dates are exclusive)
    endDate.setDate(endDate.getDate() - 1);
    const formattedStart = formatDateWithYear(startDate);
    const formattedEnd = formatDateWithYear(endDate);
    li.textContent = `${event.summary} (${formattedStart} - ${formattedEnd}): ${event.description || 'Keine Beschreibung'}`;
    eventsList.appendChild(li);
  });
}

function highlightEvents() {
  const days = document.querySelectorAll('.day');
  days.forEach(day => {
    day.classList.remove('event-day');
  });
  events.forEach(event => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateString = getLocalDateString(d);
      const dayDiv = document.querySelector(`.day[data-date="${dateString}"]`);
      if (dayDiv) {
        dayDiv.classList.add('event-day');
      }
    }
  });
}

// Theme toggling and configurator functions.
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("themeToggle");
  if (body.classList.contains("dark")) {
    body.classList.remove("dark");
    body.classList.add("light");
    btn.textContent = "Dark Theme";
  } else {
    body.classList.remove("light");
    body.classList.add("dark");
    btn.textContent = "Light Theme";
  }
}

function openThemeConfig() {
  document.getElementById("themeConfigurator").style.display = "flex";
}
function closeThemeConfig() {
  document.getElementById("themeConfigurator").style.display = "none";
}
function applyThemeConfig() {
  const radios = document.getElementsByName("theme");
  let selectedTheme;
  for (const radio of radios) {
    if (radio.checked) {
      selectedTheme = radio.value;
      break;
    }
  }
  const body = document.body;
  if (selectedTheme === "dark") {
    body.classList.remove("light");
    body.classList.add("dark");
    document.getElementById("themeToggle").textContent = "Light Theme";
  } else {
    body.classList.remove("dark");
    body.classList.add("light");
    document.getElementById("themeToggle").textContent = "Dark Theme";
  }
  closeThemeConfig();
}

// Initialize the calendar view.
loadSelectedDays();
setupImmediateControlUpdates();
setupClearSelectedConfirmInteractions();
generateCalendar();
