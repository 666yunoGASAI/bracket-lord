/**
 * Bracket Lord — core tournament logic.
 *
 * Pure functions only (no DOM, no storage), so every rule here can be
 * unit-tested and property-tested in isolation from the UI.
 *
 * Format: single elimination with standard seeding.
 *  - Bracket size is the next power of two above the team count.
 *  - Empty slots become byes, and byes always go to the top seeds.
 *  - Seeds 1 and 2 are placed in opposite halves so they can only meet in the final.
 */

export type Side = 'A' | 'B';
export type SeedingMode = 'as-entered' | 'random';

export interface Team {
  id: string;
  name: string;
  seed: number;
}

export interface Match {
  id: string;
  round: number;
  /** 0-based position of the match within its round. */
  index: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | null;
  bye: boolean;
  forfeitBy: Side | null;
}

export interface Tournament {
  id: string;
  name: string;
  createdAt: string;
  teams: Team[];
  rounds: number;
  matches: Match[];
}

export interface CreateTournamentInput {
  name: string;
  teamNames: string[];
  seeding?: SeedingMode;
  /** Makes random seeding reproducible (tests, replays). */
  randomSeed?: number;
  id?: string;
  now?: Date;
}

/** Result of any change to a tournament. `cleared` counts later results wiped by a cascade. */
export interface UpdateResult {
  tournament: Tournament;
  cleared: number;
}

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 64;
export const MAX_TEAM_NAME_LENGTH = 30;
export const MAX_TOURNAMENT_NAME_LENGTH = 50;
export const MAX_SCORE = 999;

export class BracketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BracketError';
  }
}

