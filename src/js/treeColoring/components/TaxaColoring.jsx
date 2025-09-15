import { UIComponentFactory } from './UIComponentFactory.js';
import { useAppStore } from '../../core/store.js';
import { ColorSchemeManager } from '../utils/ColorSchemeManager.js';
import { handleCSVFile, updateCSVGroups } from '../handlers/csvEventHandlers.js';
// --- FIX: Add missing imports for grouping logic ---
import { generateGroups } from '../utils/GroupingUtils.js';
import { mapStrategyName } from '../constants/Strategies.js';

// Only import Material Design components not already loaded by main.js
import '@material/web/chips/chip-set.js';
import '@material/web/chips/filter-chip.js';
import '@material/web/elevation/elevation.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/divider/divider.js';

// Import the component's dedicated stylesheet. Vite will handle loading.
import '/src/css/taxa-coloring-window.css';


export default class TaxaColoring {
  // Static property to track the current instance
  static currentInstance = null;

  constructor(taxaNames, originalColorMap, onComplete) {
    // Close any existing instance before creating a new one
    if (TaxaColoring.currentInstance) {
      TaxaColoring.currentInstance.close();
      TaxaColoring.currentInstance = null;
    }

    // Set this as the current instance
    TaxaColoring.currentInstance = this;

    this.taxaNames = taxaNames || [];
    this.onComplete = onComplete || (() => {});
    this.currentMode = "taxa";
    this.selectedSeparator = null;
    this.selectedStrategy = 'prefix';

    this.colorManager = new ColorSchemeManager(originalColorMap);
    this.currentGroups = [];
    this.cachedSeparators = null; // Cache separators to avoid recalculation
    this.csvGroups = []; // Groups from CSV import
    this.csvTaxaMap = new Map(); // Taxon to group mapping from CSV
    this.csvData = null; // Full CSV parsing result
    this.selectedCSVColumn = null; // Currently selected grouping column

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
    this.container.className = 'tc-container'; // Use CSS class instead of inline styles

    // --- Header with Material Design typography ---
    const header = document.createElement('header');
    header.className = 'tc-header';

    const title = document.createElement('h1');
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

    const modeSelector = UIComponentFactory.createModeSelector({
      currentMode: this.currentMode,
      onModeChange: (newMode) => {
        this.currentMode = newMode;
        this.updateContent();
      }
    });
    this.contentArea.appendChild(modeSelector);

    if (this.currentMode === 'taxa') {
      this.renderTaxaLayout();
    } else if (this.currentMode === 'groups') {
      this.renderGroupsLayout();
    } else if (this.currentMode === 'csv') {
      this.renderCSVLayout();
    }
  }

  renderTaxaLayout() {
    if (!this.taxaNames.length) {
      this.renderEmptyState('No taxa available for coloring.');
      return;
    }

    const fragment = document.createDocumentFragment();

    const schemeSelector = UIComponentFactory.createColorSchemeSelector({
      onSchemeChange: (schemeName) => this.applyColorScheme(schemeName, this.taxaNames, false),
    });
    fragment.appendChild(schemeSelector);

    const taxaColorSection = UIComponentFactory.createTaxaColorSection(this.taxaNames, this.colorManager);
    fragment.appendChild(taxaColorSection);

    this.contentArea.appendChild(fragment);
  }

  renderGroupsLayout() {
    const fragment = document.createDocumentFragment();

    // --- FIX: Always render the strategy selector UI in groups mode ---
    const strategySelector = UIComponentFactory.createGroupingStrategySelector({
      taxaNames: this.taxaNames,
      cachedSeparators: this.cachedSeparators,
      selectedStrategy: this.selectedStrategy,
      selectedSeparator: this.selectedSeparator,
      onStrategyChange: (strategy, separator) => {
        this.selectedStrategy = strategy;
        this.selectedSeparator = separator;
        this.updateGroups(); // Recalculate groups and re-render
      },
      onCacheSeparators: (separators) => {
        this.cachedSeparators = separators;
      }
    });
    fragment.appendChild(strategySelector);

    // --- FIX: Only render the color pickers if groups have been created ---
    if (!this.currentGroups.length) {
      this.renderEmptyState('No groups found with current settings.');
    } else {
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
    }

    this.contentArea.appendChild(fragment);
  }

