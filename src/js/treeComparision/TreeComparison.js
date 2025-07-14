import createRadialTreeLayout from "../treeVisualisation/RadialTreeLayout.js";
import { TreeAnimationController } from "../treeVisualisation/TreeAnimationController.js";

// Load CSS
const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = '/src/css/tree-comparison.css';
document.head.appendChild(cssLink);

/**
 * Unified Tree Comparison System
 * Handles both side-by-side comparisons and interpolation animations
 */
export class TreeComparison {
  constructor() {
    this.idCounter = 0;
    // Cache TreeAnimationController instances by container ID
    this.treeControllers = new Map();
  }

  /**
   * Get or create TreeAnimationController instance for a container
   */
  getTreeController(containerId) {
    if (!this.treeControllers.has(containerId)) {
      this.treeControllers.set(containerId, new TreeAnimationController(null, containerId));
    }
    return this.treeControllers.get(containerId);
  }

  /**
   * Create side-by-side tree comparison
   */
  async createComparison(options) {
    const {
      treeList,
      tree1Index,
      tree2Index,
      title = `Tree Comparison: Tree ${tree1Index + 1} vs Tree ${tree2Index + 1}`,
      ...renderOptions
    } = options;

    this.validateInputs(treeList, tree1Index, tree2Index);

    const container = this.createComparisonModal(title);
    const svgContainer = container.body.querySelector('.tree-comparison-row');
    const svgId = this.generateId('comparison-svg');

    // Create SVG with side-by-side layout
    const { tree1GroupId, tree2GroupId } = this.createComparisonSVG(svgId, svgContainer);

    // Setup controls
    this.setupComparisonControls(container, {
      treeList,
      tree1Index,
      tree2Index,
      tree1GroupId,
      tree2GroupId,
      renderOptions
    });

    // Initial render
    await this.renderComparison({
      treeList,
      tree1Index,
      tree2Index,
      tree1GroupId,
      tree2GroupId,
      ...renderOptions
    });

    return container;
  }

  /**
   * Create interpolation animation between trees
   */
  async createInterpolation(options) {
    const {
      treeList,
      tree1Index,
      tree2Index,
      title = `Tree Interpolation: Tree ${Math.floor(tree1Index / 5) + 1} → Tree ${Math.floor(tree2Index / 5) + 1}`,
      animationDuration = 3000,
      ...renderOptions
    } = options;

    this.validateInputs(treeList, tree1Index, tree2Index);

    const container = this.createInterpolationModal(title, tree1Index, tree2Index);
    const svgContainer = container.body.querySelector('.interpolation-svg-container');
    const svgId = this.generateId('interpolation-svg');

    // Create single SVG for interpolation
    this.createSingleSVG(svgId, svgContainer);

    // Get interpolation sequence
    const sequence = this.getInterpolationSequence(treeList, tree1Index, tree2Index);

    // Setup interpolation controls
    this.setupInterpolationControls(container, {
      sequence,
      svgId,
      animationDuration,
      ...renderOptions
    });

    // Start with first frame
    await this.renderInterpolationFrame(sequence[0], svgId, renderOptions);

    return container;
  }

  /**
   * Generate unique ID
   */
  generateId(prefix = 'tree') {
    return `${prefix}-${Date.now()}-${++this.idCounter}`;
  }

  /**
   * Validate input parameters
   */
  validateInputs(treeList, tree1Index, tree2Index) {
    if (!Array.isArray(treeList)) {
      throw new Error("Invalid tree list provided");
    }
    if (!treeList[tree1Index] || !treeList[tree2Index]) {
      throw new Error(`Invalid tree indices: ${tree1Index}, ${tree2Index}`);
    }
    if (tree1Index === tree2Index) {
      throw new Error("Cannot compare tree with itself");
    }
  }

