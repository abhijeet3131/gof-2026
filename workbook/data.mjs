// Seed data for the GOF 2026 workbook: houses, events, fixtures and the draft schedule.
// Source: GOF 2026 rulebook + SCAM's fixture sheet and draft schedule (Oct 2026).

export const HOUSES = [
  { name: 'Gryffindor', code: 'G', colour: '#C8232B' },
  { name: 'Slytherin', code: 'S', colour: '#23824A' },
  { name: 'Ravenclaw', code: 'R', colour: '#1168BA' },
  { name: 'Hufflepuff', code: 'H', colour: '#E3B32D' },
];

const KO = 'Knockout';
const SR = 'Single round';
const TBD = 'To be declared';

// [event, sport, gender, format, points 1st, points 2nd, DON eligible, default venue]
export const EVENTS = [
  ['Football Men', 'Football', 'Men', KO, 200, 100, 'Yes', 'Football Ground'],
  ['Football Women', 'Football', 'Women', KO, 200, 100, 'Yes', 'Football Ground'],
  ['Basketball Men', 'Basketball', 'Men', KO, 200, 100, 'Yes', 'Basketball Court'],
  ['Basketball Women', 'Basketball', 'Women', KO, 200, 100, 'Yes', 'Basketball Court'],
  ['Volleyball Men', 'Volleyball', 'Men', KO, 200, 100, 'Yes', 'Volleyball Court'],
  ['Volleyball Women', 'Volleyball', 'Women', KO, 200, 100, 'Yes', 'Volleyball Court'],
  ['Cricket', 'Cricket', 'Men', KO, 200, 100, 'Yes', 'Cricket Ground'],
  ['Dodgeball', 'Dodgeball', 'Women', KO, 200, 100, 'Yes', 'Football Ground'],
  ['Frisbee', 'Frisbee', 'Mixed', KO, 200, 100, 'Yes', 'Football Ground'],
  ['Badminton', 'Badminton', 'Mixed', KO, 200, 100, 'Yes', 'Badminton Court'],
  ['Table Tennis', 'Table Tennis', 'Mixed', KO, 200, 100, 'Yes', 'Community Centre'],
  ['Lawn Tennis', 'Lawn Tennis', 'Mixed', KO, 200, 100, 'Yes', 'Lawn Tennis Court'],
  ['Pickleball', 'Pickleball', 'Mixed', KO, 200, 100, 'Yes', 'Pickleball Court'],
  ['Chess', 'Chess', 'Mixed', KO, 200, 100, 'Yes', TBD],
  ['Poker', 'Poker', 'Mixed', SR, 200, 100, 'Yes', TBD],
  ['FIFA', 'E-Sports', 'Mixed', KO, 100, 50, 'No', TBD],
  ['BGMI', 'E-Sports', 'Mixed', SR, 100, 50, 'No', TBD],
  ['Relay Men', 'Athletics', 'Men', SR, 100, 50, 'No', 'Football Ground'],
  ['Relay Women', 'Athletics', 'Women', SR, 100, 50, 'No', 'Football Ground'],
  ['Shot Put Men', 'Athletics', 'Men', SR, 100, 50, 'No', 'Football Ground'],
  ['Shot Put Women', 'Athletics', 'Women', SR, 100, 50, 'No', 'Football Ground'],
];

export const WEASLEY = [
  { challenger: 'Ravenclaw', challenged: 'Slytherin', event: 'Football Men' },
  { challenger: 'Gryffindor', challenged: 'Slytherin', event: 'FIFA' },
];

// Semi-final pairings from SCAM's fixture sheet: [Semi 1 teams, Semi 2 teams] (house codes).
export const FIXTURES = {
  'Football Men': [['R', 'S'], ['G', 'H']],
  'Football Women': [['R', 'H'], ['G', 'S']],
  'Basketball Men': [['R', 'S'], ['G', 'H']],
  'Basketball Women': [['H', 'G'], ['R', 'S']],
  'Volleyball Men': [['H', 'R'], ['G', 'S']],
  'Volleyball Women': [['H', 'R'], ['G', 'S']],
  'Cricket': [['S', 'G'], ['R', 'H']],
  'Dodgeball': [['S', 'H'], ['G', 'R']],
  'Frisbee': [['G', 'H'], ['R', 'S']],
  'Badminton': [['G', 'R'], ['S', 'H']],
  'Table Tennis': [['G', 'S'], ['R', 'H']],
  'Lawn Tennis': [['G', 'S'], ['R', 'H']],
  'Pickleball': [['R', 'H'], ['G', 'S']],
  'Chess': [['S', 'G'], ['R', 'H']],
  'FIFA': [['G', 'S'], ['R', 'H']],
};

