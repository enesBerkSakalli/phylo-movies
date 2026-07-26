// react-dom/test-utils's Simulate helper was removed in React 19. These
// dispatch the same native events React's synthetic event system listens
// for, so callers migrating off Simulate.click/Simulate.change don't need
// to hand-roll event construction in every test file.

export function simulateClick(element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

// Some components (e.g. Radix UI triggers) open on pointerdown rather than
// click, so a plain click doesn't exercise them in tests - dispatch the
// fuller press sequence a real mouse interaction would produce.
export function simulateButtonPress(element) {
  const options = { bubbles: true, cancelable: true, button: 0, ctrlKey: false };
  element.dispatchEvent(new PointerEvent('pointerdown', options));
  element.dispatchEvent(new MouseEvent('mousedown', options));
  simulateClick(element);
}

// React overrides the native value setter on input/textarea elements to
// track "last known value" for change detection, so a plain
// `element.value = x` bypasses that tracking and the subsequent 'input'
// event is seen as a no-op change. Call the native setter directly first,
// then dispatch - the standard workaround for driving React inputs
// without going through @testing-library's userEvent.
const valueSetters = new WeakMap();

function nativeValueSetterFor(element) {
  const prototype = Object.getPrototypeOf(element);
  let setter = valueSetters.get(prototype);
  if (!setter) {
    setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
    valueSetters.set(prototype, setter);
  }
  return setter;
}

// React tracks text input changes via the native 'input' event (not
// 'change'), so setting .value and dispatching 'input' is what
// Simulate.change actually did under the hood for text inputs.
export function simulateChange(element, value) {
  nativeValueSetterFor(element).call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