  /**
   * Create comparison modal with WinBox
   */
  createComparisonModal(title) {
    return new window.WinBox({
      title,
      width: "90%",
      height: "90%",
      x: "center",
      y: "center",
      class: ["tree-comparison-winbox"],
      background: "#373747",
      border: 2,
      html: `
        <div class="tree-comparison-modal">
          <div class="comparison-header">
            <h3>${title}</h3>
          </div>
          <div class="tree-comparison-row"></div>
          <div class="comparison-controls">
            <div class="control-group">
              <label class="control-label">Font Size:</label>
              <div class="control-input-group">
                <input type="range" class="mdc-slider font-size-slider" min="0.5" max="3" step="0.1" value="1.7">
                <span class="control-value-display font-size-value">1.7</span>
              </div>
            </div>
            <div class="control-group">
              <label class="control-label">Stroke Width:</label>
              <div class="control-input-group">
                <input type="range" class="mdc-slider stroke-width-slider" min="0.5" max="5" step="0.1" value="1">
                <span class="control-value-display stroke-width-value">1</span>
              </div>
            </div>
            <div class="control-group switch-row">
              <label class="control-label">Ignore Branch Lengths:</label>
              <label class="switch">
                <input type="checkbox" class="ignore-branches-checkbox">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
          <div class="comparison-footer">
            <button class="md-button secondary close-btn">Close</button>
          </div>
        </div>
      `
    });
  }

  /**
   * Create interpolation modal with WinBox
   */
  createInterpolationModal(title, tree1Index, tree2Index) {
    const tree1Label = Math.floor(tree1Index / 5) + 1;
    const tree2Label = Math.floor(tree2Index / 5) + 1;

    return new window.WinBox({
      title,
      width: "80%",
      height: "85%",
      x: "center",
      y: "center",
      class: ["tree-interpolation-winbox"],
      background: "#373747",
      border: 2,
      html: `
        <div class="interpolation-container">
          <div class="interpolation-header">
            <h3>Tree Interpolation Animation</h3>
            <p>Transition from Tree ${tree1Label} to Tree ${tree2Label}</p>
            <div class="current-step-info">
              <span class="current-step-label">Current: Tree ${tree1Label}</span>
            </div>
          </div>
          <div class="interpolation-content">
            <div class="interpolation-svg-container"></div>
          </div>
          <div class="interpolation-controls">
            <button class="btn btn-primary" data-action="play">▶ Play</button>
            <button class="btn" data-action="pause">⏸ Pause</button>
            <button class="btn" data-action="reset">⏮ Reset</button>
            <button class="btn" data-action="step-forward">⏭ Step</button>
            <button class="btn" data-action="step-backward">⏮ Step Back</button>
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
      `
    });
  }

  /**
   * Create SVG for side-by-side comparison
   */
  createComparisonSVG(svgId, container) {
    container.innerHTML = '';

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", svgId);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";

    container.appendChild(svg);

    // Force layout computation to get accurate dimensions
    container.offsetHeight; // Force layout

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || 800, 600);
    const height = Math.max(rect.height || 600, 400);

    // Set explicit width and height along with viewBox for better sizing control
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Create tree groups with better positioning for comparison
    const tree1GroupId = `${svgId}-tree1`;
    const tree2GroupId = `${svgId}-tree2`;

    // Calculate available space for each tree (account for padding and separator)
    const availableWidth = width * 0.45; // 45% each side, 10% for spacing
    const maxTreeRadius = Math.min(availableWidth * 0.4, height * 0.4); // Ensure trees fit within containers

    const tree1Group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tree1Group.setAttribute("id", tree1GroupId);
    tree1Group.setAttribute("class", "tree-container");
    // Position trees closer to center with more appropriate spacing
    tree1Group.setAttribute("transform", `translate(${width * 0.25}, ${height / 2})`);
    tree1Group.setAttribute("data-max-radius", maxTreeRadius); // Store for TreeDrawer
    svg.appendChild(tree1Group);

    const tree2Group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tree2Group.setAttribute("id", tree2GroupId);
    tree2Group.setAttribute("class", "tree-container");
    tree2Group.setAttribute("transform", `translate(${width * 0.75}, ${height / 2})`);
    tree2Group.setAttribute("data-max-radius", maxTreeRadius); // Store for TreeDrawer
    svg.appendChild(tree2Group);

    // Add separator line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", width / 2);
    line.setAttribute("y1", 20);
    line.setAttribute("x2", width / 2);
    line.setAttribute("y2", height - 20);
    line.setAttribute("stroke", "rgba(255,255,255,0.2)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    return { tree1GroupId, tree2GroupId };
  }

