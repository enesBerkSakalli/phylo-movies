# Contributing to Phylo-Movies

Thank you for your interest in contributing to Phylo-Movies! We welcome contributions from the scientific and open-source community to help improve this phylogenetic visualization tool.

## Code of Conduct

By participating in this project, you are expected to uphold a standard of conduct that fosters an open, welcoming, and inclusive community.

## How to Contribute

### Reporting Bugs

- **Search existing issues** to avoid duplicates.
- **Open a new issue** provided you can't find an existing one.
- **Provide reproduction steps**: Include sample Newick strings or steps to reproduce the visual glitch.
- **Environment**: State your browser, OS, and version.

### Suggesting Enhancements

- Open an issue tagged as `enhancement`.
- Describe the feature and its scientific utility (e.g., "Add Robinson-Foulds distance metric to the dashboard").

### Pull Requests

1. **Fork the repository** and create a feature branch (`git checkout -b feature/amazing-feature`).
2. **Follow the code style**:
   - Python: Follow PEP 8.
   - JavaScript/React: Follow the existing ESLint configuration.
3. **Run Tests**:
   - Backend: `poetry run pytest`
   - Frontend: `npm test`
4. **Documentation**: Update `README.md` or docstrings if you change behavior.
5. **Commit**: Use descriptive commit messages.
6. **Push** to your branch and open a Pull Request.

## Development Setup

### Backend (BranchArchitect)

Located in `electron-app/BranchArchitect`.

```bash
cd electron-app/BranchArchitect
poetry install
./start_movie_server.sh
```

### Frontend

Located in the root.

```bash
npm install
npm run dev
```

## Testing Requirements

For scientific accuracy, all new features affecting tree topology or metrics must include:
- Unit tests
- Validation against known datasets (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
