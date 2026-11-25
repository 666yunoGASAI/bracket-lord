# Test Plan: Bracket Lord

| | |
|---|---|
| **Product** | Bracket Lord v1.0 (single-elimination tournament manager) |
| **Author** | Akinon |
| **Test levels** | Unit, property-based, end-to-end (UI) |
| **Tools** | Vitest, fast-check, Playwright (TypeScript), GitHub Actions |

## 1. Scope

**In scope**
- Tournament creation and input validation
- Bracket generation: bracket size, seeding, byes, round naming
- Score reporting, forfeits and score validation
- Editing and clearing results, including the cascade to later rounds
- Champion detection
- Persistence in localStorage, corrupted data, unknown links, deletion
- Browsers: Chromium, Firefox, WebKit (desktop), Chrome on Android (Pixel 7 emulation)

**Out of scope (v1)**
- Double elimination, round robin, Swiss
- Multi-user, sync and server-side storage (the app has no backend)
- Performance with very large brackets (> 64 teams is blocked by validation)
- Formal accessibility audit (partly covered by role-based locators; axe-core is planned)

## 2. Risk analysis

Risks are ranked by **impact × likelihood**. The highest risks get the deepest coverage.

| # | Risk | Impact | Likelihood | Coverage |
|---|---|---|---|---|
| R1 | Editing an early result leaves a team in a later round it no longer qualifies for | High: wrong champion | High: the most complex logic | Unit + property (any edit, any size) + E2E |
| R2 | Byes assigned wrongly for non-power-of-two counts (team missing, duplicated, or bye given to a low seed) | High | Medium | Property (all sizes 2–64) + data-driven E2E |
| R3 | Seeding places seeds 1 and 2 in the same half | Medium | Medium | Property |
| R4 | Invalid scores accepted (draws, negatives, decimals, blanks) | Medium | High: user typos | Unit + data-driven E2E |
| R5 | Duplicate or blank team names slip through | Medium | High | Unit + data-driven E2E |
| R6 | Data lost on reload, or a crash when storage is corrupted | High | Low | E2E |
| R7 | Layout or interaction differs across browsers and mobile | Medium | Medium | E2E on 4 browser projects |

## 3. Approach

**Unit tests (Vitest)** cover the pure logic in `src/lib/bracket.ts`. Each validation rule has a test for its exact error message, plus boundary tests (2 and 64 teams, 30-character names, 50-character titles, scores of 0 and 999).

**Property-based tests (fast-check)** cover invariants that example tests can't enumerate, across every team count from 2 to 64 and random results. On a failure, fast-check shrinks the input to the smallest failing case.

**End-to-end tests (Playwright)** cover user flows against the production build:
- Page Object Model, plus a `MatchCard` component object
- Custom fixtures inject page objects and seed localStorage before load, so tests start in the exact state they need
- Data-driven tables for bracket sizes, invalid form inputs and invalid scores
- `@smoke` tag for a fast critical-path run

## 4. Test case inventory

| ID | Area | Scenario | Level | Priority |
|---|---|---|---|---|
| TC-01 | Create | Valid tournament is created and listed on home | E2E | P1 @smoke |
| TC-02 | Create | Live preview shows teams / rounds / byes while typing | E2E | P2 |
| TC-03 | Create | Blank lines and surrounding spaces in the team list are ignored | Unit, E2E | P2 |
| TC-04 | Create | Random seeding keeps every team, and the same seed gives the same order | Unit, E2E | P2 |
| TC-05 | Create | Cancel saves nothing | E2E | P3 |
| TC-06 | Validation | Empty name / whitespace name / one team / duplicates (case-insensitive) / long team name / long title | Unit, E2E (data-driven) | P1 |
| TC-07 | Validation | Boundaries accepted: 2 teams, 64 teams, 30-char name, 50-char title | Unit | P2 |
| TC-08 | Generation | 2, 3, 5, 8, 12, 17 teams → correct rounds, round titles, byes | E2E (data-driven) | P1 |
| TC-09 | Generation | Matches = size − 1, rounds = log2(size), for all 2–64 | Property | P1 |
| TC-10 | Generation | Every team placed once, no bye-vs-bye match | Property | P1 |
| TC-11 | Generation | Byes go to the top seeds, who are pre-placed in round 2 | Property, E2E | P1 |
| TC-12 | Generation | Seeds 1 and 2 are in opposite halves | Property | P2 |
| TC-13 | Generation | Undecided matches show TBD and can't be reported | Unit, E2E | P2 |
| TC-14 | Results | Reporting a score advances the winner | Unit, E2E | P1 @smoke |
| TC-15 | Results | Full tournament crowns a champion, shown on home too | Unit, E2E | P1 @smoke |
| TC-16 | Results | Draw / blank / negative / decimal / > 999 scores rejected with a message | Unit, E2E (data-driven) | P1 |
| TC-17 | Results | Forfeit awards the match to the opponent | Unit, E2E | P2 |
| TC-18 | Results | Cancel and Escape close the dialog without saving | E2E | P2 |
| TC-19 | Edit | Flipping a winner clears dependent later results and the champion | Unit, E2E | P1 |
| TC-20 | Edit | Changing only the score keeps later results | Unit, E2E | P1 |
| TC-21 | Edit | Clearing a result reopens the match and empties the next slot | Unit, E2E | P2 |
| TC-22 | Edit | After any edit, every match holds its feeders' winners | Property | P1 |
| TC-23 | Persistence | Results survive reload | E2E | P1 @smoke |
| TC-24 | Persistence | Corrupted storage → empty list, no crash | E2E | P2 |
| TC-25 | Navigation | Unknown tournament link → not-found page | E2E | P3 |
| TC-26 | Delete | Delete needs confirmation; "Keep it" cancels | E2E | P2 |
| TC-27 | Logic | Results never mutate the previous tournament object | Unit | P2 |

## 5. Entry and exit criteria

**Entry:** the app builds (`npm run build`) and the typecheck passes.

**Exit (release):**
- 100% of unit and property tests pass
- 100% of E2E tests pass on all 4 browser projects in CI
- No open P1 defects
- No test passes only on retry (any retry is investigated as possible flakiness)

## 6. Environments

| Where | How |
|---|---|
| Local | `npm run test:unit`, `npm run test:e2e` (Playwright starts the production build automatically) |
| CI | GitHub Actions on every push to `main` and every pull request: typecheck → unit → E2E matrix (4 jobs in parallel), HTML report uploaded per browser |
