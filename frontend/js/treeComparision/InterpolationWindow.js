import constructTree from "../treeVisualisation/LayoutCalculator.js";
import drawTree from "../treeVisualisation/TreeDrawer.js";

/**
 * Handles interpolation visualization between two trees using WinBox
 */
export class InterpolationWindow {
  constructor() {
    this.svgCounter = 0;
    this.currentInterpolation = null;
  }

  /**
   * Create interpolation WinBox using existing intermediate trees
   */
  async createInterpolationWindow(options) {
    const {
      treeList,
      tree1Index,
      tree2Index,
      leaveOrder = [],
      ignoreBranchLengths = false,
      fontSize = 1.7,
      strokeWidth = 1,
      toBeHighlighted = [],
      animationDuration = 3000
    } = options;

    this.validateInputs(treeList, tree1Index, tree2Index);

    const container = this.createInterpolationContainer(tree1Index, tree2Index);
    const svgId = this.setupInterpolationContainer(container);

    const interpolationSequence = this.getExistingInterpolationSequence(
      treeList, tree1Index, tree2Index
    );

    this.attachInterpolationControls(container, {
      interpolationSequence, svgId, leaveOrder, ignoreBranchLengths,
      fontSize, strokeWidth, toBeHighlighted, animationDuration
    });

    setTimeout(async () => {
      try {
        await this.initializeInterpolation({
          interpolationSequence, svgId, leaveOrder, ignoreBranchLengths,
          fontSize, strokeWidth, toBeHighlighted, animationDuration
        });
      } catch (error) {
        this.showError(container, error);
      }
    }, 150);

    return container;
  }

  /**
   * Generate unique SVG ID
   */
  generateSvgId(prefix = 'tree-svg') {
    return `${prefix}-${Date.now()}-${++this.svgCounter}`;
  }

  /**
   * Create SVG container
   */
  createSvgContainer(id, parentElement) {
    // Clear any existing content
    parentElement.innerHTML = '';

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", id);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.display = "block";
    svg.style.border = "1px solid rgba(255,255,255,0.1)";
    svg.style.borderRadius = "4px";
    svg.style.background = "rgba(255,255,255,0.01)";

    parentElement.appendChild(svg);

    // Get container dimensions for optimal tree display
    const containerRect = parentElement.getBoundingClientRect();
    const width = Math.max(containerRect.width || 600, 400);
    const height = Math.max(containerRect.height || 500, 400);

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Create main container group for interpolation tree
    const mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mainGroup.setAttribute("class", "interpolation-main-container");
    svg.appendChild(mainGroup);

    // Create tree group - TreeDrawer will handle additional centering if needed
    const treeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    treeGroup.setAttribute("class", "tree-container");
    treeGroup.setAttribute("id", `${id}-tree-group`);
    // Provide base centering - TreeDrawer may adjust this
    treeGroup.setAttribute("transform", `translate(${width / 2}, ${height / 2})`);
    mainGroup.appendChild(treeGroup);

    return { svg, width, height, treeGroupId: `${id}-tree-group` };
  }

