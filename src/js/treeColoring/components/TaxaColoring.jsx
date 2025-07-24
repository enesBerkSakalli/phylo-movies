import { getColorScheme } from '../constants/Colors.js';
import { UIComponentFactory } from './UIComponentFactory.js';
import { SEPARATION_STRATEGIES, mapStrategyName } from '../constants/Strategies.js';
import { detectUsefulSeparators } from '../utils/SeparatorUtils.js';
import { generateGroups as generateTaxaGroups } from '../utils/GroupingUtils.js';

// Import the component's dedicated stylesheet. Vite will handle loading.
import '/src/css/taxa-coloring-window.css';

class ColorSchemeManager {
  constructor(originalColorMap = {}) {
    this.originalColorMap = originalColorMap;
    this.taxaColorMap = new Map(Object.entries(originalColorMap));
    this.groupColorMap = new Map();
  }
  
  applyColorScheme(schemeName, targets, isGroup) {
    const scheme = getColorScheme(schemeName);
    targets.forEach((target, index) => {
      const color = scheme[index % scheme.length];
      const name = isGroup ? target.name : target;
      const map = isGroup ? this.groupColorMap : this.taxaColorMap;
      map.set(name, color);
    });
  }
  
  getRandomColor() { 
    return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`; 
  }
  
  reset() {
    this.taxaColorMap = new Map(Object.entries(this.originalColorMap));
    this.groupColorMap.clear();
  }
}

export default class TaxaColoring {
  constructor(taxaNames, originalColorMap, onComplete) {
    this.taxaNames = taxaNames || [];
    this.onComplete = onComplete || (() => {});
    this.currentMode = "taxa";
    this.selectedSeparator = null;
    this.selectedStrategy = 'prefix';

    this.colorManager = new ColorSchemeManager(originalColorMap);
    this.currentGroups = [];
    this.cachedSeparators = null; // Cache separators to avoid recalculation

    this.createWindow();
  }

  async createWindow() {
    try {
      const { windowContent, colorWin } = await UIComponentFactory.createColorAssignmentWindow(() => this.handleClose());
      this.winBoxInstance = colorWin;
      this.container = windowContent;
      this.render();
    } catch (error) {
      console.error('Failed to create taxa coloring window:', error);
      alert(`Failed to open taxa coloring window: ${error.message}`);
    }
  }

  render() {
    this.container.innerHTML = ''; // Clear previous content

    // --- Header ---
    const header = document.createElement('header');
    header.className = 'tc-header';
    const title = document.createElement('h2');
    title.className = 'tc-title';
    title.textContent = 'Taxa Color Assignment';
    header.appendChild(title);

    // --- Main Content ---
    this.contentArea = document.createElement('main');
    this.contentArea.className = 'tc-content';

    // --- Footer ---
    const footer = document.createElement('footer');
    footer.className = 'tc-actions';
    this.renderActions(footer);

    this.container.append(header, this.contentArea, footer);
    this.updateContent();
  }

  updateContent() {
    this.contentArea.innerHTML = '';
    this.renderModeSelector();
    if (this.currentMode === 'taxa') {
      this.renderTaxaMode();
    } else {
      this.renderGroupsMode();
    }
  }

  renderModeSelector() {
    const modeSelector = document.createElement('div');
    modeSelector.className = 'tc-mode-selector';
    ['taxa', 'groups'].forEach(mode => {
      const button = document.createElement('button');
      button.className = `md-button ${this.currentMode !== mode ? 'secondary' : ''}`;
      button.textContent = mode === 'taxa' ? 'Individual Taxa' : 'Group by Pattern';
      button.onclick = () => {
        this.currentMode = mode;
        this.updateContent();
      };
      modeSelector.appendChild(button);
    });
    this.contentArea.appendChild(modeSelector);
  }

  renderActions(footer) {
    footer.innerHTML = '';
    
    const buttonData = [
      { text: 'Reset', className: 'md-button secondary', action: () => this.reset() },
      { text: 'Cancel', className: 'md-button secondary', action: () => this.winBoxInstance.close() },
      { text: 'Apply', className: 'md-button', action: () => this.apply() }
    ];

    const fragment = document.createDocumentFragment();
    buttonData.forEach(({ text, className, action }) => {
      const button = document.createElement('button');
      button.className = className;
      button.textContent = text;
      button.onclick = action;
      fragment.appendChild(button);
    });
    
    footer.appendChild(fragment);
  }

  renderTaxaMode() {
    if (!this.taxaNames.length) {
      this.renderEmptyState('No taxa available for coloring.');
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    const schemeSelector = UIComponentFactory.createColorSchemeSelector({
      onSchemeChange: (schemeName) => this.applyColorScheme(schemeName, this.taxaNames, false),
    });
    
    const section = document.createElement('div');
    section.className = 'tc-section';
    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = `Individual Colors (${this.taxaNames.length})`;
    section.appendChild(title);

    const colorGrid = UIComponentFactory.createColorInputGrid();
    this.taxaNames.forEach(taxon => {
      const colorInput = UIComponentFactory.createColorInput(
        taxon,
        this.colorManager.taxaColorMap.get(taxon) || '#000000',
        (newColor) => this.colorManager.taxaColorMap.set(taxon, newColor)
      );
      colorGrid.appendChild(colorInput);
    });
    section.appendChild(colorGrid);
    
    fragment.append(schemeSelector, section);
    this.contentArea.appendChild(fragment);
  }

  renderGroupsMode() {
    this.renderSeparationControls();
    // Only regenerate groups if selection changed
    if (this.selectedSeparator && this.selectedStrategy) {
      this.currentGroups = generateTaxaGroups(this.taxaNames, this.selectedSeparator, mapStrategyName(this.selectedStrategy));
      this.renderGroupsLayout();
    }
  }

  renderSeparationControls() {
    const card = document.createElement('div');
    card.classList.add('card');
    
    // Cache separators to avoid recalculation
    if (!this.cachedSeparators) {
      this.cachedSeparators = detectUsefulSeparators(this.taxaNames);
    }
    const separators = this.cachedSeparators;
    
    if (separators.length > 0) {
      const sepSection = this.createSeparatorSection(separators);
      card.appendChild(sepSection);
    }

    if (this.selectedSeparator) {
      const stratSection = this.createStrategySection();
      card.appendChild(stratSection);
    }
    
    this.contentArea.appendChild(card);
  }

  createSeparatorSection(separators) {
    const sepSection = document.createElement('div');
    sepSection.className = 'tc-section';
    sepSection.innerHTML = '<h3 class="tc-section-title">1. Choose Separator</h3>';
    
    const sepGrid = document.createElement('div');
    sepGrid.className = 'tc-button-row';
    
    const fragment = document.createDocumentFragment();
    separators.forEach(sep => {
      const button = document.createElement('button');
      button.className = `md-button ${this.selectedSeparator !== sep.char ? 'secondary' : ''}`;
      button.innerHTML = `<span>${sep.displayName}</span><span class="tc-chip">${sep.usage}%</span>`;
      button.onclick = () => {
        this.selectedSeparator = sep.char;
        this.updateContent();
      };
      fragment.appendChild(button);
    });
    
    sepGrid.appendChild(fragment);
    sepSection.appendChild(sepGrid);
    return sepSection;
  }

  createStrategySection() {
    const stratSection = document.createElement('div');
    stratSection.className = 'tc-section';
    stratSection.innerHTML = '<h3 class="tc-section-title">2. Choose Grouping Strategy</h3>';
    
    const stratGrid = document.createElement('div');
    stratGrid.className = 'tc-button-row';
    
    const fragment = document.createDocumentFragment();
    Object.entries(SEPARATION_STRATEGIES).forEach(([key, { label, example }]) => {
      const button = document.createElement('button');
      button.className = `md-button ${this.selectedStrategy !== key ? 'secondary' : ''}`;
      button.style.flexDirection = 'column';
      button.style.alignItems = 'flex-start';
      button.innerHTML = `<div>${label}</div><div style="font-size:0.8rem;text-transform:none;">${example}</div>`;
      button.onclick = () => {
        this.selectedStrategy = key;
        this.updateContent();
      };
      fragment.appendChild(button);
    });
    
    stratGrid.appendChild(fragment);
    stratSection.appendChild(stratGrid);
    return stratSection;
  }

  renderGroupsLayout() {
    if (!this.currentGroups.length) {
      this.renderEmptyState('No groups found with current settings.');
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    const schemeSelector = UIComponentFactory.createColorSchemeSelector({
      onSchemeChange: (schemeName) => this.applyColorScheme(schemeName, this.currentGroups, true),
    });

    const section = document.createElement('div');
    section.className = 'tc-section';
    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = `Group Colors (${this.currentGroups.length})`;
    section.appendChild(title);

    const colorGrid = UIComponentFactory.createColorInputGrid();
    this.currentGroups.forEach(group => {
      const color = this.colorManager.groupColorMap.get(group.name) || this.colorManager.getRandomColor();
      if (!this.colorManager.groupColorMap.has(group.name)) {
        this.colorManager.groupColorMap.set(group.name, color);
      }
      const colorInput = UIComponentFactory.createColorInput(
        `${group.name} (${group.count})`,
        color,
        (newColor) => this.colorManager.groupColorMap.set(group.name, newColor)
      );
      colorGrid.appendChild(colorInput);
    });
    section.appendChild(colorGrid);
    
    fragment.append(schemeSelector, section);
    this.contentArea.appendChild(fragment);
  }

  renderEmptyState(message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'tc-empty-state';
    emptyState.textContent = message;
    this.contentArea.appendChild(emptyState);
  }

  reset() {
    this.colorManager.reset();
    this.updateContent();
  }

  applyColorScheme(schemeName, targets, isGroup) {
    this.colorManager.applyColorScheme(schemeName, targets, isGroup);
    this.updateContent();
  }

  apply() {
    const result = {
      mode: this.currentMode,
      taxaColorMap: this.colorManager.taxaColorMap,
      groupColorMap: this.colorManager.groupColorMap,
      separator: this.selectedSeparator,
      strategyType: mapStrategyName(this.selectedStrategy),
    };
    this.onComplete(result);
    this.winBoxInstance.close();
  }

  handleClose() {
    // The CSS is now handled by the module system, so no cleanup is needed.
  }
}