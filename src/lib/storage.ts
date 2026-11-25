import type { Tournament } from './bracket';

/** All tournaments live in one localStorage key. Tests seed this key directly. */
export const STORAGE_KEY = 'bracket-lord:tournaments';

function isTournament(value: unknown): value is Tournament {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    Array.isArray(t.teams) &&
    Array.isArray(t.matches) &&
    typeof t.rounds === 'number'
  );
}

/** Never throws: corrupted or tampered storage falls back to an empty list. */
export function loadTournaments(): Tournament[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTournament) : [];
  } catch {
    return [];
  }
}

export function saveTournaments(list: Tournament[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the app keeps working for this session.
  }
}

export function getTournament(id: string): Tournament | undefined {
  return loadTournaments().find((t) => t.id === id);
}

export function upsertTournament(tournament: Tournament): void {
  const list = loadTournaments();
  const index = list.findIndex((t) => t.id === tournament.id);
  if (index === -1) list.unshift(tournament);
  else list[index] = tournament;
  saveTournaments(list);
}

export function deleteTournament(id: string): void {
  saveTournaments(loadTournaments().filter((t) => t.id !== id));
}
