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

// Schedule rows: [date (night of), start, end, type, event or title, stage, team 1, team 2]
// Times 00:00-04:59 belong to the night that started on `date` (they are after midnight).
// Team letters: G S R H. Semi 1 / Semi 2 follow the SCAM fixture sheet column order.
const S1 = 'Semi 1', S2 = 'Semi 2', F = 'Final', SG = 'Single round';
export const SCHEDULE = [
  ['2026-10-14', '', '', 'Event', 'Opening Ceremony'],
  ['2026-10-15', '22:30', '23:30', 'Sport', 'BGMI', SG],
  ['2026-10-15', '23:30', '00:00', 'Sport', 'FIFA', S1, 'G', 'S'],
  ['2026-10-15', '00:00', '00:30', 'Sport', 'FIFA', S2, 'R', 'H'],
  ['2026-10-15', '00:30', '01:00', 'Sport', 'FIFA', F],
  ['2026-10-16', '', '', 'Event', 'Khula Aasmaan'],
  ['2026-10-17', '', '', 'Event', 'Ethnic Day'],
  ['2026-10-18', '22:30', '23:30', 'Sport', 'Pickleball', S2, 'G', 'S'],
  ['2026-10-18', '23:30', '00:30', 'Sport', 'Badminton', S1, 'G', 'R'],
  ['2026-10-18', '00:30', '01:30', 'Sport', 'Badminton', S2, 'S', 'H'],
  ['2026-10-19', '', '', 'Event', 'Oorja'],
  ['2026-10-20', '21:30', '22:30', 'Sport', 'Pickleball', S1, 'R', 'H'],
  ['2026-10-20', '22:30', '23:00', 'Sport', 'Dodgeball', S1, 'S', 'H'],
  ['2026-10-20', '23:00', '23:30', 'Sport', 'Dodgeball', S2, 'G', 'R'],
  ['2026-10-20', '00:00', '01:00', 'Sport', 'Volleyball Men', S2, 'G', 'S'],
  ['2026-10-20', '01:00', '02:00', 'Sport', 'Volleyball Women', S2, 'G', 'S'],
  ['2026-10-21', '06:00', '', 'Sport', 'Cricket', S1, 'S', 'G'],
  ['2026-10-21', '22:30', '23:30', 'Sport', 'Football Women', S2, 'G', 'S'],
  ['2026-10-21', '23:30', '00:30', 'Sport', 'Football Men', S1, 'R', 'S'],
  ['2026-10-21', '00:30', '01:30', 'Sport', 'Volleyball Women', S1, 'H', 'R'],
  ['2026-10-21', '01:30', '02:30', 'Sport', 'Volleyball Men', S1, 'H', 'R'],
  ['2026-10-22', '06:00', '', 'Sport', 'Cricket', S2, 'R', 'H'],
  ['2026-10-22', '22:30', '23:30', 'Sport', 'Football Women', S1, 'R', 'H'],
  ['2026-10-22', '23:30', '00:30', 'Sport', 'Football Men', S2, 'G', 'H'],
  ['2026-10-22', '00:30', '01:00', 'Sport', 'Chess', S1, 'S', 'G'],
  ['2026-10-22', '01:00', '01:30', 'Sport', 'Chess', S2, 'R', 'H'],
  ['2026-10-22', '01:30', '02:30', 'Sport', 'Volleyball Men', F],
  ['2026-10-23', '22:30', '23:30', 'Sport', 'Basketball Women', S1, 'H', 'G'],
  ['2026-10-23', '23:30', '00:30', 'Sport', 'Basketball Men', S2, 'G', 'H'],
  ['2026-10-23', '00:30', '01:30', 'Sport', 'Volleyball Women', F],
  ['2026-10-23', '01:30', '02:30', 'Sport', 'Table Tennis', S1, 'G', 'S'],
  ['2026-10-24', '06:00', '', 'Sport', 'Cricket', F],
  ['2026-10-24', '21:30', '00:30', 'Event', 'Litfest'],
  ['2026-10-24', '00:30', '02:30', 'Sport', 'Poker', SG],
  ['2026-10-25', '', '', 'Event', 'Litfest'],
  ['2026-10-26', '23:00', '00:00', 'Sport', 'Table Tennis', S2, 'R', 'H'],
  ['2026-10-26', '00:00', '01:00', 'Sport', 'Basketball Men', S1, 'R', 'S'],
  ['2026-10-26', '01:00', '02:00', 'Sport', 'Basketball Women', S2, 'R', 'S'],
  ['2026-10-27', '', '', 'Event', 'Date Night'],
  ['2026-10-28', '23:00', '00:00', 'Sport', 'Frisbee', S1, 'G', 'H'],
  ['2026-10-28', '00:00', '01:00', 'Sport', 'Frisbee', S2, 'R', 'S'],
  ['2026-10-28', '01:00', '02:00', 'Sport', 'Lawn Tennis', S1, 'G', 'S'],
  ['2026-10-29', '23:00', '23:30', 'Sport', 'Relay Women', SG],
  ['2026-10-29', '23:30', '00:00', 'Sport', 'Relay Men', SG],
  ['2026-10-29', '00:00', '01:00', 'Sport', 'Table Tennis', F],
  ['2026-10-29', '01:00', '02:00', 'Sport', 'Lawn Tennis', S2, 'R', 'H'],
  ['2026-10-30', '23:00', '00:00', 'Sport', 'Football Men', F],
  ['2026-10-30', '00:00', '00:30', 'Sport', 'Dodgeball', F],
  ['2026-10-30', '00:30', '01:00', 'Sport', 'Shot Put Men', SG],
  ['2026-10-30', '01:00', '01:30', 'Sport', 'Shot Put Women', SG],
  ['2026-10-30', '01:30', '02:00', 'Sport', 'Chess', F],
  ['2026-10-31', '23:00', '00:00', 'Sport', 'Football Women', F],
  ['2026-10-31', '00:00', '01:00', 'Sport', 'Lawn Tennis', F],
  ['2026-10-31', '01:00', '02:00', 'Sport', 'Basketball Men', F],
  ['2026-11-01', '23:00', '00:00', 'Sport', 'Basketball Women', F],
  ['2026-11-01', '00:30', '01:30', 'Sport', 'Pickleball', F],
  ['2026-11-02', '23:00', '00:00', 'Sport', 'Frisbee', F],
  ['2026-11-02', '00:30', '01:30', 'Sport', 'Badminton', F],
];
