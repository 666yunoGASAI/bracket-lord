import { describe, expect, it } from 'vitest';
import {
  BracketError,
  ValidationError,
  bracketSummary,
  clearResult,
  createTournament,
  getChampion,
  getTeam,
  matchProgress,
  matchesInRound,
  parseTeamList,
  recordForfeit,
  reportResult,
  roundName,
  seedPositions,
  validateTournamentInput,
  type Tournament,
} from '../../src/lib/bracket';

const teams = (n: number) => Array.from({ length: n }, (_, i) => `Team ${i + 1}`);
const make = (n: number) => createTournament({ name: 'Test Cup', teamNames: teams(n), id: 't-test' });
const match = (t: Tournament, id: string) => t.matches.find((m) => m.id === id)!;
const nameOf = (t: Tournament, id: string | null) => getTeam(t, id)?.name;

describe('seedPositions', () => {
  it('pairs top seeds with bottom seeds in an 8-team bracket', () => {
    expect(seedPositions(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it('rejects sizes that are not powers of two', () => {
    expect(() => seedPositions(6)).toThrow(BracketError);
    expect(() => seedPositions(1)).toThrow(BracketError);
  });
});

describe('parseTeamList', () => {
  it('trims names and ignores blank lines (including Windows line endings)', () => {
    expect(parseTeamList('  Alpha \r\n\r\nBravo\n   \nCharlie  ')).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});

describe('validateTournamentInput', () => {
  it('accepts a valid tournament', () => {
    expect(validateTournamentInput('Luzon Cup', teams(8))).toEqual([]);
  });

  it.each([
    { name: '', list: teams(4), error: 'Tournament name is required.' },
    { name: '   ', list: teams(4), error: 'Tournament name is required.' },
    { name: 'x'.repeat(51), list: teams(4), error: 'Tournament name must be 50 characters or fewer.' },
    { name: 'Cup', list: ['Solo'], error: 'Add at least 2 teams.' },
    { name: 'Cup', list: teams(65), error: 'A tournament can have at most 64 teams.' },
    { name: 'Cup', list: ['Alpha', 'alpha '], error: 'Duplicate team name: "alpha".' },
    { name: 'Cup', list: ['Alpha', 'B'.repeat(31)], error: `Team name is too long (max 30 characters): "${'B'.repeat(31)}".` },
  ])('reports "$error"', ({ name, list, error }) => {
    expect(validateTournamentInput(name, list)).toContain(error);
  });

  it('accepts the exact boundaries: 2 teams, 64 teams, 30-char names, 50-char title', () => {
    expect(validateTournamentInput('x'.repeat(50), teams(2))).toEqual([]);
    expect(validateTournamentInput('Cup', teams(64))).toEqual([]);
    expect(validateTournamentInput('Cup', ['A'.repeat(30), 'B'])).toEqual([]);
  });

  it('reports each duplicate only once', () => {
    const errors = validateTournamentInput('Cup', ['A', 'a', 'A', 'B']);
    expect(errors.filter((e) => e.startsWith('Duplicate'))).toHaveLength(1);
  });
});

describe('createTournament', () => {
  it('throws a ValidationError listing every problem', () => {
    try {
      createTournament({ name: '', teamNames: ['Only one'] });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errors).toHaveLength(2);
    }
  });

  it('builds a full 8-team bracket with no byes', () => {
    const t = make(8);
    expect(t.rounds).toBe(3);
    expect(t.matches).toHaveLength(7);
    expect(t.matches.filter((m) => m.bye)).toHaveLength(0);
    const r1 = matchesInRound(t, 1).map((m) => [nameOf(t, m.teamA), nameOf(t, m.teamB)]);
    expect(r1[0]).toEqual(['Team 1', 'Team 8']);
  });

  it('gives byes to the top seeds and advances them automatically', () => {
    const t = make(6); // bracket of 8 → 2 byes
    const byes = t.matches.filter((m) => m.bye);
    expect(byes).toHaveLength(2);
    expect(byes.map((m) => nameOf(t, m.winner)).sort()).toEqual(['Team 1', 'Team 2']);
    // Seed 1 is already waiting in round 2.
    expect(nameOf(t, match(t, 'r2-m1').teamA)).toBe('Team 1');
  });

  it('handles the smallest tournament: 2 teams, final only', () => {
    const t = make(2);
    expect(t.rounds).toBe(1);
    expect(roundName(1, t.rounds)).toBe('Final');
  });

  it('random seeding is reproducible with the same seed and keeps every team', () => {
    const input = { name: 'Cup', teamNames: teams(8), seeding: 'random' as const, randomSeed: 42 };
    const a = createTournament(input);
    const b = createTournament(input);
    expect(a.teams.map((x) => x.name)).toEqual(b.teams.map((x) => x.name));
    expect(a.teams.map((x) => x.name).sort()).toEqual(teams(8).sort());
  });
});

describe('reportResult', () => {
  it('advances the winner into the next round', () => {
    const { tournament: t } = reportResult(make(4), 'r1-m1', 13, 7);
    expect(nameOf(t, match(t, 'r1-m1').winner)).toBe('Team 1');
    expect(nameOf(t, match(t, 'r2-m1').teamA)).toBe('Team 1');
  });

  it('crowns a champion when the final is played', () => {
    let t = make(4);
    t = reportResult(t, 'r1-m1', 2, 0).tournament;
    t = reportResult(t, 'r1-m2', 0, 2).tournament; // Team 3 upsets Team 2
    expect(getChampion(t)).toBeUndefined();
    t = reportResult(t, 'r2-m1', 1, 2).tournament;
    expect(getChampion(t)?.name).toBe('Team 3');
  });

  it.each([
    [5, 5, 'Matches cannot end in a draw'],
    [-1, 3, 'whole numbers'],
    [2.5, 1, 'whole numbers'],
    [1000, 1, 'whole numbers'],
    [Number.NaN, 1, 'whole numbers'],
  ])('rejects score %s–%s', (a, b, message) => {
    expect(() => reportResult(make(4), 'r1-m1', a, b)).toThrow(message);
  });

  it('refuses results for byes, undecided matches and unknown matches', () => {
    const t = make(6);
    const bye = t.matches.find((m) => m.bye)!;
    expect(() => reportResult(t, bye.id, 1, 0)).toThrow('Byes do not have results.');
    expect(() => reportResult(t, 'r3-m1', 1, 0)).toThrow('Both teams must be decided');
    expect(() => reportResult(t, 'r9-m9', 1, 0)).toThrow('not found');
  });

  it('does not mutate the original tournament', () => {
    const original = make(4);
    const snapshot = JSON.stringify(original);
    reportResult(original, 'r1-m1', 3, 1);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('editing results (cascade)', () => {
  function playedOut() {
    let t = make(4);
    t = reportResult(t, 'r1-m1', 2, 0).tournament; // Team 1
    t = reportResult(t, 'r1-m2', 2, 0).tournament; // Team 2
    t = reportResult(t, 'r2-m1', 2, 1).tournament; // Team 1 champion
    return t;
  }

  it('flipping an early winner clears the later result that depended on it', () => {
    const { tournament: t, cleared } = reportResult(playedOut(), 'r1-m1', 0, 2);
    expect(cleared).toBe(1);
    expect(nameOf(t, match(t, 'r2-m1').teamA)).toBe('Team 4');
    expect(match(t, 'r2-m1').winner).toBeNull();
    expect(getChampion(t)).toBeUndefined();
  });

  it('changing only the score (same winner) keeps later results', () => {
    const { tournament: t, cleared } = reportResult(playedOut(), 'r1-m1', 5, 0);
    expect(cleared).toBe(0);
    expect(getChampion(t)?.name).toBe('Team 1');
  });

  it('clearing a result empties the next slot and wipes dependent results', () => {
    const { tournament: t, cleared } = clearResult(playedOut(), 'r1-m2');
    expect(cleared).toBe(1);
    expect(match(t, 'r2-m1').teamB).toBeNull();
  });
});

describe('recordForfeit', () => {
  it('awards the match to the other team with no score', () => {
    const { tournament: t } = recordForfeit(make(4), 'r1-m1', 'A');
    const m = match(t, 'r1-m1');
    expect(nameOf(t, m.winner)).toBe('Team 4');
    expect(m.forfeitBy).toBe('A');
    expect(m.scoreA).toBeNull();
  });
});

describe('matchProgress', () => {
  it('counts only real matches (not byes) and how many are decided', () => {
    let t = make(6); // 8-slot bracket, 2 byes → 5 real matches
    expect(matchProgress(t)).toEqual({ played: 0, total: 5 });
    t = reportResult(t, 'r1-m2', 2, 0).tournament;
    expect(matchProgress(t)).toEqual({ played: 1, total: 5 });
  });
});

describe('bracketSummary', () => {
  it.each([
    [0, 0, 0],
    [1, 0, 0],
    [2, 1, 0],
    [5, 3, 3],
    [16, 4, 0],
    [17, 5, 15],
  ])('%i teams → %i rounds, %i byes', (n, rounds, byes) => {
    expect(bracketSummary(n)).toEqual({ rounds, byes });
  });
});
