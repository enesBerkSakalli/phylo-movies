const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
// const FormData = require('form-data');
// const fetch = require('node-fetch');

describe.skip('API Route Tests', () => {
  const fastaPath = path.join(__dirname, 'test_data/alltrees.fasta');
  const newickPath = path.join(__dirname, 'test_data/alltrees.trees_cutted.newick');
  const baseUrl = process.env.API_URL || 'http://localhost:3000/api';

  it('should upload FASTA file successfully', async function() {
    this.timeout(10000); // Increase timeout for file upload
    
    const form = new FormData();
    form.append('file', fs.createReadStream(fastaPath), {
      filename: 'alltrees.fasta',
      contentType: 'text/plain',
    });

    const response = await fetch(`${baseUrl}/upload/msa`, {
      method: 'POST',
      body: form,
    });

    expect(response.status).to.equal(200);
    
    const result = await response.json();
    expect(result).to.have.property('success', true);
    expect(result).to.have.property('sequences');
    expect(result.sequences).to.be.an('array');
    expect(result.sequences.length).to.equal(11);
  });

  it('should upload Newick file successfully', async function() {
    this.timeout(10000); // Increase timeout for file upload
    
    const form = new FormData();
    form.append('file', fs.createReadStream(newickPath), {
      filename: 'alltrees.trees_cutted.newick',
      contentType: 'text/plain',
    });

    const response = await fetch(`${baseUrl}/upload/trees`, {
      method: 'POST',
      body: form,
    });

    expect(response.status).to.equal(200);
    
    const result = await response.json();
    expect(result).to.have.property('success', true);
    expect(result).to.have.property('trees');
    expect(result.trees).to.be.an('array');
    expect(result.trees.length).to.be.greaterThan(50);
  });

  it('should reject invalid FASTA files', async () => {
    // Create an invalid FASTA file
    const invalidFastaPath = path.join(__dirname, 'temp_invalid.fasta');
    fs.writeFileSync(invalidFastaPath, 'This is not a valid FASTA file');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(invalidFastaPath), {
      filename: 'invalid.fasta',
      contentType: 'text/plain',
    });

    const response = await fetch(`${baseUrl}/upload/msa`, {
      method: 'POST',
      body: form,
    });

    // Clean up the temporary file
    fs.unlinkSync(invalidFastaPath);
    
    expect(response.status).to.be.oneOf([400, 422]); // Bad request or unprocessable entity
    
    const result = await response.json();
    expect(result).to.have.property('success', false);
    expect(result).to.have.property('error');
  });

  it('should reject invalid Newick files', async () => {
    // Create an invalid Newick file
    const invalidNewickPath = path.join(__dirname, 'temp_invalid.newick');
    fs.writeFileSync(invalidNewickPath, 'This is not a valid Newick file');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(invalidNewickPath), {
      filename: 'invalid.newick',
      contentType: 'text/plain',
    });

    const response = await fetch(`${baseUrl}/upload/trees`, {
      method: 'POST',
      body: form,
    });

    // Clean up the temporary file
    fs.unlinkSync(invalidNewickPath);
    
    expect(response.status).to.be.oneOf([400, 422]); // Bad request or unprocessable entity
    
    const result = await response.json();
    expect(result).to.have.property('success', false);
    expect(result).to.have.property('error');
  });
});
