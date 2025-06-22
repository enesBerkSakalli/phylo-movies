/**
 * Test suite for FASTA file compatibility with AlignmentViewer2Component
 * Tests various FASTA formats and identifies parsing issues
 */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

describe('FASTA File Compatibility with AlignmentViewer2Component', function() {
  let fastaContent;
  let sequences;

  before(function() {
    // Load the actual norovirus FASTA file
    const fastaPath = path.join(process.cwd(), 'aligned_norovirus_sequences.fasta');
    if (fs.existsSync(fastaPath)) {
      fastaContent = fs.readFileSync(fastaPath, 'utf8');
    } else {
      console.warn('aligned_norovirus_sequences.fasta not found, using mock data');
      fastaContent = `>LC769681|LC769681.1 Norovirus test sequence
---------gatggcgtctaacgacgcttccgctgccgctgctgctaacagcaacaa---
------cgacatcgaaa-----------aatcttcaagtgac----------ggtgtgtt
>LC769682|LC769682.1 Norovirus test sequence 2
-------aagatggcgtctaacgacgctaccgttgccgttgcttgcaacaacaacaa---
------cgacaaggaga-----------aatcttcaggtgaa----------ggcttatt`;
    }
  });

  describe('FASTA Format Validation', function() {
    it('should start with a header line', function() {
      expect(fastaContent.trim().startsWith('>')).to.be.true;
    });

    it('should contain valid FASTA headers', function() {
      const lines = fastaContent.split('\n');
      const headerLines = lines.filter(line => line.startsWith('>'));

      expect(headerLines.length).to.be.greaterThan(0);

      headerLines.forEach(header => {
        expect(header).to.match(/^>[^\s].*$/); // Should start with > and have content
      });
    });

    it('should have sequences after headers', function() {
      const lines = fastaContent.split('\n').filter(line => line.trim() !== '');
      let hasSequenceAfterHeader = false;

      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].startsWith('>') && !lines[i + 1].startsWith('>')) {
          hasSequenceAfterHeader = true;
          break;
        }
      }

      expect(hasSequenceAfterHeader).to.be.true;
    });
  });

  describe('Sequence Content Analysis', function() {
    before(function() {
      sequences = parseFastaToSequences(fastaContent);
    });

    it('should parse into sequence objects', function() {
      expect(sequences).to.be.an('array');
      expect(sequences.length).to.be.greaterThan(0);
    });

    it('should have consistent sequence structure', function() {
      sequences.forEach((seq, index) => {
        expect(seq).to.have.property('id');
        expect(seq).to.have.property('sequence');
        expect(seq.id).to.be.a('string');
        expect(seq.sequence).to.be.a('string');
        expect(seq.id.length).to.be.greaterThan(0);
        expect(seq.sequence.length).to.be.greaterThan(0);
      });
    });

    it('should analyze sequence characters', function() {
      const allChars = new Set();
      const gapChars = new Set(['-', '.', 'N', 'n']);
      let totalGaps = 0;
      let totalBases = 0;

      sequences.forEach(seq => {
        for (const char of seq.sequence) {
          allChars.add(char);
          if (gapChars.has(char)) {
            totalGaps++;
          } else {
            totalBases++;
          }
        }
      });

      console.log('Character analysis:');
      console.log('- Unique characters found:', Array.from(allChars).sort());
      console.log('- Total gaps:', totalGaps);
      console.log('- Total bases:', totalBases);
      console.log('- Gap percentage:', ((totalGaps / (totalGaps + totalBases)) * 100).toFixed(2) + '%');

      // Check for non-standard characters
      const standardChars = new Set(['A', 'C', 'G', 'T', 'U', 'a', 'c', 'g', 't', 'u', '-', '.', 'N', 'n']);
      const nonStandardChars = Array.from(allChars).filter(char => !standardChars.has(char));

      if (nonStandardChars.length > 0) {
        console.warn('Non-standard characters found:', nonStandardChars);
      }
    });

    it('should check sequence length consistency', function() {
      const lengths = sequences.map(seq => seq.sequence.length);
      const uniqueLengths = [...new Set(lengths)];

      console.log('Sequence length analysis:');
      console.log('- Number of sequences:', sequences.length);
      console.log('- Sequence lengths:', lengths);
      console.log('- Unique lengths:', uniqueLengths);

      if (uniqueLengths.length > 1) {
        console.warn('WARNING: Sequences have different lengths!');
        console.warn('This may cause parsing errors in AlignmentViewer2Component');

        // Find shortest and longest
        const minLength = Math.min(...lengths);
        const maxLength = Math.max(...lengths);
        console.warn(`Length range: ${minLength} - ${maxLength}`);

        // Show which sequences have non-standard lengths
        const mostCommonLength = lengths.sort((a,b) =>
          lengths.filter(v => v===a).length - lengths.filter(v => v===b).length
        ).pop();

        sequences.forEach((seq, index) => {
          if (seq.sequence.length !== mostCommonLength) {
            console.warn(`Sequence ${index} (${seq.id.substring(0, 50)}...) has length ${seq.sequence.length}, expected ${mostCommonLength}`);
          }
        });
      }
    });

    it('should analyze gap patterns', function() {
      sequences.forEach((seq, index) => {
        const sequence = seq.sequence;
        const leadingGaps = sequence.match(/^-+/);
        const trailingGaps = sequence.match(/-+$/);
        const internalGaps = sequence.match(/-+/g);

        console.log(`Sequence ${index} gap analysis:`);
        console.log(`- Leading gaps: ${leadingGaps ? leadingGaps[0].length : 0}`);
        console.log(`- Trailing gaps: ${trailingGaps ? trailingGaps[0].length : 0}`);
        console.log(`- Internal gap blocks: ${internalGaps ? internalGaps.length : 0}`);

        if (leadingGaps && leadingGaps[0].length > 50) {
          console.warn(`WARNING: Sequence ${index} has ${leadingGaps[0].length} leading gaps - this may cause parser issues`);
        }
      });
    });
  });

  describe('AlignmentViewer2Component Compatibility', function() {
    it('should test with minimal valid FASTA', function() {
      const minimalFasta = `>seq1
ACGTACGTACGT
>seq2
ACGTACGTACGT`;

      const result = testFastaCompatibility(minimalFasta);
      expect(result.isValid).to.be.true;
      expect(result.sequences).to.have.length(2);
    });

    it('should test with cleaned norovirus data', function() {
      const cleanedFasta = cleanFastaForTesting(fastaContent);
      const result = testFastaCompatibility(cleanedFasta);

      console.log('Cleaned FASTA test result:', result);

      if (!result.isValid) {
        console.error('Cleaned FASTA still fails:', result.error);
      }
    });

    it('should test original norovirus data', function() {
      const result = testFastaCompatibility(fastaContent);

      console.log('Original FASTA test result:', result);

      if (!result.isValid) {
        console.error('Original FASTA parsing failed:', result.error);
        console.error('This explains why AlignmentViewer2Component is not working');
      } else {
        console.log('Original FASTA is valid - the issue may be elsewhere');
      }
    });
  });

  describe('Generate Test Files', function() {
    it('should create fixed FASTA files for testing', function() {
      const testDir = path.join(process.cwd(), 'test-fasta-files');

      // Create test directory if it doesn't exist
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Generate minimal test file
      const minimalFasta = `>seq1
ACGTACGTACGT
>seq2
ACGTACGTACGT`;
      fs.writeFileSync(path.join(testDir, 'minimal-test.fasta'), minimalFasta);

      // Generate cleaned version of norovirus file
      const cleanedFasta = cleanFastaForTesting(fastaContent);
      fs.writeFileSync(path.join(testDir, 'norovirus-cleaned.fasta'), cleanedFasta);

      // Generate shortened version
      const shortenedFasta = createShortenedVersion(fastaContent);
      fs.writeFileSync(path.join(testDir, 'norovirus-shortened.fasta'), shortenedFasta);

      console.log('Test FASTA files created in:', testDir);
      console.log('Files created:');
      console.log('- minimal-test.fasta (simple test)');
      console.log('- norovirus-cleaned.fasta (cleaned original)');
      console.log('- norovirus-shortened.fasta (shortened original)');
    });
  });
});

