import { getColorScheme } from './treeColoring/ColorSchemePresets.js';
import { UIComponentFactory } from './treeColoring/UIComponentFactory.js';
import { 
  getGroupForTaxon, 
  detectUsefulSeparators, 
  generateGroups as generateTaxaGroups,
  mapStrategyName 
} from './treeColoring/TaxaGroupingUtils.js';

// Import the dedicated CSS file for taxa coloring modal
const taxaColoringCSS = document.createElement('link');
taxaColoringCSS.rel = 'stylesheet';
taxaColoringCSS.href = '/css/taxa-coloring-modal.css';
document.head.appendChild(taxaColoringCSS);

/**
 * Taxa coloring modal with improved UX and cleaner code
 * Styles are loaded from external CSS file: /css/taxa-coloring-modal.css
 */

/**
 * Simplified separation strategies that are intuitive to users
 */
const SEPARATION_STRATEGIES = {
  'prefix': {
    label: 'Prefix (before first separator)',
    description: 'Group by text before the first separator',
    example: 'Species_001_v1 → Species'
  },
  'suffix': {
    label: 'Suffix (after last separator)', 
    description: 'Group by text after the last separator',
    example: 'Species_001_v1 → v1'
  },
  'middle': {
    label: 'Middle section',
    description: 'Group by text between separators',
    example: 'Species_001_v1 → 001'
  },
  'first-letter': {
    label: 'First letter',
    description: 'Group by the first letter of the name',
    example: 'Species_001_v1 → S'
  }
};

/**
 * Simplified separation engine for better UX
 */
class SeparationEngine {
  constructor(taxaNames) {
    this.taxaNames = taxaNames || [];
  }

  /**
   * Detect useful separators in the taxa names
   */
  detectSeparators() {
    return detectUsefulSeparators(this.taxaNames);
  }

  /**
   * Generate groups using a strategy
   */
  generateGroups(separator, strategy) {
    // Map user-friendly strategy names to internal names
    const mappedStrategy = mapStrategyName(strategy);
    return generateTaxaGroups(this.taxaNames, separator, mappedStrategy);
  }

  /**
   * Get group name for a taxon using centralized logic
   */
  getGroupName(taxon, separator, strategy) {
    // Map simplified strategy names to TaxaGroupingUtils strategy names
    const strategyMap = {
      'prefix': 'first',
      'suffix': 'last',
      'middle': 'nth-2',
      'first-letter': 'first-letter'
    };
    
    const mappedStrategy = strategyMap[strategy] || strategy;
    const group = getGroupForTaxon(taxon, separator, mappedStrategy);
    
    // Return 'Ungrouped' if no group found
    return group || 'Ungrouped';
  }
}

/**
 * Color scheme manager
 */
class ColorSchemeManager {
  constructor(originalColorMap = {}) {
    this.originalColorMap = originalColorMap;
    this.taxaColorMap = new Map();
    this.groupColorMap = new Map();
    this.initializeFromOriginal();
  }

  initializeFromOriginal() {
    Object.entries(this.originalColorMap).forEach(([taxon, color]) => {
      this.taxaColorMap.set(taxon, color);
    });
  }

  applyScheme(schemeName, targets) {
    const scheme = getColorScheme(schemeName);
    targets.forEach((target, index) => {
      const color = scheme[index % scheme.length];
      if (target.type === 'taxa') {
        this.taxaColorMap.set(target.name, color);
      } else {
        this.groupColorMap.set(target.name, color);
      }
    });
  }

  applyColorSchemeToTaxa(schemeName, taxaNames) {
    const scheme = getColorScheme(schemeName);
    taxaNames.forEach((taxon, index) => {
      const color = scheme[index % scheme.length];
      this.taxaColorMap.set(taxon, color);
    });
  }

  applyColorSchemeToGroups(schemeName, groups) {
    const scheme = getColorScheme(schemeName);
    groups.forEach((group, index) => {
      const color = scheme[index % scheme.length];
      this.groupColorMap.set(group.name, color);
    });
  }

  getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
  }

  reset() {
    this.taxaColorMap.clear();
    this.groupColorMap.clear();
    this.initializeFromOriginal();
  }
}

/**
 * Enhanced TaxaColoring with improved UX and cleaner code
 */
export default class TaxaColoring {
  constructor(taxaNames, originalColorMap, onComplete) {
    this.taxaNames = taxaNames || [];
    this.onComplete = onComplete || (() => {});
    this.currentMode = "taxa";
    this.selectedSeparator = null;
    this.selectedStrategy = 'prefix';
    
    // Initialize engines
    this.separationEngine = new SeparationEngine(this.taxaNames);
    this.colorManager = new ColorSchemeManager(originalColorMap);
    
    // UI state
    this.isLoading = false;
    this.currentGroups = [];
    
    this.initialize();
  }

  initialize() {
    this.ensureStylesLoaded();
    this.createModal();
  }

  ensureStylesLoaded() {
    // CSS is now loaded via external file in the constructor
  }

