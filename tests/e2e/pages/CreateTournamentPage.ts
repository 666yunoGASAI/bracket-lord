import type { Locator, Page } from '@playwright/test';

export type Seeding = 'as-entered' | 'random';

export class CreateTournamentPage {
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly teamsInput: Locator;
  readonly sampleTeamsButton: Locator;
  readonly preview: Locator;
  readonly asEnteredSeeding: Locator;
  readonly randomSeeding: Locator;
  readonly createButton: Locator;
  readonly cancelLink: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'New tournament' });
    this.nameInput = page.getByLabel('Tournament name');
    this.teamsInput = page.getByLabel('Teams (one per line)');
    this.sampleTeamsButton = page.getByRole('button', { name: 'Fill with sample teams' });
    this.preview = page.getByTestId('bracket-preview');
    this.asEnteredSeeding = page.getByRole('radio', { name: /order I entered/ });
    this.randomSeeding = page.getByRole('radio', { name: 'Randomize seeds' });
    this.createButton = page.getByRole('button', { name: 'Create bracket' });
    this.cancelLink = page.getByRole('link', { name: 'Cancel' });
    this.errorAlert = page.getByRole('alert', { name: 'Form errors' });
  }

  async goto() {
    await this.page.goto('/#/new');
  }

  async fill(name: string, teams: string[] | string, seeding: Seeding = 'as-entered') {
    await this.nameInput.fill(name);
    await this.teamsInput.fill(Array.isArray(teams) ? teams.join('\n') : teams);
    await (seeding === 'random' ? this.randomSeeding : this.asEnteredSeeding).check();
  }

  /** Fills the form and submits it. Returns the new tournament id from the URL. */
  async create(name: string, teams: string[] | string, seeding: Seeding = 'as-entered') {
    await this.fill(name, teams, seeding);
    await this.createButton.click();
    await this.page.waitForURL(/#\/t\/[\w-]+$/);
    return this.page.url().split('/t/')[1];
  }

  errorItems(): Locator {
    return this.errorAlert.getByRole('listitem');
  }
}