  renderCSVLayout() {
    const fragment = document.createDocumentFragment();

    // File upload section
    const uploadSection = UIComponentFactory.createCSVUploadSection((file) => this.handleCSVFile(file));
    fragment.appendChild(uploadSection);

    // Column selector and preview section (if CSV loaded)
    if (this.csvData && this.csvGroups.length > 0) {
      // Column selector (if multiple columns available)
      if (this.csvData.groupingColumns.length > 1) {
        const columnSelector = UIComponentFactory.createColumnSelector({
          groupingColumns: this.csvData.groupingColumns,
          columnGroups: this.csvData.columnGroups,
          selectedColumn: this.selectedCSVColumn,
          onColumnChange: (columnName) => {
            this.updateCSVGroups(columnName);
            this.updateContent();
          }
        });
        fragment.appendChild(columnSelector);
      }

      const previewSection = UIComponentFactory.createCSVPreviewSection(this.csvValidation, this.csvGroups);
      fragment.appendChild(previewSection);

      // Color scheme selector
      const schemeSelector = UIComponentFactory.createColorSchemeSelector({
        onSchemeChange: (schemeName) => this.applyColorScheme(schemeName, this.csvGroups, true),
      });
      fragment.appendChild(schemeSelector);

      // Group colors section
      const colorSection = UIComponentFactory.createCSVColorSection(this.csvGroups, this.colorManager);
      fragment.appendChild(colorSection);
    }

    this.contentArea.appendChild(fragment);
  }

  async handleCSVFile(file) {
    await handleCSVFile(file, this);
  }

  // --- FIX: Add the method to calculate groups based on the selected strategy ---
  updateGroups() {
    if (!this.selectedStrategy) {
      this.currentGroups = [];
      this.updateContent();
      return;
    }

    // Use generateGroups function from GroupingUtils with integrated separator detection
    const mappedStrategy = mapStrategyName(this.selectedStrategy);
    const result = generateGroups(this.taxaNames, this.selectedSeparator, mappedStrategy);
    
    // Handle the new return format
    if (result.groups) {
      this.currentGroups = result.groups;
      // Update separator if it was auto-detected
      if (result.analyzed && result.separator) {
        this.selectedSeparator = result.separator;
      }
    } else {
      // Backwards compatibility for old return format
      this.currentGroups = result;
    }

    // Re-render the entire content area to show the new groups or empty state
    this.updateContent();
  }

  updateCSVGroups(columnName) {
    updateCSVGroups(columnName, this);
  }

  renderEmptyState(message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'tc-empty-state';

    // Add icon
    const icon = document.createElement('md-icon');
    icon.className = 'tc-empty-state-icon';
    icon.textContent = 'info';

    // Add message
    const messageElement = document.createElement('p');
    messageElement.className = 'tc-empty-state-message';
    messageElement.textContent = message;

    emptyState.appendChild(icon);
    emptyState.appendChild(messageElement);
    this.contentArea.appendChild(emptyState);
  }

  renderActions(footer) {
    // Clear any existing buttons
    footer.innerHTML = '';

    // Reset Button
    const resetButton = document.createElement('md-outlined-button');
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', () => this.reset());

    // Apply Button
    const applyButton = document.createElement('md-filled-button');
    applyButton.textContent = 'Apply';
    applyButton.addEventListener('click', () => this.apply());

    footer.appendChild(resetButton);
    footer.appendChild(applyButton);
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
      csvTaxaMap: this.csvTaxaMap,
      csvGroups: this.csvGroups,
      csvColumn: this.selectedCSVColumn
    };
    this.onComplete(result);
    this.winBoxInstance.close();
  }

  handleClose() {
    // Clear the static instance when the window is closed
    if (TaxaColoring.currentInstance === this) {
      TaxaColoring.currentInstance = null;
    }
    // The CSS is now handled by the module system, so no cleanup is needed.
  }

  // Method to programmatically close the window
  close() {
    if (this.winBoxInstance) {
      this.winBoxInstance.close();
    }
    this.handleClose();
  }
}

// Independent legend control (vertical list in visualization page)
export function renderTaxaLegend(grouping) {
  const el = document.getElementById('taxaLegend');
  if (!el) return;

  // Clear
  el.innerHTML = '';

  if (!grouping || grouping.mode === 'taxa') {
    el.style.display = 'none';
    return;
  }

  const colorMap = grouping.groupColorMap || {};
  const names = Object.keys(colorMap);
  if (!names.length) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';

  const frag = document.createDocumentFragment();
  names.forEach((name) => {
    const color = colorMap[name] || '#666';
    const item = document.createElement('div');
    item.className = 'taxa-legend-chip';
    item.innerHTML = `<span class="swatch" style="background:${color}"></span><span class="label" title="${name}">${name}</span>`;
    frag.appendChild(item);
  });

  el.appendChild(frag);
}

// Keep legend in sync with store.taxaGrouping
try {
  const store = useAppStore;
  let prev = store.getState().taxaGrouping;

  // Initial render (when page loads or refreshes)
  renderTaxaLegend(prev);

  // Subscribe to grouping changes
  store.subscribe((state) => {
    if (state.taxaGrouping !== prev) {
      prev = state.taxaGrouping;
      renderTaxaLegend(state.taxaGrouping);
    }
  });
} catch (_) { /* store may not be initialized yet */ }