// The SCHEDULE grid exactly as SCAM keeps it (latest version, 14 Oct 2026).
// Columns are the grid's time headers; '' is the grey spacer column.
// Each slot: [label as typed in the grid, starting column, number of columns it spans].
// Times after midnight stay on the evening's row ("Next Date" in the grid header).
const C = ['6:00', '', '21:30', '22:00', '22:30', '23:00', '23:30', '0:00', '0:30', '1:00', '1:30', '2:00'];
export const GRID = {
  columns: C,
  rows: [
    ['2026-10-14', [['Opening Ceremony', '6:00', 12]]],
    ['2026-10-15', [['Pickleball (G v S)', '22:30', 2], ['BGMI (All)', '23:30', 2], ['FIFA (G v S)', '0:30', 1], ['FIFA (H v R)', '1:00', 1], ['FIFA Finals', '1:30', 1]]],
    ['2026-10-16', [['Khula Aasmaan', '6:00', 12]]],
    ['2026-10-17', [['Ethnic Day', '6:00', 12]]],
    ['2026-10-18', [['Pickleball (H v R)', '22:30', 2], ['Badminton (R v G)', '23:30', 2], ['Badminton (H v S)', '0:30', 2]]],
    ['2026-10-19', [['Oorja', '6:00', 12]]],
    ['2026-10-20', [['Volleyball W (G v S)', '21:30', 2], ['Volleyball M (G v S)', '22:30', 2], ['Volleyball W (R v H)', '23:30', 2], ['Volleyball M (R v H)', '0:30', 2]]],
    ['2026-10-21', [['Cricket (S v G)', '6:00', 1], ['Football W (G v S)', '22:30', 2], ['Football M (S v R)', '23:30', 2], ['Pickleball Finals', '0:30', 2]]],
    ['2026-10-22', [['Cricket (R v H)', '6:00', 1], ['Football W (R v H)', '22:30', 2], ['Football M (G v H)', '23:30', 2], ['Chess (S v G)', '0:30', 1], ['Chess (H v R)', '1:00', 1], ['Volleyball M Finals', '1:30', 2]]],
    ['2026-10-23', [['Basketball W (H v G)', '22:30', 2], ['Basketball M (H v G)', '23:30', 2], ['Volleyball W Finals', '0:30', 2]]],
    ['2026-10-24', [['Cricket Finals', '6:00', 1], ['Litfest', '', 7], ['TT (G v S)', '0:30', 2], ['Poker (All)', '1:30', 2]]],
    ['2026-10-25', [['Litfest', '6:00', 12]]],
    ['2026-10-26', [['TT (H v R)', '23:00', 2], ['Basketball M (R v S)', '0:00', 2], ['Basketball W (R v S)', '1:00', 2]]],
    ['2026-10-27', [['', '6:00', 12]]],
    ['2026-10-28', [['Frisbee (G v H)', '23:00', 2], ['Frisbee (S v R)', '0:00', 2], ['Lawn Tennis (G v S)', '1:00', 2]]],
    ['2026-10-29', [['Athletics (Relay) W', '23:00', 1], ['Athletics (Relay) M', '23:30', 1], ['TT Finals', '0:00', 2], ['Lawn Tennis (H v R)', '1:00', 2]]],
    ['2026-10-30', [['Football M Finals', '23:00', 2], ['Dodgeball Finals', '0:00', 1], ['Athletics (Shotput) M', '0:30', 1], ['Athletics (Shotput) W', '1:00', 1], ['Chess Finals', '1:30', 1]]],
    ['2026-10-31', [['Football W Finals', '23:00', 2], ['Lawn Tennis Finals', '0:00', 2], ['Basketball M Finals', '1:00', 2]]],
    ['2026-11-01', [['Verve', '6:00', 12]]],
    ['2026-11-02', [['Basketball W Finals', '23:00', 2], ['Frisbee Finals', '0:30', 2]]],
    ['2026-11-03', [['Badminton Finals', '23:00', 2]]],
  ],
};