  createModal() {
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'taxa-modal-content';

    // Create WinBox modal with consistent styling
    this.modal = new window.WinBox({
      title: 'Taxa Coloring',
      width: '800px',
      height: '85%',
      x: 'center',
      y: 'center',
      mount: modalContent,
      onclose: () => this.handleClose(),
      class: ["no-full"],
      background: '#373747',
      border: 2
    });

    this.renderModal(modalContent);
  }

  renderModal(container) {
    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'taxa-modal-header';
    header.innerHTML = `
      <h2 class="taxa-modal-title">Taxa Coloring</h2>
    `;
    container.appendChild(header);

    // Mode selector
    this.renderModeSelector(container);

    // Dynamic content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'taxa-content-area';
    container.appendChild(this.contentArea);

    // Actions
    this.renderActions(container);

    // Initial content
    this.updateContent();
  }

  renderModeSelector(container) {
    const modeSelector = document.createElement('div');
    modeSelector.className = 'taxa-mode-selector';

    const modes = [
      { key: 'taxa', label: 'Individual Taxa' },
      { key: 'groups', label: 'Group by Pattern' }
    ];

    modes.forEach(mode => {
      const button = document.createElement('button');
      button.className = `taxa-mode-button ${this.currentMode === mode.key ? 'active' : ''}`;
      button.textContent = mode.label;
      button.onclick = () => this.setMode(mode.key);
      modeSelector.appendChild(button);
    });

    container.appendChild(modeSelector);
  }

