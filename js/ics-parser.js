// ics-parser.js
// Contains only functions related to parsing ICS data.

function parseICSData(icsData) {
  const lines = icsData.split('\n');
  let events = [];
  let event = null;
  let inEvent = false;
  let descriptionBuffer = '';

  lines.forEach(line => {
    if (line.startsWith('BEGIN:VEVENT')) {
      event = {};
      inEvent = true;
    } else if (line.startsWith('END:VEVENT')) {
      if (descriptionBuffer) {
        event.description = descriptionBuffer.trim();
        descriptionBuffer = '';
      }
      events.push(event);
      event = null;
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('DTSTART;VALUE=DATE:')) {
        let dateStr = line.replace('DTSTART;VALUE=DATE:', '').trim();
        event.start = formatICSDate(dateStr);
      } else if (line.startsWith('DTEND;VALUE=DATE:')) {
        let dateStr = line.replace('DTEND;VALUE=DATE:', '').trim();
        event.end = formatICSDate(dateStr);
      } else if (line.startsWith('SUMMARY:')) {
        event.summary = line.replace('SUMMARY:', '').trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        descriptionBuffer += line.replace('DESCRIPTION:', '').trim() + ' ';
      } else if (line.startsWith(' ') && descriptionBuffer) {
        descriptionBuffer += line.trim() + ' ';
      }
    }
  });
  return events;
}

function formatICSDate(dateStr) {
  if (dateStr.length === 8) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }
  return dateStr;
}
