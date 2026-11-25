import type { Locator, Page } from '@playwright/test';

export class ReportResultDialog {
  readonly root: Locator;
  readonly heading: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly clearButton: Locator;
  readonly forfeitToggle: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.heading = this.root.getByRole('heading');
    this.saveButton = this.root.getByRole('button', { name: 'Save result' });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' });
    this.clearButton = this.root.getByRole('button', { name: 'Clear result' });
    this.forfeitToggle = this.root.getByText('Record a forfeit instead');
    this.error = this.root.getByRole('alert');
  }

  scoreInput(teamName: string): Locator {
    return this.root.getByLabel(`${teamName} score`, { exact: true });
  }

  async enterScores(teamA: string, scoreA: number | string, teamB: string, scoreB: number | string) {
    await this.scoreInput(teamA).fill(String(scoreA));
    await this.scoreInput(teamB).fill(String(scoreB));
  }

  async forfeit(teamName: string) {
    await this.forfeitToggle.click();
    await this.root.getByRole('button', { name: `${teamName} forfeits` }).click();
  }
}
