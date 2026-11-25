import { getChampion, matchProgress } from '../lib/bracket';
import { loadTournaments } from '../lib/storage';

/** Faint drawing of an empty 4-team bracket, shown when there's nothing to list. */
function GhostBracket() {
  return (
    <svg className="ghost-bracket" viewBox="0 0 320 150" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="8" width="96" height="26" rx="3" />
        <rect x="2" y="42" width="96" height="26" rx="3" />
        <rect x="2" y="82" width="96" height="26" rx="3" />
        <rect x="2" y="116" width="96" height="26" rx="3" />
        <path d="M98 38h20v-0M118 38v0M98 21h20v34h-20M98 95h20v34h-20M118 38h24M118 112h24M142 38v74M142 75h30" />
        <rect x="172" y="62" width="96" height="26" rx="3" />
        <path d="M268 75h22" />
      </g>
      <circle cx="302" cy="75" r="10" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export default function HomePage() {
  const tournaments = loadTournaments();

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Your tournaments</h1>
          <p className="lede">Brackets you've created on this device.</p>
        </div>
        <a className="btn btn-primary" href="#/new">
          New tournament
        </a>
      </div>

      {tournaments.length === 0 ? (
        <div className="empty">
          <GhostBracket />
          <p>No tournaments yet. Create your first bracket.</p>
        </div>
      ) : (
        <ul className="t-list" aria-label="Tournaments">
          {tournaments.map((t) => {
            const champion = getChampion(t);
            const { played, total } = matchProgress(t);
            const percent = total === 0 ? 0 : Math.round((played / total) * 100);
            return (
              <li key={t.id} className="t-row" data-testid="tournament-card">
                <a href={`#/t/${t.id}`} className="t-name">
                  {t.name}
                </a>
                <span className="t-teams">{t.teams.length} teams</span>
                <div className="t-progress">
                  <div
                    className="meter"
                    role="progressbar"
                    aria-label={`${t.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={played}
                  >
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  <span className="t-count">
                    {played}/{total} played
                  </span>
                </div>
                <span className={champion ? 't-status is-done' : 't-status'}>
                  {champion ? `Champion: ${champion.name}` : 'In progress'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
