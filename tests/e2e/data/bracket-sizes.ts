/**
 * Data-driven cases for bracket generation. Each row becomes its own test.
 * Picked to cover: the minimum, odd counts, exact powers of two, and counts
 * just above a power of two (the worst case for byes).
 */
export interface BracketSizeCase {
  teams: number;
  rounds: number;
  byes: number;
  roundTitles: string[];
}

export const BRACKET_SIZES: BracketSizeCase[] = [
  { teams: 2, rounds: 1, byes: 0, roundTitles: ['Final'] },
  { teams: 3, rounds: 2, byes: 1, roundTitles: ['Semifinals', 'Final'] },
  { teams: 5, rounds: 3, byes: 3, roundTitles: ['Quarterfinals', 'Semifinals', 'Final'] },
  { teams: 8, rounds: 3, byes: 0, roundTitles: ['Quarterfinals', 'Semifinals', 'Final'] },
  { teams: 12, rounds: 4, byes: 4, roundTitles: ['Round 1', 'Quarterfinals', 'Semifinals', 'Final'] },
  { teams: 17, rounds: 5, byes: 15, roundTitles: ['Round 1', 'Round 2', 'Quarterfinals', 'Semifinals', 'Final'] },
];