  /**
   * Get existing interpolation sequence from treeList
   * Uses the 5-tree structure: [real_tree, interp1, interp2, interp3, interp4, next_real_tree]
   */
  getExistingInterpolationSequence(treeList, tree1Index, tree2Index) {
    const sequence = [];

    // Ensure we're working with real tree indices (multiples of 5)
    const realTree1Index = Math.floor(tree1Index / 5) * 5;
    const realTree2Index = Math.floor(tree2Index / 5) * 5;

    if (realTree2Index === realTree1Index + 5) {
      // Sequential trees - use all 5 trees in the sequence
      for (let i = realTree1Index; i <= realTree1Index + 4; i++) {
        if (treeList[i]) {
          sequence.push({
            tree: treeList[i],
            index: i,
            label: i === realTree1Index ? `Tree ${Math.floor(i/5) + 1}` :
                   `Interpolation ${i - realTree1Index}`
          });
        }
      }
      // Add the final real tree
      if (treeList[realTree2Index]) {
        sequence.push({
          tree: treeList[realTree2Index],
          index: realTree2Index,
          label: `Tree ${Math.floor(realTree2Index/5) + 1}`
        });
      }
    } else {
      // Non-sequential trees - create a longer sequence if there are trees in between
      const startTreeGroup = Math.floor(realTree1Index / 5);
      const endTreeGroup = Math.floor(realTree2Index / 5);

      for (let group = startTreeGroup; group <= endTreeGroup; group++) {
        const groupStartIndex = group * 5;

        if (group === startTreeGroup) {
          // First group: start from the real tree and include all intermediates
          for (let i = groupStartIndex; i <= groupStartIndex + 4 && i < treeList.length; i++) {
            if (treeList[i]) {
              sequence.push({
                tree: treeList[i],
                index: i,
                label: i === groupStartIndex ? `Tree ${group + 1}` :
                       `Interpolation ${i - groupStartIndex}`
              });
            }
          }
        } else if (group === endTreeGroup) {
          // Last group: only add the real tree
          if (treeList[groupStartIndex]) {
            sequence.push({
              tree: treeList[groupStartIndex],
              index: groupStartIndex,
              label: `Tree ${group + 1}`
            });
          }
        } else {
          // Middle groups: add all 5 trees
          for (let i = groupStartIndex; i <= groupStartIndex + 4 && i < treeList.length; i++) {
            if (treeList[i]) {
              sequence.push({
                tree: treeList[i],
                index: i,
                label: i === groupStartIndex ? `Tree ${group + 1}` :
                       `Interpolation ${i - groupStartIndex}`
              });
            }
          }
        }
      }
    }

    return sequence;
  }

  /**
   * Create the interpolation modal container
   */
  createInterpolationContainer(tree1Index, tree2Index) {
    const tree1Label = Math.floor(tree1Index / 5) + 1;
    const tree2Label = Math.floor(tree2Index / 5) + 1;

    const container = new window.WinBox({
      title: `Tree Interpolation: Tree ${tree1Label} → Tree ${tree2Label}`,
      width: "70%",
      height: "80%",
      x: "center",
      y: "center",
      class: ["modern"],
      background: "#373747",
      border: 2,
      html: `
        <div class="interpolation-container">
          <div class="interpolation-header">
            <h3>Tree Interpolation Animation</h3>
            <p>Showing transition from Tree ${tree1Label} to Tree ${tree2Label}</p>
            <div class="current-step-info">
              <span class="current-step-label">Current: Tree ${tree1Label}</span>
            </div>
          </div>
          <div class="interpolation-content">
            <div class="interpolation-svg-container"></div>
          </div>
          <div class="interpolation-controls">
            <button class="btn btn-primary" data-action="play">
              ▶ Play
            </button>
            <button class="btn btn-secondary" data-action="pause">
              ⏸ Pause
            </button>
            <button class="btn btn-secondary" data-action="reset">
              ⏮ Reset
            </button>
            <button class="btn btn-secondary" data-action="step-forward">
              ⏭ Step
            </button>
            <button class="btn btn-secondary" data-action="step-backward">
              ⏮ Step Back
            </button>
            <div class="interpolation-progress">
              <label>Progress: <span class="progress-value">0%</span></label>
              <input type="range" class="progress-slider" min="0" max="100" value="0">
            </div>
            <div class="interpolation-settings">
              <label>Speed:
                <select class="speed-select">
                  <option value="1000">Fast</option>
                  <option value="3000" selected>Normal</option>
                  <option value="5000">Slow</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      `,
      onclose: () => {
        this.cleanup();
      }
    });

    return container;
  }

  /**
   * Setup SVG container for interpolation
   */
  setupInterpolationContainer(container) {
    const svgId = this.generateSvgId('interpolation');
    const svgContainer = container.body.querySelector('.interpolation-svg-container');

    if (!svgContainer) {
      throw new Error('Interpolation SVG container not found in window');
    }

    // Ensure proper height
    svgContainer.style.height = "500px";
    svgContainer.style.minHeight = "500px";

    this.createSvgContainer(svgId, svgContainer);
    return svgId;
  }

  /**
   * Initialize interpolation with existing tree sequence
   */
  async initializeInterpolation(options) {
    this.currentInterpolation = {
      sequence: options.interpolationSequence,
      currentStep: 0,
      isPlaying: false,
      options: options
    };

    await this.renderInterpolationStep(0);
  }

