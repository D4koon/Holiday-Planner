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
let publicHolidays = {}; // keys: local date string, values: holiday objects
let events = []; // school holiday events

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
    monthDiv.innerHTML = `<h3>${month}</h3>`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'days-header';
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

    for (let i = 1; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'day';
      daysDiv.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      dayDiv.textContent = day;
      const dateObj = new Date(year, monthIndex, day);
      const date = getLocalDateString(dateObj);
      dayDiv.setAttribute('data-date', date);
      if (selectedDays.has(date)) {
        dayDiv.classList.add('selected');
      }
      if (publicHolidays[date]) {
        dayDiv.classList.add('public-holiday');
      }
      // Mark weekend days (Saturday = 6, Sunday = 0).
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayDiv.classList.add('weekend');
      }
      dayDiv.addEventListener('click', () => toggleDay(dayDiv, date));
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

// Toggle the selection state when a day is clicked.
function toggleDay(dayDiv, date) {
  if (selectedDays.has(date)) {
    selectedDays.delete(date);
    dayDiv.classList.remove('selected');
  } else {
    selectedDays.add(date);
    dayDiv.classList.add('selected');
  }
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

// Update calendar view when "Aktualisieren" is pressed.
function updateCalendar() {
  const newYear = parseInt(document.getElementById('year-input').value, 10);
  if (!isNaN(newYear) && newYear !== year) {
    year = newYear;
    selectedDays.clear();
    publicHolidays = {};
    document.getElementById("bavarianHolidaysCheckbox").checked = false;
    document.getElementById("hohesFriedensfestCheckbox").checked = false;
  }
  updateTitleAndHeading();
  generateCalendar();
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
    li.textContent = `${event.summary} (${event.start} - ${event.end}): ${event.description || 'Keine Beschreibung'}`;
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
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
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
generateCalendar();
