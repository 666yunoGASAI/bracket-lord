import { useState } from 'react';
import {
  countByes,
  getChampion,
  matchProgress,
  matchesInRound,
  roundName,
  type Match,
  type Tournament,
  type UpdateResult,
} from '../lib/bracket';
import { deleteTournament, getTournament, upsertTournament } from '../lib/storage';
import { navigate } from '../router';
import MatchCard from '../components/MatchCard';
import ReportDialog from '../components/ReportDialog';

const MESSAGES = {
  saved: 'Result saved.',
  forfeit: 'Forfeit recorded.',
  cleared: 'Result cleared.',
};

function Trophy() {
  return (
    <svg className="trophy" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M14 6h20v10a10 10 0 0 1-20 0V6Zm0 4H6v3a8 8 0 0 0 8 8m20-11h8v3a8 8 0 0 1-8 8M24 26v8m-8 8h16l-2-8H18l-2 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TournamentPage({ id }: { id: string }) {
  const [tournament, setTournament] = useState<Tournament | undefined>(() => getTournament(id));
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!tournament) {
    return (
      <section className="notice">
        <h1>Tournament not found</h1>
        <p>It may have been deleted, or the link is wrong.</p>
        <a href="#/">Back to tournaments</a>
      </section>
    );
  }

  const champion = getChampion(tournament);
  const { played, total } = matchProgress(tournament);
  const rounds = Array.from({ length: tournament.rounds }, (_, i) => i + 1);

  function handleSaved(result: UpdateResult, action: keyof typeof MESSAGES) {
    upsertTournament(result.tournament);
    setTournament(result.tournament);
    setActiveMatch(null);
    const cascade =
      result.cleared > 0
        ? ` ${result.cleared} later ${result.cleared === 1 ? 'result was' : 'results were'} cleared because the winner changed.`
        : '';
    setToast(MESSAGES[action] + cascade);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <a href="#/" className="back-link">
            All tournaments
          </a>
          <h1>{tournament.name}</h1>
          <p className="lede">
            {tournament.teams.length} teams · {tournament.rounds} rounds · {countByes(tournament)}{' '}
            byes · Single elimination
          </p>
        </div>
        <div className="head-side">
          <div className="progress-block">
            <span className="progress-text">
              {played} of {total} matches played
            </span>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${total ? (played / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="actions">
            {confirmingDelete ? (
              <>
                <span className="confirm-text">Delete this tournament?</span>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    deleteTournament(tournament.id);
                    navigate('/');
                  }}
                >
                  Yes, delete
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(false)}>
                  Keep it
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(true)}>
                Delete tournament
              </button>
            )}
          </div>
        </div>
      </div>

      {champion && (
        <div className="champion" data-testid="champion-banner">
          <Trophy />
          <p>
            <span className="champion-label">Champion: </span>
            <strong className="champion-name">{champion.name}</strong>
          </p>
        </div>
      )}

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <p className="toast" data-testid="toast">
            {toast}
          </p>
        )}
      </div>

      <div className="bracket-scroll">
        <div className="bracket" data-testid="bracket">
          {rounds.map((round) => (
            <div className="round" key={round} data-testid={`round-${round}`}>
              <h2 className="round-title">{roundName(round, tournament.rounds)}</h2>
              <div className="round-matches">
                {matchesInRound(tournament, round).map((match) => (
                  <div
                    className={match.winner !== null ? 'm-wrap is-through' : 'm-wrap'}
                    key={match.id}
                  >
                    <MatchCard
                      tournament={tournament}
                      match={match}
                      onReport={(m) => {
                        setToast(null);
                        setActiveMatch(m);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeMatch && (
        <ReportDialog
          key={activeMatch.id}
          tournament={tournament}
          match={activeMatch}
          onClose={() => setActiveMatch(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
