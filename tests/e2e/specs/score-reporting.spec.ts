import { test, expect } from '../fixtures/test';
import { aTournament } from '../data/builders';

// 4-team bracket: r1-m1 = Manila Mavericks (1) vs Baguio Blizzards (4)
//                 r1-m2 = Cebu Cyclones (2)   vs Davao Dragons (3)
test.describe('Score reporting', () => {
  test.beforeEach(async ({ seedTournaments, bracketPage }) => {
    const tournament = aTournament({ name: 'Visayas Open', teams: 4 });
    await seedTournaments([tournament]);
    await bracketPage.goto(tournament.id);
  });

  test('reporting a result advances the winner @smoke', async ({ bracketPage }) => {
    await bracketPage.reportResult('r1-m1', 13, 9);

    const match = bracketPage.match('r1-m1');
    await expect(match.winnerName()).toHaveText('Manila Mavericks');
    await expect(match.score('A')).toHaveText('13');
    await expect(match.score('B')).toHaveText('9');
    await expect(bracketPage.match('r2-m1').teamName('A')).toHaveText('Manila Mavericks');
    await expect(bracketPage.toast).toHaveText('Result saved.');
  });

  test('playing every match crowns a champion @smoke', async ({ bracketPage, homePage }) => {
    await bracketPage.reportResult('r1-m1', 2, 1);
    await bracketPage.reportResult('r1-m2', 0, 2); // upset: Davao beats Cebu
    await expect(bracketPage.championBanner).toBeHidden();
    await bracketPage.reportResult('r2-m1', 1, 3);

    await expect(bracketPage.championBanner).toHaveText(/Champion: Davao Dragons/);

    await homePage.goto();
    await expect(homePage.card('Visayas Open')).toContainText('Champion: Davao Dragons');
  });

  test('the dialog names the round and both teams', async ({ bracketPage }) => {
    await bracketPage.match('r1-m2').reportButton.click();
    await expect(bracketPage.dialog.heading).toHaveText('Report result · Semifinals, Match 2');
    await expect(bracketPage.dialog.scoreInput('Cebu Cyclones')).toBeVisible();
    await expect(bracketPage.dialog.scoreInput('Davao Dragons')).toBeVisible();
  });

  const invalidScores = [
    { title: 'a draw', a: '5', b: '5', error: 'Matches cannot end in a draw. Enter the tiebreaker result.' },
    { title: 'a missing score', a: '3', b: '', error: 'Enter a score for both teams.' },
    { title: 'a negative score', a: '-1', b: '2', error: 'Scores must be whole numbers between 0 and 999.' },
    { title: 'a decimal score', a: '2.5', b: '1', error: 'Scores must be whole numbers between 0 and 999.' },
    { title: 'a score above 999', a: '1000', b: '1', error: 'Scores must be whole numbers between 0 and 999.' },
  ];

  for (const { title, a, b, error } of invalidScores) {
    test(`rejects ${title}`, async ({ bracketPage }) => {
      await bracketPage.match('r1-m1').reportButton.click();
      await bracketPage.dialog.enterScores('Manila Mavericks', a, 'Baguio Blizzards', b);
      await bracketPage.dialog.saveButton.click();

      await expect(bracketPage.dialog.error).toHaveText(error);
      await expect(bracketPage.dialog.root).toBeVisible();
      await expect(bracketPage.match('r1-m1').winnerSlot).toHaveCount(0);
    });
  }

  test('a forfeit awards the match to the opponent', async ({ bracketPage }) => {
    await bracketPage.match('r1-m1').reportButton.click();
    await bracketPage.dialog.forfeit('Manila Mavericks');

    const match = bracketPage.match('r1-m1');
    await expect(match.winnerName()).toHaveText('Baguio Blizzards');
    await expect(match.score('A')).toHaveText('FF');
    await expect(bracketPage.toast).toHaveText('Forfeit recorded.');
  });

  test('cancel and Escape both close the dialog without saving', async ({ page, bracketPage }) => {
    const match = bracketPage.match('r1-m1');

    await match.reportButton.click();
    await bracketPage.dialog.enterScores('Manila Mavericks', 2, 'Baguio Blizzards', 0);
    await bracketPage.dialog.cancelButton.click();
    await expect(bracketPage.dialog.root).toBeHidden();

    await match.reportButton.click();
    await bracketPage.dialog.enterScores('Manila Mavericks', 2, 'Baguio Blizzards', 0);
    await page.keyboard.press('Escape');
    await expect(bracketPage.dialog.root).toBeHidden();

    await expect(match.winnerSlot).toHaveCount(0);
    await expect(match.reportButton).toBeVisible();
  });
});
