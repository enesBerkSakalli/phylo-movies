import { getPalette } from '../../constants/ColorPalettes.js';
import { UIComponentFactory } from './UIComponentFactory.js';
import { SEPARATION_STRATEGIES, mapStrategyName } from '../constants/Strategies.js';
import { detectUsefulSeparators } from '../utils/SeparatorUtils.js';
import { generateGroups as generateTaxaGroups } from '../utils/GroupingUtils.js';
import { useAppStore } from '../../core/store.js';
import { parseGroupCSV, validateCSVTaxa } from '../utils/CSVParser.js';

// Only import Material Design components not already loaded by main.js
import '@material/web/chips/chip-set.js';
import '@material/web/chips/filter-chip.js';
import '@material/web/elevation/elevation.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/divider/divider.js';

// Import the component's dedicated stylesheet. Vite will handle loading.
import '/src/css/taxa-coloring-window.css';

class ColorSchemeManager {
  constructor(originalColorMap = {}) {
    this.originalColorMap = originalColorMap;
    this.taxaColorMap = new Map(Object.entries(originalColorMap));
    this.groupColorMap = new Map();
  }

  applyColorScheme(schemeName, targets, isGroup) {
    const baseScheme = getPalette(schemeName);

    // For groups, maximize perceptual distance between successive colors
    const scheme = isGroup
      ? this._orderPaletteForMaxDistance(baseScheme, targets.length)
      : baseScheme;

    targets.forEach((target, index) => {
      const color = scheme[index % scheme.length];
      const name = isGroup ? target.name : target;
      const map = isGroup ? this.groupColorMap : this.taxaColorMap;
      map.set(name, color);
    });
  }

  // =====================
  // Palette ordering utils
  // =====================
  _orderPaletteForMaxDistance(palette, k, backgroundHex = '#ffffff') {
    const uniquePalette = Array.from(new Set(palette));
    const labs = uniquePalette.map(c => this._hexToLab(c));
    const whiteLab = this._hexToLab(backgroundHex);

    const n = uniquePalette.length;
    if (n === 0) return [];

    // Seed: color with max distance from background (white)
    let seedIndex = 0;
    let bestBgDist = -Infinity;
    for (let i = 0; i < n; i++) {
      const d = this._labDistance(labs[i], whiteLab);
      if (d > bestBgDist) { bestBgDist = d; seedIndex = i; }
    }

    const chosen = [seedIndex];
    const remaining = new Set(Array.from({ length: n }, (_, i) => i).filter(i => i !== seedIndex));
    const targetCount = Math.min(k, n);

    while (chosen.length < targetCount && remaining.size > 0) {
      let bestIdx = null;
      let bestScore = -Infinity;
      for (const idx of remaining) {
        // Score by maximin distance to already chosen
        const score = Math.min(...chosen.map(ci => this._labDistance(labs[idx], labs[ci])));
        if (score > bestScore) { bestScore = score; bestIdx = idx; }
      }
      chosen.push(bestIdx);
      remaining.delete(bestIdx);
    }

    // If more groups than palette, return full ordered palette and let caller cycle
    if (k > n) {
      // Fill rest (if any) with remaining indices by farthest-first until exhausted
      while (chosen.length < n && remaining.size > 0) {
        let bestIdx = null;
        let bestScore = -Infinity;
        for (const idx of remaining) {
          const score = Math.min(...chosen.map(ci => this._labDistance(labs[idx], labs[ci])));
          if (score > bestScore) { bestScore = score; bestIdx = idx; }
        }
        chosen.push(bestIdx);
        remaining.delete(bestIdx);
      }
    }

    return chosen.map(i => uniquePalette[i]);
  }

  _hexToLab(hex) {
    const { r, g, b } = this._hexToRgb(hex);
    const { x, y, z } = this._rgbToXyz(r, g, b);
    return this._xyzToLab(x, y, z);
  }

