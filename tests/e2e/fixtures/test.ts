import { test as base, expect } from '@playwright/test';
import type { Tournament } from '../../../src/lib/bracket';
import { STORAGE_KEY } from '../../../src/lib/storage';
import { BracketPage } from '../pages/BracketPage';
import { CreateTournamentPage } from '../pages/CreateTournamentPage';
import { HomePage } from '../pages/HomePage';

interface Fixtures {
  homePage: HomePage;
  createPage: CreateTournamentPage;
  bracketPage: BracketPage;
  /** Puts tournaments straight into localStorage before the app loads (skips UI setup). */
  seedTournaments: (tournaments: Tournament[]) => Promise<void>;
  /** Writes any raw string into storage, e.g. to simulate corrupted data. */
  seedRawStorage: (raw: string) => Promise<void>;
}

/**
 * The init script runs before every page load. A sessionStorage flag makes it
 * seed only once, so page.reload() still shows what the app itself saved.
 */
async function seed(page: import('@playwright/test').Page, raw: string) {
  await page.addInitScript(
    ([key, value]) => {
      if (!window.sessionStorage.getItem('__e2e_seeded')) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.setItem('__e2e_seeded', '1');
      }
    },
    [STORAGE_KEY, raw] as const,
  );
}

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  createPage: async ({ page }, use) => use(new CreateTournamentPage(page)),
  bracketPage: async ({ page }, use) => use(new BracketPage(page)),
  seedTournaments: async ({ page }, use) => {
    await use((tournaments) => seed(page, JSON.stringify(tournaments)));
  },
  seedRawStorage: async ({ page }, use) => {
    await use((raw) => seed(page, raw));
  },
});

export { expect };
