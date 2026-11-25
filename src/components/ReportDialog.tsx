import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BracketError,
  clearResult,
  getTeam,
  recordForfeit,
  reportResult,
  roundName,
  type Match,
  type Side,
  type Tournament,
  type UpdateResult,
} from '../lib/bracket';

interface Props {
  tournament: Tournament;
  match: Match;
  onClose: () => void;
  onSaved: (result: UpdateResult, action: 'saved' | 'forfeit' | 'cleared') => void;
}

export default function ReportDialog({ tournament, match, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() ?? '');
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const teamA = getTeam(tournament, match.teamA)!;
  const teamB = getTeam(tournament, match.teamB)!;
  const hasResult = match.winner !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function attempt(action: () => UpdateResult, kind: 'saved' | 'forfeit' | 'cleared') {
    try {
      onSaved(action(), kind);
    } catch (e) {
      setError(e instanceof BracketError ? e.message : 'Something went wrong. Try again.');
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (scoreA.trim() === '' || scoreB.trim() === '') {
      setError('Enter a score for both teams.');
      return;
    }
    attempt(() => reportResult(tournament, match.id, Number(scoreA), Number(scoreB)), 'saved');
  }

  function forfeit(side: Side) {
    attempt(() => recordForfeit(tournament, match.id, side), 'forfeit');
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="report-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <h2 id="report-title">
          Report result · {roundName(match.round, tournament.rounds)}, Match {match.index + 1}
        </h2>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <div className="score-grid">
          <div className="score-side">
            <div className="score-team">
              <span className="score-seed" aria-hidden="true">{teamA.seed}</span>
              <label htmlFor="score-a">
                {teamA.name}
                <span className="sr-only"> score</span>
              </label>
            </div>
            <input
              id="score-a"
              type="number"
              inputMode="numeric"
              min={0}
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              placeholder="–"
            />
          </div>
          <span className="score-vs" aria-hidden="true">
            vs
          </span>
          <div className="score-side">
            <div className="score-team">
              <span className="score-seed" aria-hidden="true">{teamB.seed}</span>
              <label htmlFor="score-b">
                {teamB.name}
                <span className="sr-only"> score</span>
              </label>
            </div>
            <input
              id="score-b"
              type="number"
              inputMode="numeric"
              min={0}
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              placeholder="–"
            />
          </div>
        </div>

        <details className="forfeit-box">
          <summary>Record a forfeit instead</summary>
          <div className="actions">
            <button type="button" className="btn btn-danger-quiet" onClick={() => forfeit('A')}>
              {teamA.name} forfeits
            </button>
            <button type="button" className="btn btn-danger-quiet" onClick={() => forfeit('B')}>
              {teamB.name} forfeits
            </button>
          </div>
        </details>

        <div className="actions">
          {hasResult && (
            <button
              type="button"
              className="btn btn-quiet clear-btn"
              onClick={() => attempt(() => clearResult(tournament, match.id), 'cleared')}
            >
              Clear result
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save result
          </button>
        </div>
      </form>
    </dialog>
  );
}
