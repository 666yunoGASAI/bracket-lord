import { useRoute } from './router';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import TournamentPage from './pages/TournamentPage';

function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M3 6h7v7h6M3 22h7v-9M16 13h9" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="square" />
      <circle cx="25" cy="13" r="2.5" fill="var(--gold)" />
    </svg>
  );
}

export default function App() {
  const route = useRoute();
  const tournamentMatch = route.match(/^\/t\/([\w-]+)$/);

  let page;
  if (route === '/') page = <HomePage />;
  else if (route === '/new') page = <CreatePage />;
  else if (tournamentMatch) page = <TournamentPage id={tournamentMatch[1]} key={tournamentMatch[1]} />;
  else
    page = (
      <section className="notice">
        <h1>Page not found</h1>
        <p>This link doesn't lead anywhere.</p>
        <a href="#/">Back to tournaments</a>
      </section>
    );

  return (
    <>
      <header className="site-header">
        <a href="#/" className="logo" aria-label="Bracket Lord home">
          <LogoMark />
          <span>Bracket Lord</span>
        </a>
      </header>
      <main className="container">{page}</main>
      <footer className="site-footer">Built by Akinon as a QA automation showcase.</footer>
    </>
  );
}
