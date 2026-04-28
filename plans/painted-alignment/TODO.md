# Phylo-Movies Publication Readiness Checklist

This checklist tracks tasks required for scientific publication submission (JOSS, Bioinformatics, etc.).

---

## 🔴 Critical (Must fix before submission)

- [x] **Fix splash-preload.js in build files** - Added to electron-app/package.json
- [x] **Sync version numbers (0.64.0)** - Updated package.json and electron-app/package.json
- [x] **Update CITATION.cff with ORCID structure** - Added placeholders for ORCID, DOI, co-authors

### Manual TODO items in CITATION.cff:
- [ ] Replace ORCID placeholder with your real ORCID: `https://orcid.org/XXXX-XXXX-XXXX-XXXX`
- [ ] Archive on Zenodo and replace DOI placeholder: `10.5281/zenodo.XXXXXXX`
- [ ] Add co-authors if applicable
- [ ] Uncomment and fill `preferred-citation` section when paper is published

---

## 🟠 Journal Requirements (JOSS/Bioinformatics)

- [ ] **Add State of the Field section** - Compare to: FigTree, iTOL, Dendroscope, ggtree, IcyTree
- [ ] **Add AI Usage Disclosure section** - Required by JOSS as of 2024
- [ ] **Add Reproducibility section to README** - Commands to reproduce paper figures
- [ ] **Add algorithm references/citations** - Cite Robinson-Foulds (1981), D3.js, deck.gl

---

## 🟡 Reproducibility & Credibility

- [ ] **Document dataset provenance in data/** - Add accession numbers, sources, licenses
- [ ] **Add performance benchmarks section** - Document: X trees, Y taxa, Z seconds
- [ ] **Add Limitations section** - Max dataset size, browser requirements, known issues
- [ ] **Create Dockerfile for reproducibility** - For GRSI reproducibility stamp
- [ ] **Create CHANGELOG.md** - Version history for reproducibility

---

## 📋 Additional Recommendations

### Desktop App (Electron)
- [ ] Add code signing for macOS/Windows distribution
- [ ] Add auto-updater for version updates
- [ ] Add crash reporter (electron-log + Sentry)
- [ ] Document expected startup time in README

### Documentation
- [ ] Add mathematical notation for interpolation algorithm
- [ ] Document edge cases (polytomies, negative branch lengths)
- [ ] Add file format specifications (exact Newick dialect)
- [ ] Create error messages guide

### Security (Already Fixed)
- [x] Splash window security (contextIsolation, sandbox)
- [x] Flask host binding (127.0.0.1 instead of 0.0.0.0)

---

## 📚 References to Add

```bibtex
@article{robinson1981comparison,
  title={Comparison of phylogenetic trees},
  author={Robinson, David F and Foulds, Leslie R},
  journal={Mathematical biosciences},
  volume={53},
  number={1-2},
  pages={131--147},
  year={1981},
  doi={10.1016/0025-5564(81)90043-2}
}

@software{d3js,
  title={D3.js - Data-Driven Documents},
  author={Bostock, Mike},
  url={https://d3js.org}
}

@software{deckgl,
  title={deck.gl: Large-scale WebGL-powered Data Visualization},
  author={Uber Technologies},
  url={https://deck.gl}
}
```

---

## 🎯 Submission Checklist

Before submitting to a journal:

1. [ ] All tests pass: `npm test`
2. [ ] Build succeeds: `npm run build`
3. [ ] Electron app builds: `cd electron-app && npm run build:mac`
4. [ ] Demo videos are accessible (check YouTube links)
5. [ ] Example data loads correctly
6. [ ] Zenodo archive created with DOI
7. [ ] CITATION.cff validated: https://citation-file-format.github.io/cff-initializer-beta/
8. [ ] README badges show correct status
9. [ ] All TODO placeholders filled in

---

*Last updated: 2026-02-03*
