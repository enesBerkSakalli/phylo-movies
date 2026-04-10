import { useTreeControllerLifecycle } from '@/core/treeVisualisation/hooks/useTreeControllerLifecycle.js';
import { useTreeMSASync } from '@/core/treeVisualisation/hooks/useTreeMSASync.js';
import { useTreeRenderer } from '@/core/treeVisualisation/hooks/useTreeRenderer.js';

// =============================================================================
// HOOK
// =============================================================================

export function useTreeController() {
  // 1. Controller Lifecycle Management (Mount/Unmount/Creation)
  const controllerRef = useTreeControllerLifecycle();

  // 2. Headless Daemon: MSA & Color Synchronization
  useTreeMSASync();

  // 3. Render Pipeline Scheduler
  useTreeRenderer(controllerRef);

  return controllerRef.current;
}
