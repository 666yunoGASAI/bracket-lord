import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly heading: Locator;
  readonly newTournamentButton: Locator;
  readonly tournamentCards: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Your tournaments' });
    this.newTournamentButton = page.getByRole('link', { name: 'New tournament' });
    this.tournamentCards = page.getByTestId('tournament-card');
    this.emptyState = page.getByText('No tournaments yet. Create your first bracket.');
  }

  async goto() {
    await this.page.goto('/#/');
  }

  card(name: string): Locator {
    return this.tournamentCards.filter({ has: this.page.getByRole('link', { name, exact: true }) });
  }

  async open(name: string) {
    await this.card(name).getByRole('link', { name, exact: true }).click();
  }
}
