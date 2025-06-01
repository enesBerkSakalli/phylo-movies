const fs = require("fs");
const path = require("path");
const { expect } = require("chai");

// Import your actual parser functions - adjust path as needed
// const { parseFasta, parseNewick } = require('../js/parsers');

// If you can't import directly, implement mock parsers for testing
const parseFasta = (fastaString) => {
  if (!fastaString) return [];

  const sequences = [];
  const chunks = fastaString.split(">").filter(Boolean);

  chunks.forEach((chunk) => {
    const lines = chunk.split("\n");
    const id = lines[0].trim();
    const sequence = lines.slice(1).join("").replace(/\s/g, "");
    sequences.push({ id, sequence });
  });

  return sequences;
};

const parseNewick = (newickString) => {
  if (!newickString) return [];
  return newickString
    .split(";")
    .map((tree) => tree.trim())
    .filter((tree) => tree.length > 0);
};

describe("Parser Tests", () => {
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

  describe("FASTA Parser", () => {
    let sequences;

    before(() => {
      sequences = parseFasta(fastaContent);
    });

    it("should parse correct number of sequences", () => {
      expect(sequences).to.be.an("array");
      expect(sequences.length).to.equal(11);
    });

    it("should extract correct sequence IDs", () => {
      const ids = sequences.map((seq) => seq.id);
      expect(ids).to.have.members([
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

    it("should extract sequences of correct length", () => {
      // Each sequence in the file should be 6000 characters
      sequences.forEach((seq) => {
        expect(seq.sequence.length).to.equal(6000);
      });
    });

    it("should handle edge cases", () => {
      expect(parseFasta("")).to.be.an("array").that.is.empty;
      expect(parseFasta(null)).to.be.an("array").that.is.empty;
      expect(parseFasta(">seq1\nACGT")).to.deep.equal([
        { id: "seq1", sequence: "ACGT" },
      ]);
    });
  });

  describe("Newick Parser", () => {
    let trees;

    before(() => {
      trees = parseNewick(newickContent);
    });

    it("should parse correct number of trees", () => {
      expect(trees).to.be.an("array");
      // Count the number of semicolons (minus trailing empty string)
      const expectedCount = newickContent.split(";").length - 1;
      expect(trees.length).to.equal(expectedCount);
    });

    it("should parse trees with correct taxa", () => {
      // Each tree should contain all 11 taxa
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

    it("should include branch lengths", () => {
      // Check that branch lengths are present
      trees.forEach((tree) => {
        [
          "A1:",
          "A2:",
          "B1:",
          "B2:",
          "X:",
          "C1:",
          "C2:",
          "D1:",
          "D2:",
          "O1:",
          "O2:",
        ].forEach((taxon) => {
          const match = tree.match(new RegExp(`${taxon}(\\d+\\.\\d+)`));
          expect(match).to.not.be.null;
          expect(parseFloat(match[1])).to.be.a("number");
        });
      });
    });

    it("should handle edge cases", () => {
      expect(parseNewick("")).to.be.an("array").that.is.empty;
      expect(parseNewick(null)).to.be.an("array").that.is.empty;
      expect(parseNewick("(A:0.1,B:0.2);")).to.deep.equal(["(A:0.1,B:0.2)"]);
    });
  });
});
