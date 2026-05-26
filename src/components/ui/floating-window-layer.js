export const FLOATING_WINDOW_SURFACE_CLASS =
  'fixed pointer-events-auto overflow-hidden rounded-md border border-border bg-card shadow-xl';

export function getFloatingWindowLayerClass(isActive) {
  return isActive ? 'z-[1200]' : 'z-[1100]';
}
