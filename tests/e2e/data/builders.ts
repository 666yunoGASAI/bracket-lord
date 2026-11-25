/**
 * Test data builders. They reuse the app's own bracket logic to build
 * tournaments in any state (fresh, half-played, finished), so a test can start
 * at the exact point it cares about instead of clicking through setup each time.
 */
import {
  createTournament,
  matchesInRound,
  reportResult,
  type Tournament,
} from '../../../src/lib/bracket';
import { teamNames } from './teams';

let counter = 0;

export function aTournament(options: { name?: string; teams?: number } = {}): Tournament {
  counter += 1;
  return createTournament({
    id: `e2e-${counter}-${Math.random().toString(36).slice(2, 7)}`,
    name: options.name ?? `E2E Cup ${counter}`,
    teamNames: teamNames(options.teams ?? 4),
  });
}

/** Plays every match in order; the higher seed (team A) always wins 2–0. */
export function playedToCompletion(t: Tournament): Tournament {
  for (let round = 1; round <= t.rounds; round++) {
    for (const m of matchesInRound(t, round)) {
      if (!m.bye) t = reportResult(t, m.id, 2, 0).tournament;
    }
  }
  return t;
}
