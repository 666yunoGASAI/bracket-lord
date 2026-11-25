import { useState, type FormEvent } from 'react';
import {
  bracketSummary,
  createTournament,
  nextPowerOfTwo,
  parseTeamList,
  seedPositions,
  validateTournamentInput,
  MIN_TEAMS,
  MAX_TEAMS,
  type SeedingMode,
} from '../lib/bracket';
import { upsertTournament } from '../lib/storage';
import { navigate } from '../router';

const SAMPLE_TEAMS = [
  'Manila Mavericks',
  'Cebu Cyclones',
  'Davao Dragons',
  'Baguio Blizzards',
  'Iloilo Inferno',
  'Tarlac Titans',
  'Pampanga Phantoms',
  'Bicol Volcanoes',
];

interface Pairing {
  a: { seed: number; name: string };
  b: { seed: number; name: string } | null;
}

/** First-round pairings exactly as the bracket will be generated (as-entered seeding). */
function firstRoundPairings(names: string[]): Pairing[] {
  if (names.length < MIN_TEAMS || names.length > MAX_TEAMS) return [];
  const positions = seedPositions(nextPowerOfTwo(names.length));
  const pairs: Pairing[] = [];
  for (let i = 0; i < positions.length; i += 2) {
    const [sa, sb] = [positions[i], positions[i + 1]];
    pairs.push({
      a: { seed: sa, name: names[sa - 1] },
      b: sb <= names.length ? { seed: sb, name: names[sb - 1] } : null,
    });
  }
  return pairs;
}

export default function CreatePage() {
  const [name, setName] = useState('');
  const [teamsText, setTeamsText] = useState('');
  const [seeding, setSeeding] = useState<SeedingMode>('as-entered');
  const [errors, setErrors] = useState<string[]>([]);

  const teamNames = parseTeamList(teamsText);
  const { rounds, byes } = bracketSummary(teamNames.length);
  const pairings = firstRoundPairings(teamNames);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problems = validateTournamentInput(name, teamNames);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    const tournament = createTournament({ name, teamNames, seeding });
    upsertTournament(tournament);
    navigate(`/t/${tournament.id}`);
  }

  return (
    <section className="create">
      <div className="page-head">
        <div>
          <a href="#/" className="back-link">
            All tournaments
          </a>
          <h1>New tournament</h1>
          <p className="lede">Single elimination. Byes go to the top seeds automatically.</p>
        </div>
      </div>

      <div className="create-grid">
        <form onSubmit={handleSubmit} noValidate className="sheet">
          {errors.length > 0 && (
            <div className="alert" role="alert" aria-label="Form errors">
              <p className="alert-title">Fix these before creating the bracket:</p>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <label htmlFor="tournament-name">Tournament name</label>
          <input
            id="tournament-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Luzon Invitational 2026"
            autoComplete="off"
          />

          <div className="label-row">
            <label htmlFor="team-list">Teams (one per line)</label>
            <button
              type="button"
              className="btn-text"
              onClick={() => setTeamsText(SAMPLE_TEAMS.join('\n'))}
            >
              Fill with sample teams
            </button>
          </div>
          <textarea
            id="team-list"
            rows={10}
            value={teamsText}
            onChange={(e) => setTeamsText(e.target.value)}
            placeholder={'Manila Mavericks\nCebu Cyclones\nDavao Dragons'}
          />
          <p className="hint" data-testid="bracket-preview" aria-live="polite">
            {teamNames.length} {teamNames.length === 1 ? 'team' : 'teams'} · {rounds}{' '}
            {rounds === 1 ? 'round' : 'rounds'} · {byes} {byes === 1 ? 'bye' : 'byes'}
          </p>

          <fieldset className="choice">
            <legend>Seeding</legend>
            <label className="choice-option">
              <input
                type="radio"
                name="seeding"
                value="as-entered"
                checked={seeding === 'as-entered'}
                onChange={() => setSeeding('as-entered')}
              />
              <span>Use the order I entered (top = seed 1)</span>
            </label>
            <label className="choice-option">
              <input
                type="radio"
                name="seeding"
                value="random"
                checked={seeding === 'random'}
                onChange={() => setSeeding('random')}
              />
              <span>Randomize seeds</span>
            </label>
          </fieldset>

          <div className="actions">
            <a href="#/" className="btn btn-quiet">
              Cancel
            </a>
            <button type="submit" className="btn btn-primary">
              Create bracket
            </button>
          </div>
        </form>

        <aside className="matchups" aria-labelledby="matchups-title">
          <h2 id="matchups-title">Opening matchups</h2>
          {seeding === 'random' ? (
            <p className="matchups-empty">Seeds get shuffled when you create the bracket, so matchups appear then.</p>
          ) : pairings.length === 0 ? (
            <p className="matchups-empty">Add at least two teams to see who plays whom.</p>
          ) : (
            <ol className="pairings">
              {pairings.map((p) => (
                <li key={p.a.seed} className={p.b ? 'pairing' : 'pairing is-bye'}>
                  <span className="p-seed">{p.a.seed}</span>
                  <span className="p-name">{p.a.name}</span>
                  {p.b ? (
                    <>
                      <span className="p-vs">vs</span>
                      <span className="p-seed">{p.b.seed}</span>
                      <span className="p-name">{p.b.name}</span>
                    </>
                  ) : (
                    <span className="p-bye">gets a bye</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </section>
  );
}
