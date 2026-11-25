import { test, expect } from '../fixtures/test';
import { aTournament } from '../data/builders';

test.describe('Persistence and navigation', () => {
  test('results survive a page reload @smoke', async ({ page, seedTournaments, bracketPage }) => {
    const tournament = aTournament({ teams: 4 });
    await seedTournaments([tournament]);
    await bracketPage.goto(tournament.id);

    await bracketPage.reportResult('r1-m1', 3, 1);
    await page.reload();

    await expect(bracketPage.match('r1-m1').winnerName()).toHaveText('Manila Mavericks');
    await expect(bracketPage.match('r2-m1').teamName('A')).toHaveText('Manila Mavericks');
  });

  test('lists several tournaments, newest first', async ({ seedTournaments, homePage }) => {
    await seedTournaments([aTournament({ name: 'Newest Cup' }), aTournament({ name: 'Older Cup' })]);
    await homePage.goto();

    await expect(homePage.tournamentCards).toHaveCount(2);
    await expect(homePage.tournamentCards.first()).toContainText('Newest Cup');
  });

  test('corrupted storage falls back to an empty list instead of crashing', async ({ seedRawStorage, homePage }) => {
    await seedRawStorage('{not valid json');
    await homePage.goto();

    await expect(homePage.heading).toBeVisible();
    await expect(homePage.emptyState).toBeVisible();
  });

  test('an unknown tournament link shows a not-found page', async ({ bracketPage }) => {
    await bracketPage.goto('does-not-exist');
    await expect(bracketPage.notFoundHeading).toBeVisible();
  });

  test('delete asks for confirmation, and "Keep it" cancels', async ({ seedTournaments, bracketPage, homePage }) => {
    const tournament = aTournament({ name: 'Doomed Cup' });
    await seedTournaments([tournament]);
    await bracketPage.goto(tournament.id);

    await bracketPage.deleteButton.click();
    await bracketPage.keepButton.click();
    await expect(bracketPage.heading('Doomed Cup')).toBeVisible();

    await bracketPage.deleteButton.click();
    await bracketPage.confirmDeleteButton.click();
    await expect(homePage.emptyState).toBeVisible();

    await bracketPage.goto(tournament.id);
    await expect(bracketPage.notFoundHeading).toBeVisible();
  });
});
