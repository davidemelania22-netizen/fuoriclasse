import { useGameStore } from './stores/useGameStore';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  const currentSaveId = useGameStore((s) => s.currentSaveId);

  return (
    <div className="app">
      {currentSaveId ? <DashboardPage saveId={currentSaveId} /> : <HomePage />}
    </div>
  );
}
