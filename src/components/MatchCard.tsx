import { getTeam, type Match, type Tournament } from '../lib/bracket';

interface Props {
  tournament: Tournament;
  match: Match;
  onReport: (match: Match) => void;
}

/** One match, drawn like a broadcast scoreboard: slanted seed tab, team name, slanted score tab. */
export default function MatchCard({ tournament, match, onReport }: Props) {
  const teamA = getTeam(tournament, match.teamA);
  const teamB = getTeam(tournament, match.teamB);
  const playable = !match.bye && teamA !== undefined && teamB !== undefined;
  const decided = match.winner !== null && !match.bye;

  const rows = [
    { side: 'A' as const, team: teamA, score: match.scoreA },
    { side: 'B' as const, team: teamB, score: match.scoreB },
  ];

  return (
    <article
      className={['match', match.bye && 'is-bye', decided && 'is-decided'].filter(Boolean).join(' ')}
      data-testid={`match-${match.id}`}
      aria-label={`Match ${match.id}`}
    >
      {rows.map(({ side, team, score }) => {
        const isWinner = team !== undefined && match.winner === team.id;
        const isLoser = decided && team !== undefined && !isWinner;
        const forfeited = match.forfeitBy === side;
        const scoreText = forfeited ? 'FF' : score !== null ? String(score) : isWinner && match.forfeitBy ? 'W' : '';
        return (
          <div
            key={side}
            className={['slot', isWinner && 'is-winner', isLoser && 'is-loser', !team && 'is-empty']
              .filter(Boolean)
              .join(' ')}
            data-testid={`slot-${side.toLowerCase()}`}
            data-winner={isWinner ? 'true' : 'false'}
          >
            <span className="seed">{team ? team.seed : ''}</span>
            <span className="team-name" data-testid="team-name">
              {team ? team.name : match.bye ? 'BYE' : 'TBD'}
            </span>
            <span className="score" data-testid="score">
              {scoreText}
            </span>
          </div>
        );
      })}
      {playable && (
        <button type="button" className="match-action" onClick={() => onReport(match)}>
          {decided ? 'Edit result' : 'Report result'}
        </button>
      )}
      {match.bye && <p className="bye-note">{teamA?.name ?? teamB?.name} advances on a bye</p>}
    </article>
  );
}