export class ValidationError extends BracketError {
  constructor(public readonly errors: string[]) {
    super(errors.join(' '));
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard bracket order for a power-of-two size.
 * size 8 → [1, 8, 4, 5, 2, 7, 3, 6], read in pairs: 1v8, 4v5, 2v7, 3v6.
 */
export function seedPositions(size: number): number[] {
  if (size < 2 || (size & (size - 1)) !== 0) {
    throw new BracketError(`Bracket size must be a power of two ≥ 2, got ${size}.`);
  }
  let order = [1, 2];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

/** Splits a textarea value into team names: one per line, trimmed, blank lines ignored. */
export function parseTeamList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Deterministic PRNG (mulberry32) so random seeding can be reproduced. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function matchId(round: number, index: number): string {
  return `r${round}-m${index + 1}`;
}

export function roundName(round: number, rounds: number): string {
  if (round === rounds) return 'Final';
  if (round === rounds - 1) return 'Semifinals';
  if (round === rounds - 2) return 'Quarterfinals';
  return `Round ${round}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateTournamentInput(name: string, teamNames: string[]): string[] {
  const errors: string[] = [];
  const trimmedName = name.trim();
  const teams = teamNames.map((t) => t.trim()).filter((t) => t.length > 0);

  if (trimmedName.length === 0) {
    errors.push('Tournament name is required.');
  } else if (trimmedName.length > MAX_TOURNAMENT_NAME_LENGTH) {
    errors.push(`Tournament name must be ${MAX_TOURNAMENT_NAME_LENGTH} characters or fewer.`);
  }

  if (teams.length < MIN_TEAMS) {
    errors.push(`Add at least ${MIN_TEAMS} teams.`);
  } else if (teams.length > MAX_TEAMS) {
    errors.push(`A tournament can have at most ${MAX_TEAMS} teams.`);
  }

  for (const team of teams) {
    if (team.length > MAX_TEAM_NAME_LENGTH) {
      errors.push(`Team name is too long (max ${MAX_TEAM_NAME_LENGTH} characters): "${team}".`);
    }
  }

  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const team of teams) {
    const key = team.toLowerCase();
    if (seen.has(key) && !reported.has(key)) {
      errors.push(`Duplicate team name: "${team}".`);
      reported.add(key);
    }
    seen.add(key);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function createTournament(input: CreateTournamentInput): Tournament {
  const errors = validateTournamentInput(input.name, input.teamNames);
  if (errors.length > 0) throw new ValidationError(errors);

  const cleanNames = input.teamNames.map((t) => t.trim()).filter((t) => t.length > 0);
  const ordered =
    input.seeding === 'random'
      ? shuffle(cleanNames, input.randomSeed ?? Date.now())
      : cleanNames;

  const teams: Team[] = ordered.map((name, i) => ({ id: `team-${i + 1}`, name, seed: i + 1 }));
  const size = nextPowerOfTwo(teams.length);
  const rounds = Math.log2(size);
  const positions = seedPositions(size);
  const idBySeed = new Map(teams.map((t) => [t.seed, t.id]));

  const matches: Match[] = [];
  for (let i = 0; i < size / 2; i++) {
    const teamA = idBySeed.get(positions[2 * i]) ?? null;
    const teamB = idBySeed.get(positions[2 * i + 1]) ?? null;
    const bye = teamA === null || teamB === null;
    matches.push({
      id: matchId(1, i),
      round: 1,
      index: i,
      teamA,
      teamB,
      scoreA: null,
      scoreB: null,
      winner: bye ? (teamA ?? teamB) : null,
      bye,
      forfeitBy: null,
    });
  }
  for (let round = 2; round <= rounds; round++) {
    const count = size / 2 ** round;
    for (let i = 0; i < count; i++) {
      matches.push(emptyMatch(round, i));
    }
  }

  const tournament: Tournament = {
    id: input.id ?? `t-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name.trim(),
    createdAt: (input.now ?? new Date()).toISOString(),
    teams,
    rounds,
    matches,
  };
  return propagate(tournament).tournament;
}

function emptyMatch(round: number, index: number): Match {
  return {
    id: matchId(round, index),
    round,
    index,
    teamA: null,
    teamB: null,
    scoreA: null,
    scoreB: null,
    winner: null,
    bye: false,
    forfeitBy: null,
  };
}

// ---------------------------------------------------------------------------
// Advancement
// ---------------------------------------------------------------------------

/**
 * Moves winners forward round by round. If a later match's participants
 * no longer match its feeders (because an earlier result was edited),
 * that match's result is wiped. This is what makes edits cascade safely.
 */
function propagate(t: Tournament): UpdateResult {
  const matches = t.matches.map((m) => ({ ...m }));
  const byId = new Map(matches.map((m) => [m.id, m]));
  let cleared = 0;

  for (let round = 2; round <= t.rounds; round++) {
    for (const m of matches.filter((x) => x.round === round)) {
      const feederA = byId.get(matchId(round - 1, m.index * 2))!;
      const feederB = byId.get(matchId(round - 1, m.index * 2 + 1))!;
      const a = feederA.winner;
      const b = feederB.winner;
      if (a !== m.teamA || b !== m.teamB) {
        if (m.winner !== null) cleared++;
        m.teamA = a;
        m.teamB = b;
        m.scoreA = null;
        m.scoreB = null;
        m.winner = null;
        m.forfeitBy = null;
      }
    }
  }
  return { tournament: { ...t, matches }, cleared };
}

function requirePlayableMatch(t: Tournament, id: string): Match {
  const match = t.matches.find((m) => m.id === id);
  if (!match) throw new BracketError(`Match ${id} not found.`);
  if (match.bye) throw new BracketError('Byes do not have results.');
  if (match.teamA === null || match.teamB === null) {
    throw new BracketError('Both teams must be decided before reporting a result.');
  }
  return match;
}

function withMatch(t: Tournament, id: string, patch: Partial<Match>): Tournament {
  return { ...t, matches: t.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
}

export function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SCORE;
}

export function reportResult(t: Tournament, id: string, scoreA: number, scoreB: number): UpdateResult {
  const match = requirePlayableMatch(t, id);
  if (!isValidScore(scoreA) || !isValidScore(scoreB)) {
    throw new BracketError(`Scores must be whole numbers between 0 and ${MAX_SCORE}.`);
  }
  if (scoreA === scoreB) {
    throw new BracketError('Matches cannot end in a draw. Enter the tiebreaker result.');
  }
  const winner = scoreA > scoreB ? match.teamA : match.teamB;
  return propagate(withMatch(t, id, { scoreA, scoreB, winner, forfeitBy: null }));
}

export function recordForfeit(t: Tournament, id: string, forfeitBy: Side): UpdateResult {
  const match = requirePlayableMatch(t, id);
  const winner = forfeitBy === 'A' ? match.teamB : match.teamA;
  return propagate(withMatch(t, id, { scoreA: null, scoreB: null, winner, forfeitBy }));
}

export function clearResult(t: Tournament, id: string): UpdateResult {
  requirePlayableMatch(t, id);
  return propagate(
    withMatch(t, id, { scoreA: null, scoreB: null, winner: null, forfeitBy: null }),
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getTeam(t: Tournament, id: string | null): Team | undefined {
  return id === null ? undefined : t.teams.find((team) => team.id === id);
}

export function getFinal(t: Tournament): Match {
  return t.matches.find((m) => m.round === t.rounds)!;
}

export function getChampion(t: Tournament): Team | undefined {
  return getTeam(t, getFinal(t).winner);
}

export function matchesInRound(t: Tournament, round: number): Match[] {
  return t.matches.filter((m) => m.round === round).sort((a, b) => a.index - b.index);
}

export function countByes(t: Tournament): number {
  return t.matches.filter((m) => m.bye).length;
}

/** How many real (non-bye) matches have a result, out of how many exist. */
export function matchProgress(t: Tournament): { played: number; total: number } {
  const real = t.matches.filter((m) => !m.bye);
  return { played: real.filter((m) => m.winner !== null).length, total: real.length };
}

/** Preview numbers for the create form: "8 teams · 3 rounds · 0 byes". */
export function bracketSummary(teamCount: number): { rounds: number; byes: number } {
  if (teamCount < MIN_TEAMS) return { rounds: 0, byes: 0 };
  const size = nextPowerOfTwo(teamCount);
  return { rounds: Math.log2(size), byes: size - teamCount };
}
