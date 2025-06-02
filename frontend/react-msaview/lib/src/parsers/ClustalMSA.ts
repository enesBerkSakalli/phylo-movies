import { parse } from 'clustal-js'

import type { NodeWithIds } from '../types'

export default class ClustalMSA {
  private MSA: ReturnType<typeof parse>

  constructor(text: string) {
    const msa = parse(text)

    if (!msa || !msa.alns || !Array.isArray(msa.alns)) {
      console.warn("Failed to parse CLUSTAL data. Displaying empty MSA.")
      this.MSA = {
        header: { desc: 'Failed to parse CLUSTAL data' },
        alns: [],
        consensus: '',
        version: '',
      }
    } else {
      this.MSA = msa
    }
  }

  getMSA() {
    return this.MSA
  }

  getRow(name: string): string {
    return this.MSA.alns.find(aln => aln.id === name)?.seq || ''
  }

  getWidth() {
    if (!this.MSA.alns || this.MSA.alns.length === 0 || !this.MSA.alns[0]) {
      return 0
    }
    return this.MSA.alns[0].seq.length
  }

  getRowData() {
    return undefined
  }

  getHeader() {
    return this.MSA.header
  }

  getNames() {
    return this.MSA.alns.map(aln => aln.id)
  }

  getStructures() {
    return {}
  }

  get alignmentNames() {
    return []
  }

  getTree(): NodeWithIds {
    return {
      id: 'root',
      name: 'root',
      noTree: true,
      children: this.getNames().map(name => ({
        id: name,
        name,
        children: [],
      })),
    }
  }

  get seqConsensus() {
    return this.MSA.consensus
  }
  get secondaryStructureConsensus() {
    return undefined
  }

  get tracks() {
    return []
  }
}
