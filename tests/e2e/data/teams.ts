/** Test data: realistic team names (not "Team 1") so failures read like real bugs. */
export const PH_TEAMS = [
  'Manila Mavericks',
  'Cebu Cyclones',
  'Davao Dragons',
  'Baguio Blizzards',
  'Iloilo Inferno',
  'Tarlac Titans',
  'Pampanga Phantoms',
  'Bicol Volcanoes',
  'Zamboanga Sharks',
  'Laguna Lynx',
  'Batangas Bulls',
  'Palawan Pythons',
  'Bohol Barracudas',
  'Cavite Comets',
  'Rizal Rangers',
  'Ilocos Invaders',
];

/** First n team names. Beyond the named list, falls back to "Squad 17", "Squad 18"... */
export function teamNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => PH_TEAMS[i] ?? `Squad ${i + 1}`);
}