  renderActions(container) {
    const actions = document.createElement('div');
    actions.className = 'taxa-actions';

    const buttons = [
      { text: 'Reset', className: 'secondary', action: () => this.reset() },
      { text: 'Cancel', className: 'secondary', action: () => this.modal.close() },
      { text: 'Apply', className: 'primary', action: () => this.apply() }
    ];

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = `taxa-button ${btn.className}`;
      button.textContent = btn.text;
      button.onclick = btn.action;
      actions.appendChild(button);
    });

    container.appendChild(actions);
  }

  setMode(mode) {
    this.currentMode = mode;
    this.updateContent();
    
    // Update mode buttons
    document.querySelectorAll('.taxa-mode-button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent === (mode === 'taxa' ? 'Individual Taxa' : 'Group by Pattern')) {
        btn.classList.add('active');
      }
    });
  }

  updateContent() {
    this.contentArea.innerHTML = '';

    if (this.currentMode === 'taxa') {
      this.renderTaxaMode();
    } else {
      this.renderGroupsMode();
    }
  }

  renderTaxaMode() {
    if (!this.taxaNames.length) {
      this.renderEmptyState('No taxa available for coloring');
      return;
    }

    // Color scheme selector
    this.renderColorSchemeSelector();

    // Taxa color grid
    const section = document.createElement('div');
    section.className = 'taxa-section';
    section.innerHTML = `<h3 class="taxa-section-title">Individual Taxa Colors (${this.taxaNames.length})</h3>`;

    const colorGrid = document.createElement('div');
    colorGrid.className = 'taxa-color-grid';

    this.taxaNames.forEach(taxon => {
      const item = document.createElement('div');
      item.className = 'taxa-color-item';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'taxa-color-input';
      colorInput.value = this.colorManager.taxaColorMap.get(taxon) || '#000000';
      colorInput.onchange = (e) => {
        this.colorManager.taxaColorMap.set(taxon, e.target.value);
      };

      const label = document.createElement('span');
      label.className = 'taxa-color-label';
      label.textContent = taxon;

      item.appendChild(colorInput);
      item.appendChild(label);
      colorGrid.appendChild(item);
    });

    section.appendChild(colorGrid);
    this.contentArea.appendChild(section);
  }

  renderGroupsMode() {
    // Separation controls
    this.renderSeparationControls();

    // Groups preview and color scheme selector
    if (this.selectedSeparator && this.selectedStrategy) {
      this.renderGroupsLayoutWithColorSchemes();
    }
  }

  renderSeparationControls() {
    const panel = document.createElement('div');
    panel.className = 'taxa-separation-panel';

    // Separator selection
    const separatorSection = document.createElement('div');
    separatorSection.innerHTML = '<h3 class="taxa-section-title">Choose Separator</h3>';

    const separators = this.separationEngine.detectSeparators();
    
    if (separators.length === 0) {
      separatorSection.innerHTML += '<p>No useful separators detected in taxa names.</p>';
    } else {
      const separatorGrid = document.createElement('div');
      separatorGrid.className = 'taxa-separator-grid';

      separators.forEach(sep => {
        const option = document.createElement('button');
        option.className = `taxa-separator-option ${this.selectedSeparator === sep.char ? 'selected' : ''}`;
        option.innerHTML = `
          <div><strong>${sep.displayName}</strong></div>
          <div style="font-size: 0.8rem; color: #b0b0b0">${sep.usage}% of taxa</div>
        `;
        option.onclick = () => this.selectSeparator(sep.char);
        separatorGrid.appendChild(option);
      });

      separatorSection.appendChild(separatorGrid);
    }

    panel.appendChild(separatorSection);

    // Strategy selection
    if (this.selectedSeparator) {
      const strategySection = document.createElement('div');
      strategySection.innerHTML = '<h3 class="taxa-section-title">Choose Grouping Strategy</h3>';

      const strategyGrid = document.createElement('div');
      strategyGrid.className = 'taxa-strategy-grid';

      Object.entries(SEPARATION_STRATEGIES).forEach(([key, strategy]) => {
        if (key === 'first-letter' || this.selectedSeparator) {
          const card = document.createElement('div');
          card.className = `taxa-strategy-card ${this.selectedStrategy === key ? 'selected' : ''}`;
          card.innerHTML = `
            <div class="taxa-strategy-title">${strategy.label}</div>
            <div class="taxa-strategy-example">${strategy.example}</div>
          `;
          card.onclick = () => this.selectStrategy(key);
          strategyGrid.appendChild(card);
        }
      });

      strategySection.appendChild(strategyGrid);
      panel.appendChild(strategySection);
    }

    this.contentArea.appendChild(panel);
  }

  renderGroupsLayoutWithColorSchemes() {
    this.currentGroups = this.separationEngine.generateGroups(this.selectedSeparator, this.selectedStrategy);
    
    if (this.currentGroups.length === 0) {
      this.renderEmptyState('No groups found with current settings');
      return;
    }

    // Create layout container
    const layout = document.createElement('div');
    layout.className = 'taxa-groups-layout';

    // Left side: Groups preview
    const preview = document.createElement('div');
    preview.className = 'taxa-groups-preview';
    preview.innerHTML = `<h3 class="taxa-section-title">Groups Preview (${this.currentGroups.length})</h3>`;

    this.currentGroups.forEach(group => {
      const item = document.createElement('div');
      item.className = 'taxa-group-item';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'taxa-group-color';
      colorInput.value = this.colorManager.groupColorMap.get(group.name) || this.colorManager.getRandomColor();
      colorInput.onchange = (e) => {
        this.colorManager.groupColorMap.set(group.name, e.target.value);
      };

      // Ensure the group has a color
      if (!this.colorManager.groupColorMap.has(group.name)) {
        this.colorManager.groupColorMap.set(group.name, colorInput.value);
      }

      const name = document.createElement('span');
      name.className = 'taxa-group-name';
      name.textContent = group.name;

      const count = document.createElement('span');
      count.className = 'taxa-group-count';
      count.textContent = group.count;

      item.appendChild(colorInput);
      item.appendChild(name);
      item.appendChild(count);
      preview.appendChild(item);
    });

    // Right side: Color scheme selector
    const colorSchemeContainer = document.createElement('div');
    const schemeSelectorUI = UIComponentFactory.createColorSchemePresetSelector({
      onSchemeChange: (schemeName) => this.applyColorScheme(schemeName)
    });
    colorSchemeContainer.appendChild(schemeSelectorUI);

    layout.appendChild(preview);
    layout.appendChild(colorSchemeContainer);
    this.contentArea.appendChild(layout);
  }

  renderGroupsPreview() {
    // This method is kept for backward compatibility but not used
    this.renderGroupsLayoutWithColorSchemes();
  }

  renderColorSchemeSelector() {
    const schemeSelectorUI = UIComponentFactory.createColorSchemePresetSelector({
      onSchemeChange: (schemeName) => this.applyColorScheme(schemeName)
    });
    
    // Apply consistent theming to match the rest of the modal
    schemeSelectorUI.style.marginBottom = '20px';
    
    this.contentArea.appendChild(schemeSelectorUI);
  }

  renderEmptyState(message) {
    const empty = document.createElement('div');
    empty.className = 'taxa-empty-state';
    empty.textContent = message;
    this.contentArea.appendChild(empty);
  }

  selectSeparator(separator) {
    this.selectedSeparator = separator;
    this.updateContent();
  }

  selectStrategy(strategy) {
    this.selectedStrategy = strategy;
    this.updateContent();
  }

  reset() {
    this.colorManager.reset();
    this.updateContent();
  }

  applyColorScheme(schemeName) {
    if (this.currentMode === 'taxa') {
      this.colorManager.applyColorSchemeToTaxa(schemeName, this.taxaNames);
    } else if (this.currentMode === 'groups') {
      this.colorManager.applyColorSchemeToGroups(schemeName, this.currentGroups);
    }
    this.updateContent();
  }

  apply() {
    const result = {
      mode: this.currentMode,
      taxaColorMap: this.colorManager.taxaColorMap,
      groupColorMap: this.colorManager.groupColorMap,
      separator: this.selectedSeparator,
      strategyType: mapStrategyName(this.selectedStrategy)
    };

    this.onComplete(result);
    this.modal.close();
  }

  handleClose() {
    // Cleanup if needed
  }
}