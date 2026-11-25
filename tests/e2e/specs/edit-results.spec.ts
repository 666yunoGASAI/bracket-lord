import { test, expect } from '../fixtures/test';
import { aTournament, playedToCompletion } from '../data/builders';

// Starts from a finished 4-team tournament: Manila Mavericks beat Cebu Cyclones in the final.
test.describe('Editing results', () => {
  test.beforeEach(async ({ seedTournaments, bracketPage }) => {
    const finished = playedToCompletion(aTournament({ teams: 4 }));
    await seedTournaments([finished]);
    await bracketPage.goto(finished.id);
    await expect(bracketPage.championBanner).toHaveText(/Manila Mavericks/);
  });

  test('flipping an early winner clears the results that depended on it', async ({ bracketPage }) => {
    await bracketPage.reportResult('r1-m1', 0, 2);

    await expect(bracketPage.toast).toHaveText(
      'Result saved. 1 later result was cleared because the winner changed.',
    );
    await expect(bracketPage.match('r2-m1').teamName('A')).toHaveText('Baguio Blizzards');
    await expect(bracketPage.match('r2-m1').winnerSlot).toHaveCount(0);
    await expect(bracketPage.championBanner).toBeHidden();
  });

  test('changing only the score keeps later results', async ({ bracketPage }) => {
    await bracketPage.reportResult('r1-m1', 9, 0);

    await expect(bracketPage.toast).toHaveText('Result saved.');
    await expect(bracketPage.match('r1-m1').score('A')).toHaveText('9');
    await expect(bracketPage.championBanner).toHaveText(/Manila Mavericks/);
  });

  test('clearing a result reopens the match and empties the next slot', async ({ bracketPage }) => {
    const match = bracketPage.match('r1-m2');
    await match.editButton.click();
    await bracketPage.dialog.clearButton.click();

    await expect(bracketPage.toast).toHaveText(
      'Result cleared. 1 later result was cleared because the winner changed.',
    );
    await expect(match.reportButton).toBeVisible();
    await expect(bracketPage.match('r2-m1').teamName('B')).toHaveText('TBD');
  });

  test('the edit dialog is pre-filled with the saved scores', async ({ bracketPage }) => {
    await bracketPage.match('r2-m1').editButton.click();
    await expect(bracketPage.dialog.scoreInput('Manila Mavericks')).toHaveValue('2');
    await expect(bracketPage.dialog.scoreInput('Cebu Cyclones')).toHaveValue('0');
  });
});
