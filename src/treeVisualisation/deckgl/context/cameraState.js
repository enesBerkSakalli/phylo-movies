import {
  OrthographicView,
  OrbitView,
  LinearInterpolator
} from '@deck.gl/core';
import { VIEW_IDS, DEFAULT_ORTHO_STATE, DEFAULT_ORBIT_STATE } from './viewConstants.js';

export function createDeckViews(controllerConfig = true) {
  return {
    orthographic: new OrthographicView({ id: VIEW_IDS.ORTHO, controller: controllerConfig }),
    orbit: new OrbitView({ id: VIEW_IDS.ORBIT, fov: 50, near: 0.1, far: 10000, controller: controllerConfig })
  };
}

export function createInitialViewStates(options = {}) {
  return {
    [VIEW_IDS.ORTHO]: { ...DEFAULT_ORTHO_STATE, ...(options.initialOrthoState || {}) },
    [VIEW_IDS.ORBIT]: { ...DEFAULT_ORBIT_STATE, ...(options.initialOrbitState || {}) }
  };
}

export function createDeckInterpolators() {
  return {
    orthographic: new LinearInterpolator({ transitionProps: ['target', 'zoom'] }),
    orbit: new LinearInterpolator({
      transitionProps: ['target', 'zoom', 'rotationOrbit', 'rotationX']
    })
  };
}

export function getActiveViewId(cameraMode) {
  return cameraMode === 'orthographic' ? VIEW_IDS.ORTHO : VIEW_IDS.ORBIT;
}

export function getDefaultViewStateFor(viewId) {
  return viewId === VIEW_IDS.ORTHO
    ? { ...DEFAULT_ORTHO_STATE }
    : { ...DEFAULT_ORBIT_STATE };
}

export function clampViewZoom(viewState, zoom) {
  const minZoom = viewState.minZoom ?? -Infinity;
  const maxZoom = viewState.maxZoom ?? Infinity;
  const value = Number.isFinite(zoom) ? zoom : viewState.zoom;
  return Math.max(minZoom, Math.min(maxZoom, value));
}