  /**
   * Render specific step using TreeDrawer directly
   */
  async renderInterpolationStep(stepIndex) {
    if (!this.currentInterpolation || !this.currentInterpolation.sequence[stepIndex]) {
      return;
    }

    const step = this.currentInterpolation.sequence[stepIndex];
    const options = this.currentInterpolation.options;

    await this.renderSingleTree(step.tree, options.svgId, {
      leaveOrder: options.leaveOrder,
      ignoreBranchLengths: options.ignoreBranchLengths,
      fontSize: options.fontSize,
      strokeWidth: options.strokeWidth,
      toBeHighlighted: options.toBeHighlighted,
      drawDuration: 200
    });

    this.updateProgress(stepIndex, step.label);
    this.currentInterpolation.currentStep = stepIndex;
  }

  /**
   * Create SVG container optimized for single tree interpolation display
   */
  async renderSingleTree(treeData, svgId, options) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const svgElement = document.getElementById(svgId);
          if (!svgElement) {
            throw new Error(`SVG element ${svgId} not found`);
          }

          // Get the tree group instead of the SVG directly
          const treeGroupId = `${svgId}-tree-group`;
          const treeGroup = document.getElementById(treeGroupId);
          if (!treeGroup) {
            throw new Error(`Tree group ${treeGroupId} not found`);
          }

          // Clear existing tree content
          treeGroup.innerHTML = '';

          // Get proper container dimensions
          const containerRect = svgElement.getBoundingClientRect();
          const width = Math.max(containerRect.width || 600, 400);
          const height = Math.max(containerRect.height || 500, 400);

          const treeLayout = constructTree(treeData, options.ignoreBranchLengths, {
            containerId: treeGroupId,
            width: width,
            height: height,
            margin: 40
          });

          const success = drawTree({
            treeConstructor: treeLayout,
            toBeHighlighted: new Set(options.toBeHighlighted),
            drawDurationFrontend: options.drawDuration,
            leaveOrder: options.leaveOrder,
            fontSize: options.fontSize,
            strokeWidth: options.strokeWidth,
            svgContainerId: treeGroupId
          });

