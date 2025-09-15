// UIComponentFactory.js - Simplified UI component factory

// WinBox will be imported dynamically
import { CATEGORICAL_PALETTES, getPaletteInfo } from '../../constants/ColorPalettes.js';
import { ColorPicker } from './ColorPicker.js';
import { detectBestSeparator } from '../utils/GroupingUtils.js';

/**
 * A factory for creating UI elements for the Taxa Coloring window
 */
export class UIComponentFactory {

  /**
   * Creates the main window for the color assignment tool
   * @param {Function} onClose - A callback function for when the window is closed
   * @returns {{windowContent: HTMLElement, colorWin: WinBox}} An object containing the window's content container and the WinBox instance
   */
  static async createColorAssignmentWindow(onClose) {
    const windowContent = document.createElement('div');
    windowContent.className = 'tc-container'; // Use a specific prefix 'tc-' for Taxa Coloring

    // Try to get WinBox from global scope first, then dynamic import
    let WinBox = window.WinBox;

    if (!WinBox) {
      try {
        // Try loading the bundled version
        const script = document.createElement('script');
        script.src = '/node_modules/winbox/dist/winbox.bundle.min.js';
        document.head.appendChild(script);

        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });

        WinBox = window.WinBox;
      } catch (error) {
        throw new Error(`Failed to load WinBox bundle: ${error.message}`);
      }
    }

    if (typeof WinBox !== 'function') {
      throw new Error(`WinBox is not available as a constructor. Type: ${typeof WinBox}. Available on window: ${typeof window.WinBox}`);
    }

    const colorWin = new WinBox({
      id: 'taxa-coloring-modal', // Unique ID to prevent multiple instances
      title: 'Taxa Color Assignment',
      width: '800px',
      height: '85%',
      x: 'center',
      y: 'center',
      mount: windowContent,
      onclose: onClose,
      class: ["no-full", "tc-winbox"], // Add a scoping class to the WinBox instance
    });

    return { windowContent, colorWin };
  }

  /**
   * Creates a selector for applying a predefined color scheme
   * Each scheme is a button showing a gradient of its colors
   * @param {{onSchemeChange: Function}} options - The configuration options
   * @returns {HTMLElement} The color scheme selector element
   */
  static createColorSchemeSelector({ onSchemeChange }) {
    const container = document.createElement('div');
    container.className = 'tc-section';

    // Create collapsible header with prominent toggle button
    const header = document.createElement('div');
    header.className = 'tc-collapsible-header';

    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = 'Apply a Color Scheme';

    // Use a prominent filled tonal button instead of icon-only button
    const toggleButton = document.createElement('md-filled-tonal-button');
    toggleButton.setAttribute('aria-label', 'Toggle color scheme section');
    toggleButton.setAttribute('title', 'Show or hide color scheme options');
    toggleButton.className = 'tc-collapse-toggle';

    const icon = document.createElement('md-icon');
    icon.setAttribute('slot', 'icon');
    icon.textContent = 'expand_less';
    toggleButton.appendChild(icon);

    // Add text label to make it more accessible and prominent
    const buttonText = document.createTextNode('Show Color Schemes');
    toggleButton.appendChild(buttonText);

    header.appendChild(title);
    header.appendChild(toggleButton);

    // Create collapsible content container
    const collapsibleContent = document.createElement('div');
    collapsibleContent.className = 'tc-collapsible-content';

    const schemesContainer = document.createElement('div');
    schemesContainer.className = 'tc-scheme-grid';

    Object.entries(CATEGORICAL_PALETTES).forEach(([schemeId, schemeColors]) => {
      const paletteInfo = getPaletteInfo(schemeId);
      const schemeButton = document.createElement('button');
      schemeButton.className = 'tc-scheme-button';
      schemeButton.title = paletteInfo.description;

      const colorBar = document.createElement('div');
      colorBar.className = 'tc-scheme-gradient';
      colorBar.style.background = `linear-gradient(to right, ${schemeColors.join(', ')})`;

      const schemeNameContainer = document.createElement('div');
      schemeNameContainer.style.display = 'flex';
      schemeNameContainer.style.alignItems = 'center';
      schemeNameContainer.style.gap = '4px';

      const schemeName = document.createElement('span');
      schemeName.className = 'tc-scheme-name';
      schemeName.textContent = schemeId;
      schemeNameContainer.appendChild(schemeName);

      // Add color-blind safe indicator
      if (paletteInfo.colorBlindSafe) {
        const indicator = document.createElement('span');
        indicator.textContent = '👁';
        indicator.title = 'Color-blind safe';
        indicator.style.fontSize = '12px';
        schemeNameContainer.appendChild(indicator);
      }

      schemeButton.appendChild(colorBar);
      schemeButton.appendChild(schemeNameContainer);
      schemeButton.addEventListener('click', () => onSchemeChange(schemeId));
      schemesContainer.appendChild(schemeButton);
    });

    // Add schemes container to collapsible content
    collapsibleContent.appendChild(schemesContainer);

    // Add toggle functionality - start collapsed by default
    let isCollapsed = true;
    collapsibleContent.classList.add('tc-collapsed'); // Start collapsed
    icon.textContent = 'palette'; // More intuitive icon for color schemes

    toggleButton.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      collapsibleContent.classList.toggle('tc-collapsed', isCollapsed);

      // Update icon and button text based on state
      icon.textContent = isCollapsed ? 'palette' : 'expand_less';

      // Update button text to reflect current state
      const textNode = toggleButton.childNodes[1]; // Get the text node
      textNode.textContent = isCollapsed ? 'Show Color Schemes' : 'Hide Color Schemes';
    });

    // Build final container structure
    container.appendChild(header);
    container.appendChild(collapsibleContent);
    return container;
  }

  /**
   * Creates a grid container for individual color inputs
   * @returns {HTMLElement} The grid container element
   */
  static createColorInputGrid() {
    const grid = document.createElement('div');
    grid.className = 'tc-color-input-grid';
    return grid;
  }

  /**
   * Creates a Material Design-compliant color input using ColorPicker
   * @param {string|HTMLElement} name - The label for the color input
   * @param {string} color - The initial color value
   * @param {Function} onChange - A callback function for when the color is changed
   * @returns {HTMLElement} The color input component
   */
  static createColorInput(name, color, onChange) {
    return ColorPicker.createColorInput(name, color, onChange);
  }

  /**
   * Creates a CSV file upload section with drag and drop functionality
   * @param {Function} onFileSelect - Callback function called when a CSV file is selected
   * @returns {HTMLElement} The CSV upload section element
   */
  static createCSVUploadSection(onFileSelect) {
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
        onFileSelect(file);
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
        onFileSelect(file);
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

  /**
   * Creates a CSV preview section showing validation status and group preview
   * @param {Object} csvValidation - Validation result object with isValid, matched, matchPercentage properties
   * @param {Array} csvGroups - Array of group objects to preview
   * @returns {HTMLElement} The CSV preview section element
   */
  static createCSVPreviewSection(csvValidation, csvGroups) {
    const section = document.createElement('div');
    section.className = 'tc-csv-preview-section';

    // Status message using Material Design list item
    if (csvValidation) {
      const statusList = document.createElement('md-list');
      statusList.style.marginBottom = '16px';

      const statusItem = document.createElement('md-list-item');
      statusItem.setAttribute('type', 'text');

      // Icon in start slot
      const statusIcon = document.createElement('md-icon');
      statusIcon.setAttribute('slot', 'start');
      statusIcon.textContent = csvValidation.isValid ? 'check_circle' : 'warning';
      statusIcon.style.color = csvValidation.isValid ?
        'var(--md-sys-color-primary, #006a6a)' :
        'var(--md-sys-color-error, #ba1a1a)';
      statusItem.appendChild(statusIcon);

      // Headline
      const headline = document.createElement('div');
      headline.setAttribute('slot', 'headline');
      headline.textContent = csvValidation.isValid ? 'CSV Loaded Successfully' : 'CSV Loaded with Warnings';
      statusItem.appendChild(headline);

      // Supporting text
      const supportingText = document.createElement('div');
      supportingText.setAttribute('slot', 'supporting-text');
      supportingText.textContent = `${csvGroups.length} groups • ${csvValidation.matched.length} matched taxa (${csvValidation.matchPercentage}%)`;
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
    csvGroups.slice(0, 5).forEach((group, index) => {
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

      if (index < 4 && index < csvGroups.length - 1) {
        list.appendChild(document.createElement('md-divider'));
      }
    });

    // Add "more groups" item if needed
    if (csvGroups.length > 5) {
      list.appendChild(document.createElement('md-divider'));

      const moreItem = document.createElement('md-list-item');
      moreItem.setAttribute('type', 'text');

      const moreHeadline = document.createElement('div');
      moreHeadline.setAttribute('slot', 'headline');
      moreHeadline.style.textAlign = 'center';
      moreHeadline.style.fontStyle = 'italic';
      moreHeadline.textContent = `... and ${csvGroups.length - 5} more groups`;
      moreItem.appendChild(moreHeadline);

      list.appendChild(moreItem);
    }

    previewContainer.appendChild(list);
    section.appendChild(previewContainer);

    return section;
  }

  /**
   * Creates a generic section for editing group colors.
   * This is the core implementation used by more specific group color sections.
   * @param {string} titleText - The title to display for the section.
   * @param {Array} groups - Array of group objects, each expected to have `name` and `count` properties.
   * @param {ColorSchemeManager} colorManager - The ColorSchemeManager instance for managing colors.
   * @returns {HTMLElement} The group color section element.
   */
  static createGroupColorSection(titleText, groups, colorManager) {
    const section = document.createElement('div');
    section.className = 'tc-section';

    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = titleText;
    section.appendChild(title);

    const colorGrid = UIComponentFactory.createColorInputGrid();
    groups.forEach(group => {
      const color = colorManager.groupColorMap.get(group.name) || colorManager.getRandomColor();
      if (!colorManager.groupColorMap.has(group.name)) {
        colorManager.groupColorMap.set(group.name, color);
      }
      const colorInput = UIComponentFactory.createColorInput(
        `${group.name} (${group.count})`,
        color,
        (newColor) => colorManager.groupColorMap.set(group.name, newColor)
      );
      colorGrid.appendChild(colorInput);
    });
    section.appendChild(colorGrid);

    return section;
  }

  /**
   * Creates a section for editing individual taxa colors.
   * @param {string[]} taxaNames - An array of taxa names.
   * @param {ColorSchemeManager} colorManager - The ColorSchemeManager instance for managing colors.
   * @returns {HTMLElement} The taxa color section element.
   */
  static createTaxaColorSection(taxaNames, colorManager) {
    const section = document.createElement('div');
    section.className = 'tc-section';

    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = `Individual Colors (${taxaNames.length})`;
    section.appendChild(title);

    const colorGrid = UIComponentFactory.createColorInputGrid();
    taxaNames.forEach(taxon => {
      // Get existing color or use black as default
      let currentColor = colorManager.taxaColorMap.get(taxon);
      if (!currentColor) {
        currentColor = '#000000'; // Default to black
        colorManager.taxaColorMap.set(taxon, currentColor);
      }

      const colorInput = UIComponentFactory.createColorInput(
        taxon,
        currentColor,
        (newColor) => colorManager.taxaColorMap.set(taxon, newColor)
      );
      colorGrid.appendChild(colorInput);
    });
    section.appendChild(colorGrid);

    return section;
  }

  /**
   * Creates a CSV color section for editing group colors.
   * This is a specialized wrapper around createGroupColorSection.
   * @param {Array} csvGroups - Array of group objects from a CSV.
   * @param {ColorSchemeManager} colorManager - ColorSchemeManager instance for managing colors.
   * @returns {HTMLElement} The CSV color section element.
   */
  static createCSVColorSection(csvGroups, colorManager) {
    const title = `CSV Group Colors (${csvGroups.length})`;
    return this.createGroupColorSection(title, csvGroups, colorManager);
  }

  /**
   * Creates a chip-based selector for choosing a grouping column from a CSV.
   * @param {Object} options - The configuration options.
   * @param {Array} options.groupingColumns - Array of column objects from the CSV data.
   * @param {Object} options.columnGroups - Object mapping column names to their groups.
   * @param {string} options.selectedColumn - The name of the currently selected column.
   * @param {Function} options.onColumnChange - Callback function executed when a column chip is clicked.
   * @returns {HTMLElement} The column selector section element.
   */
  static createColumnSelector({ groupingColumns, columnGroups, selectedColumn, onColumnChange }) {
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

    groupingColumns.forEach(col => {
      const chip = document.createElement('md-filter-chip');
      const groupCount = columnGroups[col.name]?.length || 0;
      chip.setAttribute('label', `${col.displayName} (${groupCount} groups)`);

      if (selectedColumn === col.name) {
        chip.setAttribute('selected', '');
      }

      chip.addEventListener('click', () => onColumnChange(col.name));
      chipSet.appendChild(chip);
    });

    section.appendChild(chipSet);
    return section;
  }

  /**
   * Creates the mode selector buttons for switching between coloring modes.
   * @param {Object} options - The configuration options.
   * @param {string} options.currentMode - The currently active mode ('taxa', 'groups', 'csv').
   * @param {Function} options.onModeChange - Callback function executed when a mode button is clicked.
   * @returns {HTMLElement} The mode selector element.
   */
  static createModeSelector({ currentMode, onModeChange }) {
    const modeSelector = document.createElement('div');
    modeSelector.className = 'tc-mode-selector';

    const modesData = [
      { key: 'taxa', label: 'Individual Taxa', icon: 'palette' },
      { key: 'groups', label: 'Group by Pattern', icon: 'group_work' },
      { key: 'csv', label: 'Import CSV', icon: 'upload_file' }
    ];

    modesData.forEach(({ key, label, icon }) => {
      const buttonType = currentMode === key ? 'md-filled-button' : 'md-outlined-button';
      const button = document.createElement(buttonType);

      const iconElement = document.createElement('md-icon');
      iconElement.setAttribute('slot', 'icon');
      iconElement.textContent = icon;
      button.appendChild(iconElement);

      const textNode = document.createTextNode(label);
      button.appendChild(textNode);

      button.addEventListener('click', () => onModeChange(key));
      modeSelector.appendChild(button);
    });

    return modeSelector;
  }

  /**
   * Creates a grouping strategy selector with separator and strategy options using Material Design chips
   * @param {Object} options - The configuration options
   * @param {Array} options.taxaNames - Array of taxa names for separator detection
   * @param {Array} options.cachedSeparators - Array of cached separator characters
   * @param {string} options.selectedStrategy - Currently selected strategy
   * @param {string} options.selectedSeparator - Currently selected separator
   * @param {Function} options.onStrategyChange - Callback when strategy/separator changes
   * @returns {HTMLElement} The grouping strategy selector element
   */
  static createGroupingStrategySelector({ taxaNames, cachedSeparators, selectedStrategy, selectedSeparator, onStrategyChange, onCacheSeparators }) {
    const section = document.createElement('div');
    section.className = 'tc-section';

    const title = document.createElement('h3');
    title.className = 'tc-section-title';
    title.textContent = 'Pattern Detection Settings';
    section.appendChild(title);

    // Strategy selector using chips
    const strategySubsection = document.createElement('div');
    strategySubsection.style.marginBottom = '16px';

    const strategyLabel = document.createElement('h4');
    strategyLabel.className = 'tc-subsection-title';
    strategyLabel.textContent = 'Grouping Strategy:';
    strategySubsection.appendChild(strategyLabel);

    const strategyChipSet = document.createElement('md-chip-set');
    strategyChipSet.style.display = 'flex';
    strategyChipSet.style.flexWrap = 'wrap';
    strategyChipSet.style.gap = '8px';
    
    const strategies = [
      { value: 'prefix', label: 'Prefix', description: 'Before separator' },
      { value: 'suffix', label: 'Suffix', description: 'After separator' }, 
      { value: 'middle', label: 'Middle', description: 'Middle part' },
      { value: 'first-letter', label: 'First Letter', description: 'First character' }
    ];

    let selectedStrategyChip = null;

    strategies.forEach(strategy => {
      const chip = document.createElement('md-filter-chip');
      chip.setAttribute('label', `${strategy.label}`);
      if (strategy.value === selectedStrategy) {
        chip.setAttribute('selected', '');
        selectedStrategyChip = chip;
      }

      chip.addEventListener('click', () => {
        // Update selection
        if (selectedStrategyChip) {
          selectedStrategyChip.removeAttribute('selected');
        }
        chip.setAttribute('selected', '');
        selectedStrategyChip = chip;
        
        onStrategyChange(strategy.value, selectedSeparator);
      });

      strategyChipSet.appendChild(chip);
    });

    strategySubsection.appendChild(strategyChipSet);
    section.appendChild(strategySubsection);

    // Separator selector with auto-detect option
    const separatorSubsection = document.createElement('div');

    const separatorLabel = document.createElement('h4');
    separatorLabel.className = 'tc-subsection-title';
    separatorLabel.textContent = 'Separator Character:';
    separatorSubsection.appendChild(separatorLabel);

    const separatorChipSet = document.createElement('md-chip-set');
    separatorChipSet.style.display = 'flex';
    separatorChipSet.style.flexWrap = 'wrap';
    separatorChipSet.style.gap = '8px';

    // Auto-detect option
    const autoChip = document.createElement('md-filter-chip');
    autoChip.setAttribute('label', 'Auto-detect');
    if (!selectedSeparator) {
      autoChip.setAttribute('selected', '');
    }

    autoChip.addEventListener('click', () => {
      // Clear all other selections
      separatorChipSet.querySelectorAll('md-filter-chip').forEach(c => c.removeAttribute('selected'));
      autoChip.setAttribute('selected', '');
      onStrategyChange(selectedStrategy, null); // null triggers auto-detection
    });

    separatorChipSet.appendChild(autoChip);

    // Add common separators
    const commonSeparators = ['_', '-', '.', '|', ' '];
    const allSeparators = [...new Set([...commonSeparators, ...(cachedSeparators || [])])];

    allSeparators.forEach(sep => {
      const chip = document.createElement('md-filter-chip');
      const displayText = sep === ' ' ? 'Space' : sep;
      chip.setAttribute('label', displayText);
      
      if (sep === selectedSeparator) {
        chip.setAttribute('selected', '');
      }

      chip.addEventListener('click', () => {
        // Clear all other selections
        separatorChipSet.querySelectorAll('md-filter-chip').forEach(c => c.removeAttribute('selected'));
        chip.setAttribute('selected', '');
        onStrategyChange(selectedStrategy, sep);
      });

      separatorChipSet.appendChild(chip);
    });

    separatorSubsection.appendChild(separatorChipSet);
    section.appendChild(separatorSubsection);

    return section;
  }
}