// Helper functions
function parseFastaToSequences(fastaContent) {
  const sequences = [];
  const lines = fastaContent.split('\n');
  let currentSeq = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('>')) {
      if (currentSeq) {
        sequences.push(currentSeq);
      }
      currentSeq = {
        id: trimmedLine.substring(1),
        sequence: ''
      };
    } else if (currentSeq && trimmedLine) {
      currentSeq.sequence += trimmedLine;
    }
  }

  if (currentSeq) {
    sequences.push(currentSeq);
  }

  return sequences;
}

function testFastaCompatibility(fastaContent) {
  try {
    // Simulate the validation that AlignmentViewer2Component does
    if (!fastaContent) {
      return { isValid: false, error: 'No FASTA content provided' };
    }

    if (typeof fastaContent !== 'string') {
      return { isValid: false, error: 'FASTA content is not a string' };
    }

    if (fastaContent.length === 0) {
      return { isValid: false, error: 'FASTA content is empty' };
    }

    if (!fastaContent.trim().startsWith('>')) {
      return { isValid: false, error: 'FASTA content does not start with >' };
    }

    const sequences = parseFastaToSequences(fastaContent);

    if (sequences.length === 0) {
      return { isValid: false, error: 'No sequences found in FASTA' };
    }

    // Check sequence lengths
    const lengths = sequences.map(seq => seq.sequence.length);
    const uniqueLengths = [...new Set(lengths)];

    if (uniqueLengths.length > 1) {
      return {
        isValid: false,
        error: `Sequence length mismatch: found lengths ${uniqueLengths.join(', ')}`
      };
    }

    // Check for invalid characters (be more permissive than strict parsers)
    const validChars = /^[ACGTUacgtu\-\.Nn\s]*$/;
    for (const seq of sequences) {
      if (!validChars.test(seq.sequence)) {
        return {
          isValid: false,
          error: `Invalid characters found in sequence: ${seq.id}`
        };
      }
    }

    return { isValid: true, sequences };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

function cleanFastaForTesting(fastaContent) {
  const sequences = parseFastaToSequences(fastaContent);

  // Find the most common sequence length
  const lengths = sequences.map(seq => seq.sequence.length);
  const lengthCounts = {};
  lengths.forEach(len => {
    lengthCounts[len] = (lengthCounts[len] || 0) + 1;
  });

  const mostCommonLength = Object.keys(lengthCounts).reduce((a, b) =>
    lengthCounts[a] > lengthCounts[b] ? a : b
  );

  // Clean and standardize sequences
  const cleanedSequences = sequences.map(seq => {
    let cleanSequence = seq.sequence
      .toUpperCase()                    // Convert to uppercase
      .replace(/[^ACGTUN\-]/g, 'N');    // Replace invalid chars with N

    // Pad or truncate to common length
    if (cleanSequence.length < mostCommonLength) {
      cleanSequence = cleanSequence.padEnd(mostCommonLength, '-');
    } else if (cleanSequence.length > mostCommonLength) {
      cleanSequence = cleanSequence.substring(0, mostCommonLength);
    }

    return {
      id: seq.id.replace(/[^\w\s\|\.\-]/g, '_'), // Clean header
      sequence: cleanSequence
    };
  });

  // Convert back to FASTA format
  return cleanedSequences.map(seq => `>${seq.id}\n${seq.sequence}`).join('\n');
}

function createShortenedVersion(fastaContent) {
  const sequences = parseFastaToSequences(fastaContent);

  // Take first 2 sequences and shorten them
  const shortenedSequences = sequences.slice(0, 2).map(seq => ({
    id: seq.id,
    sequence: seq.sequence.substring(0, 200).replace(/^-+/, '').replace(/-+$/, '') // Remove leading/trailing gaps
  }));

  // Ensure same length
  const minLength = Math.min(...shortenedSequences.map(seq => seq.sequence.length));
  shortenedSequences.forEach(seq => {
    seq.sequence = seq.sequence.substring(0, minLength);
  });

  return shortenedSequences.map(seq => `>${seq.id}\n${seq.sequence}`).join('\n');
}
