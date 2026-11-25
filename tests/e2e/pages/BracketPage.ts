import { expect, type Locator, type Page } from '@playwright/test';
import { MatchCard } from './MatchCard';
import { ReportResultDialog } from './ReportResultDialog';

export class BracketPage {
  readonly summary: Locator;
  readonly rounds: Locator;
  readonly roundTitles: Locator;
  readonly championBanner: Locator;
  readonly byeNotes: Locator;
  readonly toast: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;
  readonly keepButton: Locator;
  readonly notFoundHeading: Locator;
  readonly dialog: ReportResultDialog;

  constructor(private readonly page: Page) {
    this.summary = page.getByText(/teams · \d+ rounds · \d+ byes/);
    this.rounds = page.getByTestId(/^round-\d+$/);
    this.roundTitles = page.getByTestId('bracket').getByRole('heading', { level: 2 });
    this.championBanner = page.getByTestId('champion-banner');
    this.byeNotes = page.getByText(/advances on a bye/);
    this.toast = page.getByTestId('toast');
    this.deleteButton = page.getByRole('button', { name: 'Delete tournament' });
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, delete' });
    this.keepButton = page.getByRole('button', { name: 'Keep it' });
    this.notFoundHeading = page.getByRole('heading', { name: 'Tournament not found' });
    this.dialog = new ReportResultDialog(page);
  }

  async goto(id: string) {
    await this.page.goto(`/#/t/${id}`);
  }

  heading(name: string): Locator {
    return this.page.getByRole('heading', { level: 1, name });
  }

  /** Match ids follow the pattern r{round}-m{number}, e.g. "r1-m1" or "r3-m1". */
  match(id: string): MatchCard {
    return new MatchCard(this.page.getByTestId(`match-${id}`));
  }

  matchesInRound(round: number): Locator {
    return this.page.getByTestId(`round-${round}`).getByTestId(/^match-/);
  }

  /** Opens the dialog for a match and saves a score. Team names are read from the card. */
  async reportResult(matchId: string, scoreA: number, scoreB: number) {
    const card = this.match(matchId);
    const teamA = (await card.teamName('A').innerText()).trim();
    const teamB = (await card.teamName('B').innerText()).trim();
    await card.root.getByRole('button', { name: /(Report|Edit) result/ }).click();
    await expect(this.dialog.root).toBeVisible();
    await this.dialog.enterScores(teamA, scoreA, teamB, scoreB);
    await this.dialog.saveButton.click();
    await expect(this.dialog.root).toBeHidden();
  }
}