  /**
   * Create SVG for single tree interpolation
   */
  createSingleSVG(svgId, container) {
    container.innerHTML = '';

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", svgId);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";

    container.appendChild(svg);

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || 600, 400);
    const height = Math.max(rect.height || 500, 400);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const treeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    treeGroup.setAttribute("id", `${svgId}-tree`);
    treeGroup.setAttribute("class", "tree-container");
    treeGroup.setAttribute("transform", `translate(${width / 2}, ${height / 2})`);
    svg.appendChild(treeGroup);

    return `${svgId}-tree`;
  }

  /**
   * Setup comparison controls with event handlers
   */
  setupComparisonControls(container, params) {
    const body = container.body;
    let renderOptions = { ...params.renderOptions };

    // Font size control
    const fontSlider = body.querySelector('.font-size-slider');
    const fontValue = body.querySelector('.font-size-value');
    fontSlider.addEventListener('input', async (e) => {
      const value = parseFloat(e.target.value);
      fontValue.textContent = value.toFixed(1);
      renderOptions.fontSize = value;
      await this.renderComparison({ ...params, ...renderOptions });
    });

    // Stroke width control
    const strokeSlider = body.querySelector('.stroke-width-slider');
    const strokeValue = body.querySelector('.stroke-width-value');
    strokeSlider.addEventListener('input', async (e) => {
      const value = parseFloat(e.target.value);
      strokeValue.textContent = value.toFixed(1);
      renderOptions.strokeWidth = value;
      await this.renderComparison({ ...params, ...renderOptions });
    });

    // Branch length toggle
    const branchCheckbox = body.querySelector('.ignore-branches-checkbox');
    branchCheckbox.addEventListener('change', async (e) => {
      renderOptions.ignoreBranchLengths = e.target.checked;
      await this.renderComparison({ ...params, ...renderOptions });
    });

    // Close button
    const closeBtn = body.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => container.close());
  }

  /**
   * Setup interpolation controls with event handlers
   */
  setupInterpolationControls(container, params) {
    const body = container.body;
    const state = {
      currentStep: 0,
      isPlaying: false,
      animationDuration: params.animationDuration
    };

    // Control buttons
    body.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      switch (action) {
        case 'play':
          await this.playInterpolation(params, state);
          break;
        case 'pause':
          this.pauseInterpolation(state);
          break;
        case 'reset':
          await this.resetInterpolation(params, state);
          break;
        case 'step-forward':
          await this.stepForward(params, state);
          break;
        case 'step-backward':
          await this.stepBackward(params, state);
          break;
      }
    });

    // Progress slider
    const progressSlider = body.querySelector('.progress-slider');
    progressSlider.addEventListener('input', async (e) => {
      const percentage = parseInt(e.target.value);
      const stepIndex = Math.round((percentage / 100) * (params.sequence.length - 1));
      await this.seekToStep(params, state, stepIndex);
    });

    // Speed control
    const speedSelect = body.querySelector('.speed-select');
    speedSelect.addEventListener('change', (e) => {
      state.animationDuration = parseInt(e.target.value);
    });

    // Store state for access
    container.interpolationState = state;
  }

  /**
   * Render side-by-side comparison
   */
  async renderComparison(params) {
    const {
      treeList,
      tree1Index,
      tree2Index,
      tree1GroupId,
      tree2GroupId,
      fontSize = 1.7,
      strokeWidth = 1,
      ignoreBranchLengths = false,
      leaveOrder = [],
      toBeHighlighted1 = [],
      toBeHighlighted2 = [],
      // Support both new (separate) and old (single) parameter formats
      toBeHighlighted = []
    } = params;

    // If separate highlighting parameters are not provided, use the single parameter for both trees
    const highlightData1 = toBeHighlighted1.length > 0 ? toBeHighlighted1 : toBeHighlighted;
    const highlightData2 = toBeHighlighted2.length > 0 ? toBeHighlighted2 : toBeHighlighted;

    // Debug logging for highlighting
    console.log('[TreeComparison] Highlighting data:', {
      toBeHighlighted: toBeHighlighted,
      toBeHighlighted1: toBeHighlighted1,
      toBeHighlighted2: toBeHighlighted2,
      highlightData1: highlightData1,
      highlightData2: highlightData2
    });

    // Clear existing content
    document.getElementById(tree1GroupId).innerHTML = '';
    document.getElementById(tree2GroupId).innerHTML = '';

    const renderOptions = {
      fontSize,
      strokeWidth,
      drawDuration: 0
    };

    // Get the container elements to determine available space
    const tree1Container = document.getElementById(tree1GroupId);
    const maxRadius = tree1Container?.getAttribute('data-max-radius') || 150;

    try {
      // Render tree 1 with size constraints
      const tree1Layout = createRadialTreeLayout(treeList[tree1Index], ignoreBranchLengths, {
        containerId: tree1GroupId,
        maxRadius: parseFloat(maxRadius),
        width: 300, // Constraint for comparison view
        height: 300
      });
      // Get TreeAnimationController instance for tree 1
      const tree1Controller = this.getTreeController(tree1GroupId);
      
      // Apply comparison-specific styling adjustments  
      const isComparison = tree1GroupId !== "application";
      const fontSizeAdjustment = isComparison ? 0.75 : 1;
      const strokeAdjustment = isComparison ? 0.8 : 1;
      
      const fontSize = renderOptions.fontSize || 1.7;
      const strokeWidth = renderOptions.strokeWidth || 1;
      const finalFontSize = `${fontSize * fontSizeAdjustment}em`;
      const finalStrokeWidth = strokeWidth * strokeAdjustment;

      // Update parameters using the instance pattern
      tree1Controller.updateParameters({
        root: tree1Layout.tree,
        drawDuration: renderOptions.drawDuration || 0,
        marked: [new Set(highlightData1)],
        fontSize: finalFontSize,
        strokeWidth: finalStrokeWidth,
        monophyleticColoring: true
      });

      // Render using instance method
      await tree1Controller.renderAllElements();

      // Render tree 2 with size constraints
      const tree2Layout = createRadialTreeLayout(treeList[tree2Index], ignoreBranchLengths, {
        containerId: tree2GroupId,
        maxRadius: parseFloat(maxRadius),
        width: 300, // Constraint for comparison view
        height: 300
      });
      // Get TreeAnimationController instance for tree 2
      const tree2Controller = this.getTreeController(tree2GroupId);

      // Update parameters using the instance pattern (same styling as tree 1)
      tree2Controller.updateParameters({
        root: tree2Layout.tree,
        drawDuration: renderOptions.drawDuration || 0,
        marked: [new Set(highlightData2)],
        fontSize: finalFontSize,
        strokeWidth: finalStrokeWidth,
        monophyleticColoring: true
      });

      // Render using instance method
      await tree2Controller.renderAllElements();
    } catch (error) {
      console.error('[TreeComparison] Tree rendering failed:', error);
      throw error;
    }
  }

  /**
   * Get interpolation sequence from tree list
   */
  getInterpolationSequence(treeList, tree1Index, tree2Index) {
    const sequence = [];
    const realTree1Index = Math.floor(tree1Index / 5) * 5;
    const realTree2Index = Math.floor(tree2Index / 5) * 5;

    if (realTree2Index === realTree1Index + 5) {
      // Sequential trees - use interpolation
      for (let i = realTree1Index; i <= realTree1Index + 4; i++) {
        if (treeList[i]) {
          sequence.push({
            tree: treeList[i],
            index: i,
            label: i === realTree1Index ? `Tree ${Math.floor(i / 5) + 1}` : `Step ${i - realTree1Index}`
          });
        }
      }
      if (treeList[realTree2Index]) {
        sequence.push({
          tree: treeList[realTree2Index],
          index: realTree2Index,
          label: `Tree ${Math.floor(realTree2Index / 5) + 1}`
        });
      }
    } else {
      // Non-sequential - just show the two trees
      sequence.push({
        tree: treeList[realTree1Index],
        index: realTree1Index,
        label: `Tree ${Math.floor(realTree1Index / 5) + 1}`
      });
      sequence.push({
        tree: treeList[realTree2Index],
        index: realTree2Index,
        label: `Tree ${Math.floor(realTree2Index / 5) + 1}`
      });
    }

    return sequence;
  }

  /**
   * Render single interpolation frame
   */
  async renderInterpolationFrame(frame, svgId, options) {
    const treeGroupId = `${svgId}-tree`;
    const treeGroup = document.getElementById(treeGroupId);
    treeGroup.innerHTML = '';

    const {
      fontSize = 1.7,
      strokeWidth = 1,
      ignoreBranchLengths = false,
      leaveOrder = [],
      toBeHighlighted = []
    } = options;

    const treeLayout = createRadialTreeLayout(frame.tree, ignoreBranchLengths);
    try {
      // Get TreeAnimationController instance for interpolation frame
      const frameController = this.getTreeController(treeGroupId);
      
      // Apply comparison-specific styling adjustments  
      const isComparison = treeGroupId !== "application";
      const fontSizeAdjustment = isComparison ? 0.75 : 1;
      const strokeAdjustment = isComparison ? 0.8 : 1;
      
      const finalFontSize = `${fontSize * fontSizeAdjustment}em`;
      const finalStrokeWidth = strokeWidth * strokeAdjustment;

      // Update parameters using the instance pattern
      frameController.updateParameters({
        root: treeLayout.tree,
        drawDuration: 200,
        marked: [new Set(toBeHighlighted)],
        fontSize: finalFontSize,
        strokeWidth: finalStrokeWidth,
        monophyleticColoring: true
      });

      // Render using instance method
      await frameController.renderAllElements();
    } catch (error) {
      console.error('[TreeComparison] Interpolation frame rendering failed:', error);
      throw error;
    }

    return frame;
  }

  /**
   * Play interpolation animation
   */
  async playInterpolation(params, state) {
    state.isPlaying = true;
    const stepDuration = state.animationDuration / params.sequence.length;

    for (let i = state.currentStep; i < params.sequence.length && state.isPlaying; i++) {
      await this.renderInterpolationFrame(params.sequence[i], params.svgId, params);
      this.updateProgress(i, params.sequence[i].label, params.sequence.length);
      state.currentStep = i;

      if (i < params.sequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }

    state.isPlaying = false;
  }

  /**
   * Pause interpolation
   */
  pauseInterpolation(state) {
    state.isPlaying = false;
  }

  /**
   * Reset interpolation to beginning
   */
  async resetInterpolation(params, state) {
    this.pauseInterpolation(state);
    state.currentStep = 0;
    await this.renderInterpolationFrame(params.sequence[0], params.svgId, params);
    this.updateProgress(0, params.sequence[0].label, params.sequence.length);
  }

  /**
   * Step forward one frame
   */
  async stepForward(params, state) {
    const nextStep = Math.min(state.currentStep + 1, params.sequence.length - 1);
    await this.renderInterpolationFrame(params.sequence[nextStep], params.svgId, params);
    this.updateProgress(nextStep, params.sequence[nextStep].label, params.sequence.length);
    state.currentStep = nextStep;
  }

  /**
   * Step backward one frame
   */
  async stepBackward(params, state) {
    const prevStep = Math.max(state.currentStep - 1, 0);
    await this.renderInterpolationFrame(params.sequence[prevStep], params.svgId, params);
    this.updateProgress(prevStep, params.sequence[prevStep].label, params.sequence.length);
    state.currentStep = prevStep;
  }

  /**
   * Seek to specific step
   */
  async seekToStep(params, state, stepIndex) {
    state.currentStep = stepIndex;
    await this.renderInterpolationFrame(params.sequence[stepIndex], params.svgId, params);
    this.updateProgress(stepIndex, params.sequence[stepIndex].label, params.sequence.length);
  }

  /**
   * Update progress display
   */
  updateProgress(stepIndex, stepLabel, totalSteps) {
    const percentage = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0;

    const progressValue = document.querySelector('.progress-value');
    const progressSlider = document.querySelector('.progress-slider');
    const stepLabelElement = document.querySelector('.current-step-label');

    if (progressValue) progressValue.textContent = `${Math.round(percentage)}%`;
    if (progressSlider) progressSlider.value = percentage;
    if (stepLabelElement) stepLabelElement.textContent = `Current: ${stepLabel}`;
  }
}

// Create singleton instance
const treeComparison = new TreeComparison();

// Export simplified API
export async function createSideBySideComparison(options) {
  return await treeComparison.createComparison(options);
}

export async function createInterpolationAnimation(options) {
  return await treeComparison.createInterpolation(options);
}

// Legacy API compatibility
export async function createSideBySideComparisonWindow(options) {
  return await createSideBySideComparison(options);
}

export async function createSideBySideComparisonModal(options) {
  return await createSideBySideComparison(options);
}

export async function createInterpolationWindow(options) {
  return await createInterpolationAnimation(options);
}

export async function createInterpolationModal(options) {
  return await createInterpolationAnimation(options);
}
