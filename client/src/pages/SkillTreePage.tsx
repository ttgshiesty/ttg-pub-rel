import { useEffect } from 'react';
import { Header as SkillTreeHeader } from '../skill-tree/components/Header';
import { SkillTreeView } from '../skill-tree/components/SkillTreeView';
import { BuildSummary } from '../skill-tree/components/BuildSummary';
import { RadarChart } from '../skill-tree/components/RadarChart';
import { useSkillTreeStore } from '../skill-tree/store/skillTreeStore';
import ErrorBoundary from '../components/ErrorBoundary';
import { assetUrl } from '../lib/assetUrl';
import '../skill-tree/index.css';

export default function SkillTreePage() {
  const undo = useSkillTreeStore((state) => state.undo);
  const redo = useSkillTreeStore((state) => state.redo);
  const canUndo = useSkillTreeStore((state) => state.canUndo);
  const canRedo = useSkillTreeStore((state) => state.canRedo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey && canUndo()) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey && e.key === 'y') ||
        (e.ctrlKey && e.shiftKey && e.key === 'z')
      ) {
        if (canRedo()) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <ErrorBoundary fallbackLabel="Skill Tree Failed to Render">
      <div
        className="skill-tree-root relative min-h-screen bg-cover bg-center bg-fixed bg-no-repeat"
        style={{
          backgroundColor: '#0F1115',
          backgroundImage: `linear-gradient(rgba(15, 17, 21, 0.68), rgba(15, 17, 21, 0.68)), url('${assetUrl('/arc_skilltree_lines.png')}')`,
          color: '#E0E0E0',
        }}
      >
        <SkillTreeHeader />

        <main className="max-w-[1600px] mx-auto p-6">
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <ErrorBoundary fallbackLabel="Skill Tree Graph Error">
                <SkillTreeView />
              </ErrorBoundary>
            </div>
            <aside className="w-full xl:w-56 shrink-0 space-y-6">
              <ErrorBoundary fallbackLabel="Build Summary Error">
                <BuildSummary />
              </ErrorBoundary>
              <ErrorBoundary fallbackLabel="Radar Chart Error">
                <RadarChart />
              </ErrorBoundary>
            </aside>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
