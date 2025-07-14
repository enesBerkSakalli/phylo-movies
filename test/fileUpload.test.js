const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { JSDOM } = require('jsdom');

// Mock localStorage for testing
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value.toString();
  },
  clear() {
    this.store = {};
  }
};

describe('File Upload Tests', () => {
  const fastaPath = path.join(__dirname, 'test_data/alltrees.fasta');
  const newickPath = path.join(__dirname, 'test_data/alltrees.trees_cutted.newick');
  let fastaContent, newickContent;

  before(() => {
    // Load test files
    fastaContent = fs.readFileSync(fastaPath, 'utf8');
    newickContent = fs.readFileSync(newickPath, 'utf8');
  });

  it('should load the FASTA file correctly', () => {
    expect(fastaContent).to.be.a('string');
    expect(fastaContent.length).to.be.greaterThan(0);
    expect(fastaContent).to.include('>A1');
    expect(fastaContent).to.include('>A2');
    expect(fastaContent).to.include('>B1');
    expect(fastaContent).to.include('>B2');
    expect(fastaContent).to.include('>X');
    expect(fastaContent).to.include('>C1');
    expect(fastaContent).to.include('>C2');
    expect(fastaContent).to.include('>D1');
    expect(fastaContent).to.include('>D2');
    expect(fastaContent).to.include('>O1');
    expect(fastaContent).to.include('>O2');
  });

  it('should load the Newick file correctly', () => {
    expect(newickContent).to.be.a('string');
    expect(newickContent.length).to.be.greaterThan(0);
    expect(newickContent.split(';').length).to.be.greaterThan(50); // Many trees in the file
    expect(newickContent).to.include('O1:');
    expect(newickContent).to.include('O2:');
  });

  it('should parse FASTA content into proper sequence objects', () => {
    // Mock the parsing logic that would exist in your application
    const sequences = parseFastaContent(fastaContent);
    
    expect(sequences).to.be.an('array');
    expect(sequences.length).to.equal(11); // 11 sequences in the file
    
    // Check first sequence
    expect(sequences[0].id).to.equal('A1');
    expect(sequences[0].sequence.length).to.equal(6000); // Each sequence has 6000 bases

    // Check all sequence IDs
    const sequenceIds = sequences.map(seq => seq.id);
    expect(sequenceIds).to.include.members(['A1', 'A2', 'B1', 'B2', 'X', 'C1', 'C2', 'D1', 'D2', 'O1', 'O2']);
  });

  it('should parse Newick content into proper tree objects', () => {
    // Mock the parsing logic that would exist in your application
    const trees = parseNewickContent(newickContent);
    
    expect(trees).to.be.an('array');
    expect(trees.length).to.equal(newickContent.split(';').length - 1); // One tree per semicolon (minus empty string at end)
    
    // Check first tree
    expect(trees[0]).to.include('O1:');
    expect(trees[0]).to.include('O2:');
    
    // Verify all trees contain the expected taxa
    trees.forEach(tree => {
      expect(tree).to.include('A1:');
      expect(tree).to.include('A2:');
      expect(tree).to.include('B1:');
      expect(tree).to.include('B2:');
      expect(tree).to.include('X:');
      expect(tree).to.include('C1:');
      expect(tree).to.include('C2:');
      expect(tree).to.include('D1:');
      expect(tree).to.include('D2:');
      expect(tree).to.include('O1:');
      expect(tree).to.include('O2:');
    });
  });

  it('should correctly store FASTA data in localStorage', () => {
    // Test the localStorage functionality
    global.localStorage.setItem('phyloMovieMSAData', JSON.stringify({
      rawData: fastaContent,
      sequences: parseFastaContent(fastaContent)
    }));
    
    const storedData = JSON.parse(global.localStorage.getItem('phyloMovieMSAData'));
    expect(storedData).to.have.property('rawData');
    expect(storedData).to.have.property('sequences');
    expect(storedData.sequences.length).to.equal(11);
  });
});

// Mock parsing functions (replace these with actual implementations from your project)
function parseFastaContent(fastaString) {
  if (!fastaString) return [];
  
  const sequences = [];
  const chunks = fastaString.split('>').filter(Boolean);
  
  chunks.forEach(chunk => {
    const lines = chunk.split('\n');
    const id = lines[0].trim();
    const sequence = lines.slice(1).join('').replace(/\s/g, '');
    sequences.push({ id, sequence });
  });
  
  return sequences;
}

function parseNewickContent(newickString) {
  if (!newickString) return [];
  return newickString.split(';')
    .map(tree => tree.trim())
    .filter(tree => tree.length > 0);
}