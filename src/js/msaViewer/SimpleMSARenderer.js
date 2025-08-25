/**
 * Simple MSA Renderer
 * A basic renderer to display sequence alignment data from phylo movie format
 * This is the first step before implementing the full deck.gl viewer
 */

export class SimpleMSARenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      cellSize: 14,
      fontSize: 12,
      showSequenceNames: true,
      maxDisplayRows: 20,
      maxDisplayCols: 100,
      ...options
    };
    
    this.sequences = [];
    this.sequenceType = 'dna'; // or 'protein'
  }

  /**
   * Load sequences from phylo movie data format
   * @param {Object} data - The phylo movie data with msa.sequences
   */
  loadFromPhyloData(data) {
    if (!data?.msa?.sequences) {
      console.warn('[SimpleMSARenderer] No MSA sequences found in data');
      this.renderEmpty('No sequence data available');
      return false;
    }

    // Convert dictionary to array format
    this.sequences = Object.entries(data.msa.sequences).map(([name, seq]) => ({
      name,
      sequence: seq
    }));

    // Detect sequence type
    this.sequenceType = this.detectSequenceType();
    
    console.log(`[SimpleMSARenderer] Loaded ${this.sequences.length} sequences, type: ${this.sequenceType}`);
    this.render();
    return true;
  }

  /**
   * Detect if sequences are DNA or protein
   */
  detectSequenceType() {
    if (!this.sequences.length) return 'dna';
    
    const dnaChars = new Set(['A', 'C', 'G', 'T', 'U', 'N', '-']);
    const sample = this.sequences[0].sequence.substring(0, 100).toUpperCase();
    
    for (const char of sample) {
      if (!dnaChars.has(char)) {
        return 'protein';
      }
    }
    return 'dna';
  }

  /**
   * Get color for a character based on sequence type
   */
  getCharColor(char, type) {
    if (type === 'dna') {
      switch(char.toUpperCase()) {
        case 'A': return '#66C2A5'; // Teal
        case 'C': return '#8DA0CB'; // Blue
        case 'G': return '#FC8D62'; // Orange
        case 'T':
        case 'U': return '#E78AC3'; // Pink
        case '-': return '#D4D4D4'; // Gray
        default: return '#AAAAAA';
      }
    } else {
      // Protein coloring
      const hydrophobic = 'AVILMFWYP';
      const polar = 'STNCQG';
      const positive = 'KRH';
      const negative = 'DE';
      
      const upper = char.toUpperCase();
      if (hydrophobic.includes(upper)) return '#8DD3C7';
      if (polar.includes(upper)) return '#FFFFB3';
      if (positive.includes(upper)) return '#BEBADA';
      if (negative.includes(upper)) return '#FB8072';
      if (char === '-') return '#D4D4D4';
      return '#AAAAAA';
    }
  }

  /**
   * Render the alignment view
   */
  render() {
    if (!this.sequences.length) {
      this.renderEmpty('No sequences loaded');
      return;
    }

    // Clear container
    this.container.innerHTML = '';
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--md-sys-color-surface, #fff);
      color: var(--md-sys-color-on-surface, #000);
    `;

    // Add header
    const header = this.createHeader();
    wrapper.appendChild(header);

    // Add sequence view
    const sequenceView = this.createSequenceView();
    wrapper.appendChild(sequenceView);

    // Add info footer
    const footer = this.createFooter();
    wrapper.appendChild(footer);

    this.container.appendChild(wrapper);
  }

  /**
   * Create header with controls
   */
  createHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      background: var(--md-sys-color-surface-container, #f5f5f5);
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #ddd);
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--md-sys-color-primary, #006a6a);
    `;
    title.textContent = `Sequence Alignment (${this.sequences.length} sequences)`;

    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 8px;';
    
    // Add zoom controls
    const zoomIn = this.createButton('+', () => {
      this.options.cellSize = Math.min(24, this.options.cellSize + 2);
      this.options.fontSize = Math.min(18, this.options.fontSize + 1);
      this.render();
    });
    
    const zoomOut = this.createButton('-', () => {
      this.options.cellSize = Math.max(8, this.options.cellSize - 2);
      this.options.fontSize = Math.max(8, this.options.fontSize - 1);
      this.render();
    });
    
    controls.appendChild(zoomOut);
    controls.appendChild(zoomIn);

    header.appendChild(title);
    header.appendChild(controls);
    return header;
  }

  /**
   * Create main sequence view
   */
  createSequenceView() {
    const container = document.createElement('div');
    container.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 16px;
      font-family: 'Courier New', monospace;
      font-size: ${this.options.fontSize}px;
      line-height: ${this.options.cellSize}px;
      background: #fafafa;
    `;

    // Create table-like structure
    const table = document.createElement('div');
    table.style.cssText = 'display: inline-block; white-space: nowrap;';

    // Limit display to prevent performance issues
    const maxRows = Math.min(this.sequences.length, this.options.maxDisplayRows);
    const maxCols = Math.min(
      this.sequences[0]?.sequence.length || 0,
      this.options.maxDisplayCols
    );

    // Add position ruler
    if (maxCols > 0) {
      const ruler = document.createElement('div');
      ruler.style.cssText = `
        margin-bottom: 4px;
        padding-left: ${this.options.showSequenceNames ? '120px' : '0'};
        color: #666;
        font-size: 10px;
      `;
      
      let rulerText = '';
      for (let i = 0; i < maxCols; i += 10) {
        const label = (i + 1).toString();
        rulerText += label.padEnd(10, ' ');
      }
      ruler.textContent = rulerText;
      table.appendChild(ruler);
    }

    // Add sequences
    for (let i = 0; i < maxRows; i++) {
      const seq = this.sequences[i];
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center;';

      // Sequence name
      if (this.options.showSequenceNames) {
        const name = document.createElement('span');
        name.style.cssText = `
          display: inline-block;
          width: 120px;
          padding-right: 8px;
          color: var(--md-sys-color-primary, #006a6a);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
        `;
        name.textContent = seq.name;
        name.title = seq.name;
        row.appendChild(name);
      }

      // Sequence characters
      const seqContainer = document.createElement('span');
      for (let j = 0; j < maxCols && j < seq.sequence.length; j++) {
        const char = seq.sequence[j];
        const charSpan = document.createElement('span');
        charSpan.style.cssText = `
          display: inline-block;
          width: ${this.options.cellSize}px;
          height: ${this.options.cellSize}px;
          text-align: center;
          background-color: ${this.getCharColor(char, this.sequenceType)};
          color: ${char === '-' ? '#666' : '#000'};
          border: 1px solid #f0f0f0;
          line-height: ${this.options.cellSize}px;
        `;
        charSpan.textContent = char;
        seqContainer.appendChild(charSpan);
      }
      
      row.appendChild(seqContainer);
      table.appendChild(row);
    }

    // Add "more sequences" indicator if truncated
    if (this.sequences.length > maxRows) {
      const moreDiv = document.createElement('div');
      moreDiv.style.cssText = `
        margin-top: 8px;
        padding: 8px;
        color: #666;
        font-style: italic;
      `;
      moreDiv.textContent = `... and ${this.sequences.length - maxRows} more sequences (showing first ${maxRows})`;
      table.appendChild(moreDiv);
    }

    container.appendChild(table);
    return container;
  }

  /**
   * Create footer with info
   */
  createFooter() {
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 8px 16px;
      background: var(--md-sys-color-surface-container, #f5f5f5);
      border-top: 1px solid var(--md-sys-color-outline-variant, #ddd);
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #666);
    `;

    const seqLength = this.sequences[0]?.sequence.length || 0;
    footer.textContent = `Type: ${this.sequenceType.toUpperCase()} | Sequences: ${this.sequences.length} | Length: ${seqLength} | Cell size: ${this.options.cellSize}px`;

    return footer;
  }

  /**
   * Create a simple button
   */
  createButton(text, onClick) {
    const button = document.createElement('button');
    button.style.cssText = `
      padding: 4px 12px;
      background: var(--md-sys-color-primary, #006a6a);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      min-width: 32px;
    `;
    button.textContent = text;
    button.onclick = onClick;
    
    button.addEventListener('mouseenter', () => {
      button.style.opacity = '0.8';
    });
    button.addEventListener('mouseleave', () => {
      button.style.opacity = '1';
    });
    
    return button;
  }

  /**
   * Render empty state
   */
  renderEmpty(message) {
    this.container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--md-sys-color-on-surface-variant, #666);
        font-size: 14px;
      ">
        ${message}
      </div>
    `;
  }
}