          if (success) {
            resolve(treeLayout);
          } else {
            reject(new Error('Tree rendering failed'));
          }
        } catch (error) {
          reject(error);
        }
      }, 50);
    });
  }

  /**
   * Update progress display and current step info
   */
  updateProgress(stepIndex, stepLabel) {
    const totalSteps = this.currentInterpolation.sequence.length;
    const percentage = (stepIndex / (totalSteps - 1)) * 100;

    const progressValue = document.querySelector('.progress-value');
    const progressSlider = document.querySelector('.progress-slider');
    const stepLabelElement = document.querySelector('.current-step-label');

    if (progressValue) progressValue.textContent = `${Math.round(percentage)}%`;
    if (progressSlider) progressSlider.value = percentage;
    if (stepLabelElement) stepLabelElement.textContent = `Current: ${stepLabel}`;
  }

  /**
   * Attach controls for interpolation playback
   */
  attachInterpolationControls(container, options) {
    const winboxBody = container.body;

    winboxBody.addEventListener('click', (event) => {
      const action = event.target.dataset.action;

      switch (action) {
        case 'play':
          this.playInterpolation();
          break;
        case 'pause':
          this.pauseInterpolation();
          break;
        case 'reset':
          this.resetInterpolation();
          break;
        case 'step-forward':
          this.stepForward();
          break;
        case 'step-backward':
          this.stepBackward();
          break;
      }
    });

    // Progress slider control
    const progressSlider = winboxBody.querySelector('.progress-slider');
    progressSlider.addEventListener('input', (event) => {
      this.seekInterpolation(parseInt(event.target.value));
    });

    // Speed control
    const speedSelect = winboxBody.querySelector('.speed-select');
    speedSelect.addEventListener('change', (event) => {
      options.animationDuration = parseInt(event.target.value);
    });
  }

  /**
   * Play interpolation animation through existing trees
   */
  async playInterpolation() {
    if (!this.currentInterpolation) return;

    this.currentInterpolation.isPlaying = true;
    await this.animateInterpolation();
  }

  /**
   * Animate through the existing interpolation sequence
   */
  async animateInterpolation() {
    if (!this.currentInterpolation?.isPlaying) return;

    const { sequence, options } = this.currentInterpolation;
    const stepDuration = options.animationDuration / sequence.length;

    for (let i = this.currentInterpolation.currentStep;
         i < sequence.length && this.currentInterpolation.isPlaying;
         i++) {
      await this.renderInterpolationStep(i);

      if (i < sequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }

    this.currentInterpolation.isPlaying = false;
  }

  /**
   * Pause interpolation
   */
  pauseInterpolation() {
    if (this.currentInterpolation) {
      this.currentInterpolation.isPlaying = false;
    }
  }

  /**
   * Reset interpolation to beginning
   */
  async resetInterpolation() {
    if (!this.currentInterpolation) return;

    this.pauseInterpolation();
    this.currentInterpolation.currentStep = 0;
    await this.renderInterpolationStep(0);
  }

  /**
   * Step forward one tree
   */
  async stepForward() {
    if (!this.currentInterpolation) return;

    const nextStep = Math.min(
      this.currentInterpolation.currentStep + 1,
      this.currentInterpolation.sequence.length - 1
    );
    await this.renderInterpolationStep(nextStep);
  }

  /**
   * Step backward one tree
   */
  async stepBackward() {
    if (!this.currentInterpolation) return;

    const prevStep = Math.max(this.currentInterpolation.currentStep - 1, 0);
    await this.renderInterpolationStep(prevStep);
  }

  /**
   * Seek to specific position in interpolation
   */
  async seekInterpolation(percentage) {
    if (!this.currentInterpolation) return;

    const stepIndex = Math.round((percentage / 100) * (this.currentInterpolation.sequence.length - 1));
    await this.renderInterpolationStep(stepIndex);
  }

  /**
   * Cleanup interpolation resources
   */
  cleanup() {
    if (this.currentInterpolation) {
      this.currentInterpolation.isPlaying = false;
      this.currentInterpolation = null;
    }
  }

  /**
   * Validate inputs
   */
  validateInputs(treeList, tree1Index, tree2Index) {
    if (!Array.isArray(treeList)) {
      throw new Error('Invalid tree list provided');
    }
    if (!treeList[tree1Index] || !treeList[tree2Index]) {
      throw new Error(`Invalid tree indices: ${tree1Index}, ${tree2Index}`);
    }
    if (tree1Index === tree2Index) {
      throw new Error('Cannot interpolate between the same tree');
    }
  }

  /**
   * Show error message
   */
  showError(container, error) {
    console.error('Interpolation error:', error);
    if (container && container.body) {
      container.body.innerHTML = `
        <div class="error-message">
          <h4>Interpolation Error</h4>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Initialize CSS styles
   */
  initializeStyles() {
    if (document.getElementById('interpolation-styles')) return;

    const style = document.createElement('style');
    style.id = 'interpolation-styles';
    style.textContent = `
      .interpolation-container {
        padding: 20px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .interpolation-header {
        text-align: center;
        margin-bottom: 20px;
      }
      .interpolation-header h3 {
        margin: 0 0 10px 0;
        color: #333;
      }
      .interpolation-header p {
        margin: 5px 0;
        color: #666;
        font-size: 0.9em;
      }
      .current-step-info {
        margin-top: 10px;
        padding: 5px 10px;
        background: #f0f8ff;
        border-radius: 4px;
        display: inline-block;
      }
      .current-step-label {
        font-weight: bold;
        color: #2c5aa0;
      }
      .interpolation-content {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        background: white;
        margin-bottom: 20px;
      }
      .interpolation-svg-container {
        width: 100%;
        height: 100%;
        min-height: 400px;
      }
      .interpolation-controls {
        padding: 15px;
        border-top: 1px solid #eee;
        background: #fafafa;
        border-radius: 0 0 8px 8px;
        text-align: center;
      }
      .interpolation-controls .btn {
        padding: 8px 16px;
        margin: 0 5px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.9em;
        transition: all 0.2s;
      }
      .interpolation-controls .btn-primary {
        background-color: #4285f4;
        color: white;
      }
      .interpolation-controls .btn-primary:hover {
        background-color: #3367d6;
      }
      .interpolation-controls .btn-secondary {
        background-color: #f8f9fa;
        color: #333;
        border: 1px solid #ddd;
      }
      .interpolation-controls .btn-secondary:hover {
        background-color: #e9ecef;
      }
      .interpolation-progress {
        margin: 15px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      .progress-slider {
        width: 300px;
        margin: 0 10px;
      }
      .interpolation-settings {
        margin-top: 15px;
        display: flex;
        justify-content: center;
        gap: 20px;
      }
      .interpolation-settings label {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9em;
      }
      .interpolation-settings select {
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }
}
