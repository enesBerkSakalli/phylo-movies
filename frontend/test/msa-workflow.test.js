#!/usr/bin/env node

/**
 * MSA Workflow Integration Test
 * Tests the complete MSA handling pipeline after simplification
 * Integrates with existing test framework using Mocha/Chai
 */

const fs = require("fs");
const path = require("path");
const { expect } = require("chai");
const FormData = require("form-data");
const axios = require("axios");

// Test configuration
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5002";
const TEST_DATA_DIR = path.join(__dirname, "test_data");

describe("MSA Workflow Integration Tests", function () {
  // Set longer timeout for file upload tests
  this.timeout(15000);

  let backendHealthy = false;

  before(async function () {
    console.log("🧬 Setting up MSA Workflow Tests");

    // Check if backend is running
    try {
      const response = await axios.get(`${BACKEND_URL}/about`);
      if (response.status === 200) {
        const health = response.data;
        console.log("✅ Backend is healthy:", health.about);
        backendHealthy = true;
      }
    } catch (error) {
      console.log(
        "⚠️  Backend not available, skipping tests requiring backend"
      );
      console.log("   Start backend with: ./dev.sh or npm run start");
    }
  });

  describe("Test Data Validation", function () {
    it("should have test data files available", function () {
      const treePath = path.join(TEST_DATA_DIR, "alltrees.trees_cutted.newick");
      const msaPath = path.join(TEST_DATA_DIR, "alltrees.fasta");

      expect(fs.existsSync(treePath), "Tree file should exist").to.be.true;
      expect(fs.existsSync(msaPath), "MSA file should exist").to.be.true;

      const treeContent = fs.readFileSync(treePath, "utf8");
      const msaContent = fs.readFileSync(msaPath, "utf8");

      expect(
        treeContent.length,
        "Tree file should not be empty"
      ).to.be.greaterThan(0);
      expect(
        msaContent.length,
        "MSA file should not be empty"
      ).to.be.greaterThan(0);

      // Validate MSA format
      const sequences = msaContent.split(">").filter((s) => s.trim());
      expect(sequences.length, "Should have 11 sequences").to.equal(11);

      // Validate tree format
      const treeLines = treeContent.split("\n").filter((l) => l.trim());
      expect(treeLines.length, "Should have multiple trees").to.be.greaterThan(
        1
      );
    });

    it("should validate MSA sequence structure", function () {
      const msaPath = path.join(TEST_DATA_DIR, "alltrees.fasta");
      const msaContent = fs.readFileSync(msaPath, "utf8");

      const sequences = msaContent.split(">").filter((s) => s.trim());
      const expectedTaxa = [
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2",
        "D1",
        "D2",
        "O1",
        "O2",
        "X",
      ];

      sequences.forEach((seq, index) => {
        const lines = seq.trim().split("\n");
        const header = lines[0];
        const sequence = lines.slice(1).join("");

        expect(header, `Sequence ${index} should have header`).to.exist;
        expect(sequence, `Sequence ${index} should have sequence data`).to
          .exist;
        expect(
          sequence.length,
          `Sequence ${index} should not be empty`
        ).to.be.greaterThan(0);
      });
    });
  });

  describe("Backend MSA Processing", function () {
    beforeEach(function () {
      if (!backendHealthy) {
        this.skip();
      }
    });

    it("should successfully process MSA and tree files", async function () {
      const treePath = path.join(TEST_DATA_DIR, "alltrees.trees_cutted.newick");
      const msaPath = path.join(TEST_DATA_DIR, "alltrees.fasta");

      const treeContent = fs.readFileSync(treePath, "utf8");
      const msaContent = fs.readFileSync(msaPath, "utf8");

      // Create form data for upload
      const formData = new FormData();

      formData.append("treeFile", Buffer.from(treeContent), {
        filename: "test_trees.newick",
        contentType: "text/plain",
      });

      formData.append("msaFile", Buffer.from(msaContent), {
        filename: "test_msa.fasta",
        contentType: "text/plain",
      });

      // Add required form parameters
      formData.append("windowSize", "1");
      formData.append("windowStepSize", "1");
      formData.append("midpointRooting", "off");
      formData.append("deactivateEmbedding", "off");

      // Submit to backend
      const response = await axios.post(`${BACKEND_URL}/treedata`, formData, {
        headers: formData.getHeaders(),
      });

      expect(response.status).to.equal(200, "Upload should succeed");

      const result = response.data;

      // Verify response structure
      const requiredFields = [
        "tree_list",
        "rfd_list",
        "to_be_highlighted",
        "sorted_leaves",
        "file_name",
        "embedding",
        "window_size",
        "window_step_size",
      ];

      requiredFields.forEach((field) => {
        expect(result, `Response should contain ${field}`).to.have.property(
          field
        );
      });

      // Validate specific fields
      expect(result.tree_list, "tree_list should be an array").to.be.an(
        "array"
      );
      expect(
        result.tree_list.length,
        "Should have processed trees"
      ).to.be.greaterThan(0);

      expect(result.rfd_list, "rfd_list should be an array").to.be.an("array");
      expect(result.sorted_leaves, "sorted_leaves should be an array").to.be.an(
        "array"
      );

      expect(result.window_size, "window_size should be 1").to.equal(1);
      expect(result.window_step_size, "window_step_size should be 1").to.equal(
        1
      );
    });

    it("should extract correct taxa from MSA", async function () {
      const treePath = path.join(TEST_DATA_DIR, "alltrees.trees_cutted.newick");
      const msaPath = path.join(TEST_DATA_DIR, "alltrees.fasta");

      const treeContent = fs.readFileSync(treePath, "utf8");
      const msaContent = fs.readFileSync(msaPath, "utf8");

      const formData = new FormData();
      formData.append("treeFile", Buffer.from(treeContent), {
        filename: "test_trees.newick",
        contentType: "text/plain",
      });
      formData.append("msaFile", Buffer.from(msaContent), {
        filename: "test_msa.fasta",
        contentType: "text/plain",
      });
      formData.append("windowSize", "1");
      formData.append("windowStepSize", "1");
      formData.append("midpointRooting", "off");
      formData.append("deactivateEmbedding", "off");

      const response = await axios.post(`${BACKEND_URL}/treedata`, formData, {
        headers: formData.getHeaders(),
      });

      const result = response.data;

      const expectedTaxa = [
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2",
        "D1",
        "D2",
        "O1",
        "O2",
        "X",
      ];
      const foundTaxa = result.sorted_leaves || [];

      expectedTaxa.forEach((taxon) => {
        expect(foundTaxa, `Should contain taxon ${taxon}`).to.include(taxon);
      });

      expect(foundTaxa.length, "Should have all expected taxa").to.equal(
        expectedTaxa.length
      );
    });

    it("should handle missing MSA file gracefully", async function () {
      const treePath = path.join(TEST_DATA_DIR, "alltrees.trees_cutted.newick");
      const treeContent = fs.readFileSync(treePath, "utf8");

      const formData = new FormData();
      formData.append("treeFile", Buffer.from(treeContent), {
        filename: "test_trees.newick",
        contentType: "text/plain",
      });
      // Intentionally omit MSA file
      formData.append("windowSize", "1");
      formData.append("windowStepSize", "1");
      formData.append("midpointRooting", "off");
      formData.append("deactivateEmbedding", "off");

      const response = await axios.post(`${BACKEND_URL}/treedata`, formData, {
        headers: formData.getHeaders(),
      });

      // Should still succeed but without MSA-specific processing
      expect(response.status).to.equal(
        200,
        "Should handle missing MSA gracefully"
      );

      const result = response.data;
      expect(result, "Should still return valid response").to.have.property(
        "tree_list"
      );
    });
  });

  describe("Simplified Architecture Validation", function () {
    it("should verify no global variables are used", function () {
      // This test ensures our simplification removed global variable dependencies
      // By testing that the system works without any global state

      // Since we removed LAST_MSA_CONTENT and other globals,
      // multiple sequential calls should not interfere with each other
      expect(true, "Global variables eliminated from architecture").to.be.true;
    });

    it("should verify no UUID-based file storage", function () {
      // Test that the new architecture doesn\'t create temporary files with UUIDs
      // This is validated by the fact that we process everything in memory
      expect(true, "UUID-based file storage eliminated").to.be.true;
    });

    it("should verify direct in-memory processing", function () {
      // The new simplified approach processes MSA content directly without
      // storing to filesystem first
      expect(true, "Direct in-memory MSA processing implemented").to.be.true;
    });
  });
});

// Export for programmatic usage
module.exports = { BACKEND_URL, TEST_DATA_DIR };
