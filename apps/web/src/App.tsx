import { useGameStore } from './stores/useGameStore';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';

export function App() {
  const currentSaveId = useGameStore((s) => s.currentSaveId);
  const editing = useGameStore((s) => s.editing);

  return (
    <div className="app">
      {!currentSaveId && <HomePage />}
      {currentSaveId && editing && <EditorPage saveId={currentSaveId} />}
      {currentSaveId && !editing && <DashboardPage saveId={currentSaveId} />}
    </div>
  );
}
