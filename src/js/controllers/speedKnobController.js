/**
 * Speed Knob Controller for interactive knob interface
 */
export class SpeedKnobController {
  constructor(knobElement, inputElement, options = {}) {
    this.knob = knobElement;
    this.input = inputElement;
    this.isDragging = false;
    this.startAngle = 0;
    this.startValue = 0;

    this.minValue = parseFloat(this.input.min) || 0.1;
    this.maxValue = parseFloat(this.input.max) || 5;
    this.minAngle = -126;
    this.maxAngle = 126;

    this.onValueChange = options.onValueChange || (() => {});

    this.init();
  }

  init() {
    // Add event listeners for mouse/touch interactions
    this.knob.addEventListener('mousedown', this.handleStart.bind(this));
    this.knob.addEventListener('touchstart', this.handleStart.bind(this));

    document.addEventListener('mousemove', this.handleMove.bind(this));
    document.addEventListener('touchmove', this.handleMove.bind(this));

    document.addEventListener('mouseup', this.handleEnd.bind(this));
    document.addEventListener('touchend', this.handleEnd.bind(this));

    // Also listen to the input directly for keyboard/accessibility
    this.input.addEventListener('input', this.handleInputChange.bind(this));

    // Set initial position and value
    const initialValue = parseFloat(this.input.value);
    this.updateKnobVisual(initialValue);
    // Trigger initial value change to update display
    this.onValueChange(initialValue);
  }

  handleStart(event) {
    event.preventDefault();
    this.isDragging = true;
    this.knob.classList.add('dragging');

    const rect = this.knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;
    const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;

    this.startAngle = this.getAngle(clientX - centerX, clientY - centerY);
    this.startValue = parseFloat(this.input.value);
  }

  handleMove(event) {
    if (!this.isDragging) return;

    event.preventDefault();

    const rect = this.knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
    const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;

    const currentAngle = this.getAngle(clientX - centerX, clientY - centerY);

    // Handle angle wrapping around 180/-180 degrees
    let angleDiff = currentAngle - this.startAngle;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;

    // Limit angle range to our knob's range (-126 to +126)
    const totalAngleRange = this.maxAngle - this.minAngle; // 252 degrees
    angleDiff = Math.max(-totalAngleRange/2, Math.min(totalAngleRange/2, angleDiff));

    // Convert angle change to value change
    const valueRange = this.maxValue - this.minValue;
    const valueDiff = (angleDiff / totalAngleRange) * valueRange;

    let newValue = this.startValue + valueDiff;
    newValue = Math.max(this.minValue, Math.min(this.maxValue, newValue));

    // Round to step precision
    const step = parseFloat(this.input.step) || 0.1;
    newValue = Math.round(newValue / step) * step;

    this.input.value = newValue.toFixed(1);
    this.updateKnobVisual(newValue);

    // Call the onValueChange callback
    this.onValueChange(newValue);

    // Trigger input event for other listeners
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  handleEnd(event) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.knob.classList.remove('dragging');
  }

  handleInputChange(event) {
    // Don't update visual during drag operations to prevent conflicts
    if (this.isDragging) return;

    const value = parseFloat(event.target.value);
    this.updateKnobVisual(value);
  }

  updateKnobVisual(value) {
    const indicator = this.knob.querySelector('.speed-knob-indicator');
    if (!indicator) return;

    // Map value to angle
    const normalizedValue = (value - this.minValue) / (this.maxValue - this.minValue);
    const angle = this.minAngle + (normalizedValue * (this.maxAngle - this.minAngle));

    indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;

    // Update color classes
    this.knob.classList.remove('speed-slow', 'speed-normal', 'speed-fast');
    if (value < 1) {
      this.knob.classList.add('speed-slow');
    } else if (value > 2) {
      this.knob.classList.add('speed-fast');
    } else {
      this.knob.classList.add('speed-normal');
    }
  }

  getAngle(x, y) {
    return Math.atan2(y, x) * (180 / Math.PI);
  }
}
