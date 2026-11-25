/** Negative test data for the create form: input → the error the user must see. */
export interface InvalidInputCase {
  title: string;
  name: string;
  teams: string;
  expectedErrors: string[];
}

export const INVALID_INPUTS: InvalidInputCase[] = [
  {
    title: 'empty form',
    name: '',
    teams: '',
    expectedErrors: ['Tournament name is required.', 'Add at least 2 teams.'],
  },
  {
    title: 'whitespace-only name',
    name: '    ',
    teams: 'Alpha\nBravo',
    expectedErrors: ['Tournament name is required.'],
  },
  {
    title: 'only one team',
    name: 'Solo Cup',
    teams: 'Lonely Lions',
    expectedErrors: ['Add at least 2 teams.'],
  },
  {
    title: 'duplicate team names with different casing and spaces',
    name: 'Dupes Cup',
    teams: 'Cebu Cyclones\n  cebu cyclones  \nDavao Dragons',
    expectedErrors: ['Duplicate team name: "cebu cyclones".'],
  },
  {
    title: 'team name over 30 characters',
    name: 'Long Names Cup',
    teams: `Alpha\n${'X'.repeat(31)}`,
    expectedErrors: [`Team name is too long (max 30 characters): "${'X'.repeat(31)}".`],
  },
  {
    title: 'tournament name over 50 characters',
    name: 'N'.repeat(51),
    teams: 'Alpha\nBravo',
    expectedErrors: ['Tournament name must be 50 characters or fewer.'],
  },
];