  _hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const num = parseInt(h, 16);
    return {
      r: (num >> 16) & 0xff,
      g: (num >> 8) & 0xff,
      b: num & 0xff,
    };
  }

  _rgbToXyz(r, g, b) {
    // Normalize to [0,1]
    let [rs, gs, bs] = [r, g, b].map(v => v / 255);
    // Inverse companding (sRGB to linear)
    [rs, gs, bs] = [rs, gs, bs].map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    // sRGB D65 matrix
    const x = rs * 0.4124564 + gs * 0.3575761 + bs * 0.1804375;
    const y = rs * 0.2126729 + gs * 0.7151522 + bs * 0.0721750;
    const z = rs * 0.0193339 + gs * 0.1191920 + bs * 0.9503041;
    return { x, y, z };
  }

  _xyzToLab(x, y, z) {
    // D65 reference white
    const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
    let fx = this._fxyz(x / Xn);
    let fy = this._fxyz(y / Yn);
    let fz = this._fxyz(z / Zn);
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    return { L, a, b };
  }

  _fxyz(t) {
    const delta = 6 / 29;
    return t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
  }

  _labDistance(l1, l2) {
    const dL = l1.L - l2.L;
    const da = l1.a - l2.a;
    const db = l1.b - l2.b;
    return Math.sqrt(dL * dL + da * da + db * db); // CIE76
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
    this.renderModeSelector();
    if (this.currentMode === 'taxa') {
      this.renderTaxaMode();
    } else if (this.currentMode === 'groups') {
      this.renderGroupsMode();
    } else if (this.currentMode === 'csv') {
      this.renderCSVMode();
    }
  }

  renderModeSelector() {
    const modeSelector = document.createElement('div');
    modeSelector.className = 'tc-mode-selector';
    
    const modesData = [
      { key: 'taxa', label: 'Individual Taxa', icon: 'palette' },
      { key: 'groups', label: 'Group by Pattern', icon: 'group_work' },
      { key: 'csv', label: 'Import CSV', icon: 'upload_file' }
    ];
    
    modesData.forEach(({ key, label, icon }) => {
      // Use correct button type based on selection
      const buttonType = this.currentMode === key ? 'md-filled-button' : 'md-outlined-button';
      const button = document.createElement(buttonType);
      
      // Add icon
      const iconElement = document.createElement('md-icon');
      iconElement.setAttribute('slot', 'icon');
      iconElement.textContent = icon;
      button.appendChild(iconElement);
      
      // Add label text
      const textNode = document.createTextNode(label);
      button.appendChild(textNode);
      
      button.addEventListener('click', () => {
        this.currentMode = key;
        this.updateContent();
      });
      
      modeSelector.appendChild(button);
    });
    
    this.contentArea.appendChild(modeSelector);
  }

  renderActions(footer) {
    footer.innerHTML = '';

    const buttonData = [
      { text: 'Reset', type: 'text', icon: 'refresh', action: () => this.reset() },
      { text: 'Cancel', type: 'outlined', icon: 'close', action: () => this.winBoxInstance.close() },
      { text: 'Apply', type: 'filled', icon: 'check', action: () => this.apply() }
    ];

    const fragment = document.createDocumentFragment();
    buttonData.forEach(({ text, type, icon, action }) => {
      const button = document.createElement(`md-${type}-button`);
      
      // Add icon
      const iconElement = document.createElement('md-icon');
      iconElement.setAttribute('slot', 'icon');
      iconElement.textContent = icon;
      button.appendChild(iconElement);
      
      // Add text as text node
      const textNode = document.createTextNode(text);
      button.appendChild(textNode);
      
      button.addEventListener('click', action);
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
      // Get existing color or assign a random color for better visual default
      let currentColor = this.colorManager.taxaColorMap.get(taxon);
      if (!currentColor || currentColor === '#000000') {
        currentColor = this.colorManager.getRandomColor();
        this.colorManager.taxaColorMap.set(taxon, currentColor);
      }

      const colorInput = UIComponentFactory.createColorInput(
        taxon,
        currentColor,
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
    // Create Material Design card
    const card = document.createElement('div');
    card.className = 'tc-separation-card';

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
    sepSection.style.marginBottom = '24px';
    
    // Title with Material Design typography
    const title = document.createElement('h3');
    title.className = 'tc-separation-title';
    title.textContent = '1. Choose Separator';
    sepSection.appendChild(title);

    // Chip set container
    const chipSet = document.createElement('md-chip-set');
    chipSet.style.display = 'flex';
    chipSet.style.flexWrap = 'wrap';
    chipSet.style.gap = '8px';

    separators.forEach(sep => {
      const chip = document.createElement('md-filter-chip');
      chip.setAttribute('label', `${sep.displayName} (${sep.usage}%)`);
      
      if (this.selectedSeparator === sep.char) {
        chip.setAttribute('selected', '');
      }
      
      chip.addEventListener('click', () => {
        this.selectedSeparator = sep.char;
        this.updateContent();
      });
      
      chipSet.appendChild(chip);
    });

    sepSection.appendChild(chipSet);
    return sepSection;
  }

  createStrategySection() {
    const stratSection = document.createElement('div');
    stratSection.className = 'tc-section';
    stratSection.style.marginBottom = '24px';
    
    // Title with Material Design typography
    const title = document.createElement('h3');
    title.className = 'tc-separation-title';
    title.textContent = '2. Choose Grouping Strategy';
    stratSection.appendChild(title);

    // Strategy buttons container
    const stratGrid = document.createElement('div');
    stratGrid.className = 'tc-strategy-grid';

    Object.entries(SEPARATION_STRATEGIES).forEach(([key, { label, example }]) => {
      const buttonType = this.selectedStrategy === key ? 'md-filled-tonal-button' : 'md-outlined-button';
      const button = document.createElement(buttonType);
      
      // Create content container
      const content = document.createElement('div');
      content.className = 'tc-strategy-content';
      
      const labelDiv = document.createElement('div');
      labelDiv.className = 'tc-strategy-label';
      labelDiv.textContent = label;
      
      const exampleDiv = document.createElement('div');
      exampleDiv.className = 'tc-strategy-example';
      exampleDiv.textContent = example;
      
      content.appendChild(labelDiv);
      content.appendChild(exampleDiv);
      button.appendChild(content);
      
      button.addEventListener('click', () => {
        this.selectedStrategy = key;
        this.updateContent();
      });
      
      stratGrid.appendChild(button);
    });

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

  renderCSVMode() {
    const fragment = document.createDocumentFragment();

    // File upload section
    const uploadSection = this.createCSVUploadSection();
    fragment.appendChild(uploadSection);

    // Column selector and preview section (if CSV loaded)
    if (this.csvData && this.csvGroups.length > 0) {
      // Column selector (if multiple columns available)
      if (this.csvData.groupingColumns.length > 1) {
        const columnSelector = this.createColumnSelector();
        fragment.appendChild(columnSelector);
      }
      
      const previewSection = this.createCSVPreviewSection();
      fragment.appendChild(previewSection);

      // Color scheme selector
      const schemeSelector = UIComponentFactory.createColorSchemeSelector({
        onSchemeChange: (schemeName) => this.applyColorScheme(schemeName, this.csvGroups, true),
      });
      fragment.appendChild(schemeSelector);

      // Group colors section
      const colorSection = this.createCSVColorSection();
      fragment.appendChild(colorSection);
    }

    this.contentArea.appendChild(fragment);
  }

  createCSVUploadSection() {
    // Use Material Design surface with elevation
    const section = document.createElement('div');
    section.className = 'tc-csv-upload-surface';
    section.style.position = 'relative';

    // Drag and drop handlers
    section.addEventListener('dragover', (e) => {
      e.preventDefault();
      section.classList.add('drag-over');
    });

    section.addEventListener('dragleave', () => {
      section.classList.remove('drag-over');
    });

    section.addEventListener('drop', (e) => {
      e.preventDefault();
      section.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
        this.handleCSVFile(file);
      } else if (file) {
        alert('Please upload a CSV file');
      }
    });

    // Add elevation for Material Design surface
    const elevation = document.createElement('md-elevation');
    section.appendChild(elevation);
    
    // Icon
    const icon = document.createElement('md-icon');
    icon.className = 'tc-csv-upload-icon';
    icon.textContent = 'upload_file';
    section.appendChild(icon);

    // Instructions
    const text = document.createElement('div');
    text.className = 'tc-csv-upload-text';
    text.textContent = 'Drag and drop a CSV file here, or click to browse';
    section.appendChild(text);

    // Hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.className = 'tc-csv-file-input';
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleCSVFile(file);
      }
    });
    section.appendChild(fileInput);

    // Browse button
    const browseButton = document.createElement('md-filled-button');
    const browseIcon = document.createElement('md-icon');
    browseIcon.setAttribute('slot', 'icon');
    browseIcon.textContent = 'folder_open';
    browseButton.appendChild(browseIcon);
    browseButton.appendChild(document.createTextNode('Browse Files'));
    browseButton.addEventListener('click', () => fileInput.click());
    section.appendChild(browseButton);

    return section;
  }

  createCSVPreviewSection() {
    const section = document.createElement('div');
    section.className = 'tc-csv-preview-section';

    // Status message using Material Design list item
    if (this.csvValidation) {
      const statusList = document.createElement('md-list');
      statusList.style.marginBottom = '16px';
      
      const statusItem = document.createElement('md-list-item');
      statusItem.setAttribute('type', 'text');
      
      // Icon in start slot
      const statusIcon = document.createElement('md-icon');
      statusIcon.setAttribute('slot', 'start');
      statusIcon.textContent = this.csvValidation.isValid ? 'check_circle' : 'warning';
      statusIcon.style.color = this.csvValidation.isValid ? 
        'var(--md-sys-color-primary, #006a6a)' : 
        'var(--md-sys-color-error, #ba1a1a)';
      statusItem.appendChild(statusIcon);
      
      // Headline
      const headline = document.createElement('div');
      headline.setAttribute('slot', 'headline');
      headline.textContent = this.csvValidation.isValid ? 'CSV Loaded Successfully' : 'CSV Loaded with Warnings';
      statusItem.appendChild(headline);
      
      // Supporting text
      const supportingText = document.createElement('div');
      supportingText.setAttribute('slot', 'supporting-text');
      supportingText.textContent = `${this.csvGroups.length} groups • ${this.csvValidation.matched.length} matched taxa (${this.csvValidation.matchPercentage}%)`;
      statusItem.appendChild(supportingText);
      
      statusList.appendChild(statusItem);
      section.appendChild(statusList);
    }

    // Preview using Material Design list
    const previewContainer = document.createElement('div');
    previewContainer.className = 'tc-csv-preview-list';
    previewContainer.style.position = 'relative';
    
    // Add elevation
    const listElevation = document.createElement('md-elevation');
    previewContainer.appendChild(listElevation);
    
    const list = document.createElement('md-list');
    list.style.maxHeight = '300px';
    list.style.overflowY = 'auto';
    
    // Add header as first item
    const headerItem = document.createElement('md-list-item');
    headerItem.setAttribute('type', 'text');
    headerItem.style.fontWeight = '500';
    
    const headerHeadline = document.createElement('div');
    headerHeadline.setAttribute('slot', 'headline');
    headerHeadline.textContent = 'Group Preview';
    headerItem.appendChild(headerHeadline);
    
    const headerSupporting = document.createElement('div');
    headerSupporting.setAttribute('slot', 'supporting-text');
    headerSupporting.textContent = 'Group Name • Taxa Count • Sample Members';
    headerItem.appendChild(headerSupporting);
    
    list.appendChild(headerItem);
    
    // Add divider
    const divider = document.createElement('md-divider');
    list.appendChild(divider);
    
    // Add group items (show first 5)
    this.csvGroups.slice(0, 5).forEach((group, index) => {
      const listItem = document.createElement('md-list-item');
      listItem.setAttribute('type', 'text');
      
      // Group name as headline
      const headline = document.createElement('div');
      headline.setAttribute('slot', 'headline');
      headline.textContent = group.name;
      listItem.appendChild(headline);
      
      // Supporting text with count and sample
      const supporting = document.createElement('div');
      supporting.setAttribute('slot', 'supporting-text');
      const sampleMembers = group.members.slice(0, 3).join(', ') + 
        (group.members.length > 3 ? '...' : '');
      supporting.textContent = `${group.count} taxa • ${sampleMembers}`;
      listItem.appendChild(supporting);
      
      // Trailing text for count
      const trailing = document.createElement('div');
      trailing.setAttribute('slot', 'trailing-supporting-text');
      trailing.textContent = group.count.toString();
      trailing.style.minWidth = '30px';
      trailing.style.textAlign = 'end';
      listItem.appendChild(trailing);
      
      list.appendChild(listItem);
      
      if (index < 4 && index < this.csvGroups.length - 1) {
        list.appendChild(document.createElement('md-divider'));
      }
    });
    
    // Add "more groups" item if needed
    if (this.csvGroups.length > 5) {
      list.appendChild(document.createElement('md-divider'));
      
      const moreItem = document.createElement('md-list-item');
      moreItem.setAttribute('type', 'text');
      
      const moreHeadline = document.createElement('div');
      moreHeadline.setAttribute('slot', 'headline');
      moreHeadline.style.textAlign = 'center';
      moreHeadline.style.fontStyle = 'italic';
      moreHeadline.textContent = `... and ${this.csvGroups.length - 5} more groups`;
      moreItem.appendChild(moreHeadline);
      
      list.appendChild(moreItem);
    }
    
    previewContainer.appendChild(list);
    section.appendChild(previewContainer);

    return section;
  }

  createCSVColorSection() {
    const section = document.createElement('div');
    section.className = 'tc-section';
    
    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = `CSV Group Colors (${this.csvGroups.length})`;
    section.appendChild(title);

    const colorGrid = UIComponentFactory.createColorInputGrid();
    this.csvGroups.forEach(group => {
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

    return section;
  }

  async handleCSVFile(file) {
    try {
      const text = await file.text();
      const parseResult = parseGroupCSV(text);

      if (!parseResult.success) {
        alert(`Failed to parse CSV: ${parseResult.error}`);
        return;
      }

      // Store full CSV data
      this.csvData = parseResult.data;
      
      // Select first column by default
      this.selectedCSVColumn = parseResult.data.groupingColumns[0].name;
      
      // Validate against available taxa using first column
      const firstColumnMap = parseResult.data.allGroupings[this.selectedCSVColumn];
      const validation = validateCSVTaxa(firstColumnMap, this.taxaNames);
      
      if (!validation.isValid) {
        alert('No matching taxa found in CSV file');
        return;
      }

      // Set up initial groups from first column
      this.updateCSVGroups(this.selectedCSVColumn);
      this.csvValidation = validation;

      // Show warnings if any
      if (parseResult.data.warnings) {
        console.warn('CSV parsing warnings:', parseResult.data.warnings);
      }

      // Re-render to show preview
      this.updateContent();
    } catch (error) {
      alert(`Failed to read CSV file: ${error.message}`);
    }
  }

  updateCSVGroups(columnName) {
    if (!this.csvData) return;
    
    // Update selected column
    this.selectedCSVColumn = columnName;
    
    // Get groups for selected column
    this.csvGroups = this.csvData.columnGroups[columnName] || [];
    this.csvTaxaMap = this.csvData.allGroupings[columnName] || new Map();
    
    // Revalidate with current taxa
    this.csvValidation = validateCSVTaxa(this.csvTaxaMap, this.taxaNames);
  }

  createColumnSelector() {
    const section = document.createElement('div');
    section.className = 'tc-section';
    
    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = 'Select Grouping Column';
    section.appendChild(title);
    
    const chipSet = document.createElement('md-chip-set');
    chipSet.style.display = 'flex';
    chipSet.style.flexWrap = 'wrap';
    chipSet.style.gap = '8px';
    
    this.csvData.groupingColumns.forEach(col => {
      const chip = document.createElement('md-filter-chip');
      const groupCount = this.csvData.columnGroups[col.name]?.length || 0;
      chip.setAttribute('label', `${col.displayName} (${groupCount} groups)`);
      
      if (this.selectedCSVColumn === col.name) {
        chip.setAttribute('selected', '');
      }
      
      chip.addEventListener('click', () => {
        this.updateCSVGroups(col.name);
        this.updateContent();
      });
      
      chipSet.appendChild(chip);
    });
    
    section.appendChild(chipSet);
    return section;
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
    // The CSS is now handled by the module system, so no cleanup is needed.
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
