import { useGameStore } from './stores/useGameStore';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';
import { ShopPage } from './pages/ShopPage';
import { AgentPage } from './pages/AgentPage';
import { LifestylePage } from './pages/LifestylePage';
import { InterviewPage } from './pages/InterviewPage';
import { CupsPage } from './pages/CupsPage';
import { CareerHistoryPage } from './pages/CareerHistoryPage';
import { StandingsPage } from './pages/StandingsPage';
import { MatchPreparePage } from './pages/MatchPreparePage';
import { NewsPage } from './pages/NewsPage';
import { CareerPage } from './pages/CareerPage';
import { TacticsPage } from './pages/TacticsPage';
import { CalendarPage } from './pages/CalendarPage';
import { WorldEditorPage } from './pages/WorldEditorPage';

export function App() {
  const currentSaveId = useGameStore((s) => s.currentSaveId);
  const view = useGameStore((s) => s.view);

  return (
    <div className="app">
      {!currentSaveId && <HomePage />}
      {currentSaveId && view === 'editor' && (
        <EditorPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'shop' && <ShopPage saveId={currentSaveId} />}
      {currentSaveId && view === 'agent' && (
        <AgentPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'lifestyle' && (
        <LifestylePage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'interview' && (
        <InterviewPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'cups' && <CupsPage saveId={currentSaveId} />}
      {currentSaveId && view === 'history' && (
        <CareerHistoryPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'standings' && (
        <StandingsPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'match' && (
        <MatchPreparePage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'news' && <NewsPage saveId={currentSaveId} />}
      {currentSaveId && view === 'career' && (
        <CareerPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'tactics' && (
        <TacticsPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'calendar' && (
        <CalendarPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'world' && (
        <WorldEditorPage saveId={currentSaveId} />
      )}
      {currentSaveId && view === 'dashboard' && (
        <DashboardPage saveId={currentSaveId} />
      )}

      {/* Ownership notice, on every screen of the game. The two links are the
          licence and the third-party attributions the MIT/BSD/Apache
          components require to travel with every copy: the packaging step
          copies both files in next to the web assets, so they resolve in the
          installed game (in `npm run dev` there is nothing to serve yet). */}
      <footer className="app-footer">
        Fuoriclasse — gioco di esclusiva proprietà di{' '}
        <strong>Davide Simonetti</strong>. Tutti i diritti riservati.{' '}
        <a href="/LICENSE" target="_blank" rel="noreferrer">
          Licenza
        </a>
        {' · '}
        <a href="/THIRD-PARTY-NOTICES.md" target="_blank" rel="noreferrer">
          Componenti di terze parti
        </a>
      </footer>
    </div>
  );
}
