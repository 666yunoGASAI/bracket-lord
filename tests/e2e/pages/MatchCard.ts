import type { Locator } from '@playwright/test';

/** Component object for one match in the bracket. */
export class MatchCard {
  readonly slotA: Locator;
  readonly slotB: Locator;
  readonly winnerSlot: Locator;
  readonly reportButton: Locator;
  readonly editButton: Locator;
  readonly byeNote: Locator;

  constructor(readonly root: Locator) {
    this.slotA = root.getByTestId('slot-a');
    this.slotB = root.getByTestId('slot-b');
    this.winnerSlot = root.locator('[data-winner="true"]');
    this.reportButton = root.getByRole('button', { name: 'Report result' });
    this.editButton = root.getByRole('button', { name: 'Edit result' });
    this.byeNote = root.getByText(/advances on a bye/);
  }

  teamName(side: 'A' | 'B'): Locator {
    return (side === 'A' ? this.slotA : this.slotB).getByTestId('team-name');
  }

  score(side: 'A' | 'B'): Locator {
    return (side === 'A' ? this.slotA : this.slotB).getByTestId('score');
  }

  winnerName(): Locator {
    return this.winnerSlot.getByTestId('team-name');
  }
}
