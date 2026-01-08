// js/public-holidays.js
// Contains functions for calculating public holidays for a given year.

// Helper: Compute Easter Sunday for a given year.
function getEasterSunday(y) {
    const f = Math.floor;
    const G = y % 19;
    const C = f(y / 100);
    const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
    const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
    const J = (y + f(y / 4) + I + 2 - C + f(C / 4)) % 7;
    const L = I - J;
    const month = 3 + f((L + 40) / 44);
    const day = L + 28 - 31 * f(month / 4);
    return new Date(y, month - 1, day);
  }
  
  // calculateBavarianHolidays: Returns an object mapping local date strings (YYYY-MM-DD)
  // to holiday objects for the given year. The function expects a helper to format dates.
  function calculateBavarianHolidays(year, getLocalDateString) {
    let holidays = [];
    // Fixed-date holidays:
    holidays.push({ date: new Date(year, 0, 1), name: "Neujahr", description: "bundesweit", region: "Deutschland" });
    holidays.push({ date: new Date(year, 0, 6), name: "Heilige Drei Könige", description: "in Bayern, Baden-Württemberg, Sachsen-Anhalt", region: "Bayern, Baden-Württemberg, Sachsen-Anhalt" });
    
    // Easter-dependent holidays:
    const easter = getEasterSunday(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    holidays.push({ date: goodFriday, name: "Karfreitag", description: "bundesweit", region: "Deutschland" });
    
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    holidays.push({ date: easterMonday, name: "Ostermontag", description: "bundesweit", region: "Deutschland" });
    
    // Labour Day:
    holidays.push({ date: new Date(year, 4, 1), name: "Tag der Arbeit", description: "bundesweit", region: "Deutschland" });
    
    // Christi Himmelfahrt:
    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);
    holidays.push({ date: ascension, name: "Christi Himmelfahrt", description: "bundesweit", region: "Deutschland" });
    
    // Pfingstmontag:
    const whitMonday = new Date(easter);
    whitMonday.setDate(easter.getDate() + 50);
    holidays.push({ date: whitMonday, name: "Pfingstmontag", description: "bundesweit", region: "Deutschland" });
    
    // Fronleichnam:
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);
    holidays.push({ date: corpusChristi, name: "Fronleichnam", description: "in ausgewählten Bundesländern", region: "Bayern, Baden-Württemberg, Hessen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland" });
    
    // Other fixed-date holidays:
    holidays.push({ date: new Date(year, 7, 15), name: "Mariä Himmelfahrt", description: "regional (vor allem in katholischen Gemeinden)", region: "Bayern (regional)" });
    holidays.push({ date: new Date(year, 9, 3), name: "Tag der Deutschen Einheit", description: "bundesweit", region: "Deutschland" });
    holidays.push({ date: new Date(year, 10, 1), name: "Allerheiligen", description: "in ausgewählten Bundesländern", region: "Bayern, Baden-Württemberg, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland" });
    holidays.push({ date: new Date(year, 11, 25), name: "1. Weihnachtstag", description: "bundesweit", region: "Deutschland" });
    holidays.push({ date: new Date(year, 11, 26), name: "2. Weihnachtstag", description: "bundesweit", region: "Deutschland" });
    
    // Build the result as an object mapping local date strings to holiday objects.
    let result = {};
    holidays.forEach(holiday => {
      const iso = getLocalDateString(holiday.date);
      result[iso] = holiday;
    });
    return result;
  }
  