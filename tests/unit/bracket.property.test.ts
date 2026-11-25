/**
 * Property-based tests: instead of hand-picking examples, fast-check generates
 * hundreds of random tournaments (2–64 teams, random results) and checks that
 * rules which must ALWAYS hold actually do. When one fails, fast-check shrinks
 * it to the smallest failing case.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createTournament,
  getChampion,
  matchesInRound,
  nextPowerOfTwo,
  reportResult,
  type Tournament,
} from '../../src/lib/bracket';

const teamCount = fc.integer({ min: 2, max: 64 });
const build = (n: number) =>
  createTournament({ name: 'Prop Cup', teamNames: Array.from({ length: n }, (_, i) => `T${i + 1}`) });

/** Plays every match round by round, choosing winners from the given coin flips. */
function playAll(t: Tournament, flips: boolean[]): Tournament {
  let k = 0;
  for (let round = 1; round <= t.rounds; round++) {
    for (const m of matchesInRound(t, round)) {
      if (m.bye) continue;
      const aWins = flips[k++ % flips.length];
      t = reportResult(t, m.id, aWins ? 2 : 0, aWins ? 0 : 2).tournament;
    }
  }
  return t;
}

describe('bracket invariants (property-based)', () => {
  it('has bracket size − 1 matches and log2(size) rounds', () => {
    fc.assert(
      fc.property(teamCount, (n) => {
        const t = build(n);
        const size = nextPowerOfTwo(n);
        expect(t.matches).toHaveLength(size - 1);
        expect(t.rounds).toBe(Math.log2(size));
      }),
    );
  });

  it('places every team exactly once in round 1 and never pairs two byes', () => {
    fc.assert(
      fc.property(teamCount, (n) => {
        const t = build(n);
        const r1 = matchesInRound(t, 1);
        const ids = r1.flatMap((m) => [m.teamA, m.teamB]).filter((x) => x !== null);
        expect(new Set(ids).size).toBe(n);
        expect(ids).toHaveLength(n);
        expect(r1.every((m) => m.teamA !== null || m.teamB !== null)).toBe(true);
      }),
    );
  });

  it('gives all byes to the highest seeds', () => {
    fc.assert(
      fc.property(teamCount, (n) => {
        const t = build(n);
        const byeSeeds = t.matches
          .filter((m) => m.bye)
          .map((m) => t.teams.find((team) => team.id === m.winner)!.seed)
          .sort((a, b) => a - b);
        const expected = Array.from({ length: nextPowerOfTwo(n) - n }, (_, i) => i + 1);
        expect(byeSeeds).toEqual(expected);
      }),
    );
  });

  it('keeps seeds 1 and 2 in opposite halves (they can only meet in the final)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 64 }), (n) => {
        const t = build(n);
        const r1 = matchesInRound(t, 1);
        const half = r1.length / 2;
        const position = (seed: number) =>
          r1.findIndex((m) => [m.teamA, m.teamB].includes(`team-${seed}`));
        expect(position(1) < half).not.toBe(position(2) < half);
      }),
    );
  });

  it('any complete set of results produces exactly one champion after n − 1 played matches', () => {
    fc.assert(
      fc.property(teamCount, fc.array(fc.boolean(), { minLength: 1, maxLength: 70 }), (n, flips) => {
        const t = playAll(build(n), flips);
        const played = t.matches.filter((m) => !m.bye && m.winner !== null);
        expect(played).toHaveLength(n - 1);
        expect(getChampion(t)).toBeDefined();

        // Every team except the champion loses exactly once.
        const losses = new Map<string, number>();
        for (const m of played) {
          const loser = m.winner === m.teamA ? m.teamB! : m.teamA!;
          losses.set(loser, (losses.get(loser) ?? 0) + 1);
        }
        expect(losses.size).toBe(n - 1);
        expect([...losses.values()].every((count) => count === 1)).toBe(true);
        expect(losses.has(getChampion(t)!.id)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('after editing any round-1 result, every later match still contains its feeders’ winners', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 32 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 40 }),
        fc.nat(),
        (n, flips, pick) => {
          let t = playAll(build(n), flips);
          const playable = matchesInRound(t, 1).filter((m) => !m.bye);
          const target = playable[pick % playable.length];
          const aWon = target.winner === target.teamA;
          t = reportResult(t, target.id, aWon ? 0 : 3, aWon ? 3 : 0).tournament;

          const byId = new Map(t.matches.map((m) => [m.id, m]));
          for (const m of t.matches.filter((x) => x.round > 1)) {
            const feederA = byId.get(`r${m.round - 1}-m${m.index * 2 + 1}`)!;
            const feederB = byId.get(`r${m.round - 1}-m${m.index * 2 + 2}`)!;
            expect(m.teamA).toBe(feederA.winner);
            expect(m.teamB).toBe(feederB.winner);
            if (m.winner !== null) expect([m.teamA, m.teamB]).toContain(m.winner);
          }
        },
      ),
    );
  });
});
