const fs = require("fs");
const path = require("path");
const { expect } = require("chai");

// Import parser functions (assuming they exist in the project)
const {
  parseMSA,
  parseFasta,
  parseClustal,
  parsePhylip,
} = require("../js/msaViewer/parsers.js");

describe("File Upload and Parsing Tests", () => {
  // Test data paths
  const fastaPath = path.join(__dirname, "test_data/alltrees.fasta");
  const newickPath = path.join(
    __dirname,
    "test_data/alltrees.trees_cutted.newick"
  );

  let fastaContent, newickContent;

  before(() => {
    // Load test files
    fastaContent = fs.readFileSync(fastaPath, "utf8");
    newickContent = fs.readFileSync(newickPath, "utf8");
  });

  describe("FASTA File Tests", () => {
    it("should load FASTA file successfully", () => {
      expect(fastaContent).to.be.a("string");
      expect(fastaContent.length).to.be.greaterThan(0);
    });

    it("should contain all expected sequences", () => {
      expect(fastaContent).to.include(">A1");
      expect(fastaContent).to.include(">A2");
      expect(fastaContent).to.include(">B1");
      expect(fastaContent).to.include(">B2");
      expect(fastaContent).to.include(">X");
      expect(fastaContent).to.include(">C1");
      expect(fastaContent).to.include(">C2");
      expect(fastaContent).to.include(">D1");
      expect(fastaContent).to.include(">D2");
      expect(fastaContent).to.include(">O1");
      expect(fastaContent).to.include(">O2");
    });

    it("should parse FASTA content correctly", () => {
      const sequences = parseFasta(fastaContent);

      expect(sequences).to.be.an("array");
      expect(sequences.length).to.equal(11); // 11 sequences

      // Check that each sequence has id and sequence properties
      sequences.forEach((seq) => {
        expect(seq).to.have.property("id");
        expect(seq).to.have.property("sequence");
        expect(seq.sequence.length).to.equal(6000); // Each sequence has 6000 bases
      });

      // Verify sequence IDs
      const ids = sequences.map((seq) => seq.id);
      expect(ids).to.include.members([
        "A1",
        "A2",
        "B1",
        "B2",
        "X",
        "C1",
        "C2",
        "D1",
        "D2",
        "O1",
        "O2",
      ]);
    });
  });

  describe("Newick File Tests", () => {
    it("should load Newick file successfully", () => {
      expect(newickContent).to.be.a("string");
      expect(newickContent.length).to.be.greaterThan(0);
    });

    it("should contain multiple trees", () => {
      // Each tree ends with a semicolon
      const treeCount = (newickContent.match(/;/g) || []).length;
      expect(treeCount).to.be.greaterThan(50); // Many trees in the file
    });

    it("should parse Newick content correctly", () => {
      const trees = parseNewick(newickContent);

      expect(trees).to.be.an("array");
      expect(trees.length).to.be.greaterThan(50);

      // Check first tree contains expected taxa
      trees.forEach((tree) => {
        expect(tree).to.include("A1:");
        expect(tree).to.include("A2:");
        expect(tree).to.include("B1:");
        expect(tree).to.include("B2:");
        expect(tree).to.include("X:");
        expect(tree).to.include("C1:");
        expect(tree).to.include("C2:");
        expect(tree).to.include("D1:");
        expect(tree).to.include("D2:");
        expect(tree).to.include("O1:");
        expect(tree).to.include("O2:");
      });
    });
  });

  describe("File Storage Tests", () => {
    it("should store FASTA data in localStorage", () => {
      // Mock localStorage
      global.localStorage = {
        items: {},
        getItem(key) {
          return this.items[key];
        },
        setItem(key, value) {
          this.items[key] = value;
        },
      };

      const sequences = parseFasta(fastaContent);
      global.localStorage.setItem(
        "phyloMovieMSAData",
        JSON.stringify({
          rawData: fastaContent,
          sequences: sequences,
        })
      );

      const stored = JSON.parse(
        global.localStorage.getItem("phyloMovieMSAData")
      );
      expect(stored).to.have.property("rawData");
      expect(stored).to.have.property("sequences");
      expect(stored.sequences.length).to.equal(11);
    });
  });
});

// Helper function for parsing Newick format
function parseNewick(newickString) {
  if (!newickString) return [];
  return newickString
    .split(";")
    .map((tree) => tree.trim())
    .filter((tree) => tree.length > 0);
}
