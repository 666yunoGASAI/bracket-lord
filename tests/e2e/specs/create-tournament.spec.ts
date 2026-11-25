import { test, expect } from '../fixtures/test';
import { INVALID_INPUTS } from '../data/invalid-inputs';
import { teamNames } from '../data/teams';

test.describe('Create tournament', () => {
  test.beforeEach(async ({ createPage }) => {
    await createPage.goto();
  });

  test('creates a bracket and lists it on the home page @smoke', async ({ page, createPage, bracketPage, homePage }) => {
    await createPage.create('Luzon Invitational', teamNames(8));

    await expect(bracketPage.heading('Luzon Invitational')).toBeVisible();
    await expect(bracketPage.summary).toHaveText('8 teams · 3 rounds · 0 byes · Single elimination');

    await page.getByRole('link', { name: 'Bracket Lord home' }).click();
    await expect(homePage.card('Luzon Invitational')).toContainText('8 teams');
    await expect(homePage.card('Luzon Invitational')).toContainText('In progress');
  });

  test('sample teams button fills a ready-to-use list', async ({ createPage }) => {
    await createPage.sampleTeamsButton.click();
    await expect(createPage.preview).toHaveText('8 teams · 3 rounds · 0 byes');
  });

  test('preview updates live as teams are typed', async ({ createPage }) => {
    await expect(createPage.preview).toHaveText('0 teams · 0 rounds · 0 byes');
    await createPage.teamsInput.fill(teamNames(1).join('\n'));
    await expect(createPage.preview).toHaveText('1 team · 0 rounds · 0 byes');
    await createPage.teamsInput.fill(teamNames(5).join('\n'));
    await expect(createPage.preview).toHaveText('5 teams · 3 rounds · 3 byes');
  });

  test('ignores blank lines and surrounding spaces in the team list', async ({ createPage, bracketPage }) => {
    await createPage.create('Spacing Cup', '\n  Cebu Cyclones  \n\n\nDavao Dragons\n   \n');
    await expect(bracketPage.summary).toContainText('2 teams');
    await expect(bracketPage.match('r1-m1').teamName('A')).toHaveText('Cebu Cyclones');
  });

  test('random seeding still places every team in the bracket', async ({ createPage, bracketPage }) => {
    const teams = teamNames(8);
    await createPage.create('Shuffle Cup', teams, 'random');

    const placed = await bracketPage.matchesInRound(1).getByTestId('team-name').allInnerTexts();
    expect(placed.sort()).toEqual([...teams].sort());
  });

  test('cancel returns home without saving anything', async ({ createPage, homePage }) => {
    await createPage.fill('Never Saved Cup', teamNames(4));
    await createPage.cancelLink.click();
    await expect(homePage.heading).toBeVisible();
    await expect(homePage.emptyState).toBeVisible();
  });

  test.describe('validation', () => {
    for (const input of INVALID_INPUTS) {
      test(`shows errors for ${input.title}`, async ({ page, createPage }) => {
        await createPage.fill(input.name, input.teams);
        await createPage.createButton.click();

        await expect(createPage.errorItems()).toHaveText(input.expectedErrors);
        await expect(page).toHaveURL(/#\/new$/); // stayed on the form
      });
    }
  });
});
