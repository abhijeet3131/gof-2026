// Visual identity per house, from the official GOF 2026 banner and jerseys.
// Colours themselves come from the sheet (SETUP tab); this adds mascots and hostels.
// Hostel names and order follow SCAM's house list (edit request, 13 Oct).

export const HOUSE_BRAND = {
  Gryffindor: { mascot: '/brand/lion.svg', hostels: ['Champa', 'Kalpvriksh', 'Kachnar', 'Silver Oak'] },
  Hufflepuff: { mascot: '/brand/badger.svg', hostels: ['Chinar', 'Gulmohar', 'Chandni', 'Rudraksh', 'Ashoka 1, 3'] },
  Ravenclaw: { mascot: '/brand/eagle.svg', hostels: ['Amaltas', 'Shishya Gramah', 'Ashoka G, 2, 4'] },
  Slytherin: { mascot: '/brand/snake.svg', hostels: ['Palaash', 'Parijat'] },
};

export const hostelsOf = (house) => HOUSE_BRAND[house]?.hostels || [];

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** Short row label like last year's points table: "Basketball (M)", "Relay (W)", "BGMI". */
export function eventLabel(e) {
  return e.name.replace(/ Men$/, ' (M)').replace(/ Women$/, ' (W)');
}

/** Sort events the way last year's table did: by sport, then by name. */
export function sortEvents(events) {
  return events.slice().sort((a, b) => a.sport.localeCompare(b.sport) || a.name.localeCompare(b.name));
}
