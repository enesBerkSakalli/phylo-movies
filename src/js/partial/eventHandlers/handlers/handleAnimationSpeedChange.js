import { useAppStore } from '../../../core/store.js';

/**
 * Handle animation speed slider/input change.
 * Validates the value, updates the store, and reflects the UI label.
 * @param {Event} event - Input/change event from speed control.
 */
export function handleAnimationSpeedChange(event) {
  const { setAnimationSpeed } = useAppStore.getState();
  const value = parseFloat(event.target.value);

  if (!isNaN(value) && value >= 0.1 && value <= 5) {
    setAnimationSpeed(value);

    const speedValue = document.querySelector('.speed-value');
    if (speedValue) {
      speedValue.textContent = `${value.toFixed(1)}×`;
    }
  }
}

