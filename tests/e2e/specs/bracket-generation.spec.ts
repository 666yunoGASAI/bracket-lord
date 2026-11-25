import { test, expect } from '../fixtures/test';
import { BRACKET_SIZES } from '../data/bracket-sizes';
import { aTournament } from '../data/builders';

test.describe('Bracket generation', () => {
  for (const size of BRACKET_SIZES) {
    test(`${size.teams} teams → ${size.rounds} rounds, ${size.byes} byes`, async ({ seedTournaments, bracketPage }) => {
      const tournament = aTournament({ teams: size.teams });
      await seedTournaments([tournament]);
      await bracketPage.goto(tournament.id);

      await expect(bracketPage.rounds).toHaveCount(size.rounds);
      await expect(bracketPage.roundTitles).toHaveText(size.roundTitles);
      await expect(bracketPage.byeNotes).toHaveCount(size.byes);

      // Seed 1 always opens against the lowest seed (or a bye).
      const opener = bracketPage.match('r1-m1');
      await expect(opener.slotA.getByText('1', { exact: true })).toBeVisible();
    });
  }

  test('top seeds get the byes and are already waiting in round 2', async ({ seedTournaments, bracketPage }) => {
    const tournament = aTournament({ teams: 6 });
    await seedTournaments([tournament]);
    await bracketPage.goto(tournament.id);

    await expect(bracketPage.match('r1-m1').byeNote).toHaveText('Manila Mavericks advances on a bye');
    await expect(bracketPage.match('r2-m1').teamName('A')).toHaveText('Manila Mavericks');
    await expect(bracketPage.match('r1-m1').reportButton).toBeHidden();
  });

  test('later-round matches show TBD until teams are decided', async ({ seedTournaments, bracketPage }) => {
    const tournament = aTournament({ teams: 8 });
    await seedTournaments([tournament]);
    await bracketPage.goto(tournament.id);

    const final = bracketPage.match('r3-m1');
    await expect(final.teamName('A')).toHaveText('TBD');
    await expect(final.teamName('B')).toHaveText('TBD');
    await expect(final.reportButton).toBeHidden();
  });
});
