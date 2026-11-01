import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Icon } from '@/ui/components/Icon';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import { resetProject } from '@/ui/persistence/project-persistence';

export function SettingsSubPanel() {
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    const confirmed = window.confirm(
      'Reset all?\n\nThis deletes the saved scene, your arrangements, environments, '
      + 'light rigs, materials, colors and uploaded images in this browser. '
      + 'This cannot be undone.',
    );
    if (!confirmed) {return;}
    setResetting(true);
    void resetProject().catch((error: unknown) => {
      console.error(error);
      setResetting(false);
    });
  };

  return (
    <SubPanel title="Settings" side="right">
      <SubPanelSection title="Project">
        <p className="panel-hint">
          Your work is saved automatically in this browser and restored on reload.
        </p>
        <button
          type="button"
          className="btn btn--danger"
          disabled={resetting}
          onClick={handleReset}
        >
          <Icon icon={RotateCcw} size={16} strokeWidth={1.75} />
          Reset all…
        </button>
      </SubPanelSection>
    </SubPanel>
  );
}
