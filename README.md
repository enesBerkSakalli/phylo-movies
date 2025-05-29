# PhyloMovies 🎬🌳

An interactive phylogenetic tree viewer focused on visualizing tree trajectories, morphing animations, and comparing evolutionary relationships between trees. PhyloMovies provides an intuitive interface for exploring phylogenetic data with smooth animations and comprehensive analysis tools.

## 🎥 Demo Video

<!-- Direct link to video in repository root -->
🎬 [Demo Video on YouTube](https://www.youtube.com/watch?v=zf_UNh2EjUg)
   See the example on the norovirus dataset, showcasing the interactive features and tree morphing capabilities.
   [Edit this video on YouTube Studio](https://studio.youtube.com/video/lqur97hfok0/edit)
<!-- Alternative: GitHub raw link if you want direct streaming -->
## ✨ Features

### 🎭 Interactive Tree Visualization

- **Smooth Tree Morphing**: Watch phylogenetic trees transform with fluid animations
- **Multiple Tree Types**: View full trees, intermediate states, and consensus trees
- **Customizable Rendering**: Adjust branch thickness, font size, and coloring schemes
- **Zoom & Pan**: Navigate large trees with intuitive zoom controls

### 📊 Comprehensive Analysis Tools

- **Robinson-Foulds Distance Charts**: Visualize tree similarity metrics over time
- **Weighted Distance Analysis**: Explore branch-length aware comparisons
- **Scale Visualization**: Track evolutionary scale changes across tree series
- **Interactive Chart Navigation**: Click and drag to navigate through tree sequences

### 🧬 MSA Integration

- **Multiple Sequence Alignment Viewer**: View aligned sequences alongside trees
- **Synchronized Highlighting**: Taxa selection syncs between tree and alignment views
- **Position Tracking**: Navigate specific alignment positions with tree states
- **Dark Theme Interface**: Consistent styling across all viewer components

### 🎬 Recording & Export

- **Screen Recording**: Capture tree animations and analysis sessions
- **SVG Export**: Save high-quality vector graphics of trees and charts
- **Automatic Save**: Optional auto-download of recordings
- **Multiple Formats**: Support for various export formats

### 🔧 Advanced Features

- **Tree Comparison**: Side-by-side comparison of different trees

- **Taxa Coloring**: Custom color schemes for highlighting specific groups
- **Scatter Plot Analysis**: Explore tree relationships in multidimensional space
- **Responsive Design**: Works seamlessly across different screen sizes

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or newer
- Modern web browser with JavaScript enabled
- Git (for cloning the repository)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/enesBerkSakalli/phylo-movies.git
   cd phylo-movies
   ```

2. **Set up Python environment**

   ```bash
   python -m venv phylomovies_environment
   source phylomovies_environment/bin/activate  # On Windows: phylomovies_environment\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   python -m pip install -r requirements.txt
   ```

### Running the Application

#### Development Server (Recommended for testing)
```bash
export FLASK_APP=phylomovie.app
export FLASK_ENV=phylomovies_environment
python -m flask run
```

The application will be available at `http://localhost:5000`

#### Production Server

For production deployments, use Gunicorn:

```bash
python -m pip install gunicorn
python -m gunicorn phylomovie.app:app
```

#### Reverse Proxy (Recommended for public instances)

For public-facing deployments, use a reverse proxy like nginx for better security and performance.

## 📖 Usage Guide

### Loading Phylogenetic Data

1. Upload your tree files (Newick format supported)
2. Optionally upload Multiple Sequence Alignment (MSA) files
3. Configure visualization parameters (window size, step size, etc.)

### Navigation Controls

- **Play/Pause**: Start or stop tree animation sequences
- **Step Forward/Backward**: Navigate frame by frame through tree transitions
- **Tree Navigation**: Jump between major tree states
- **Speed Control**: Adjust animation speed (1x to 10x)

### Analysis Features

- **Chart Viewer**: Open interactive charts showing distance metrics
- **MSA Viewer**: Launch the sequence alignment viewer
- **Tree Comparison**: Compare different trees side by side
- **Recording**: Capture your analysis sessions as videos

### Customization Options

- **Branch Coloring**: Highlight internal branches and specific taxa
- **Scale Adjustment**: Modify tree scaling and branch lengths
- **Color Schemes**: Apply custom coloring to taxa groups
- **Export Settings**: Configure output formats and quality

## 🛠️ Technical Details

### Architecture

- **Backend**: Python Flask application
- **Frontend**: Modern JavaScript with D3.js for visualizations
- **Tree Rendering**: Custom SVG-based tree drawing engine
- **Chart Generation**: Interactive D3.js charts with zoom and pan
- **MSA Viewer**: React-based sequence alignment component

### File Formats Supported

- **Trees**: Newick format (.nwk, .tree, .tre)
- **Alignments**: FASTA format (.fasta, .fas, .fa)
- **Export**: SVG, PNG (trees), WebM (recordings)

### Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

### Performance Considerations

- Optimized for datasets with hundreds of taxa
- Progressive loading for large tree series
- Memory-efficient rendering pipeline
- Responsive design for various screen sizes

## 📁 Project Structure

```
phylo-movies/
├── frontend/                 # Client-side application
│   ├── js/                  # JavaScript modules
│   │   ├── charts/          # Chart generation
│   │   ├── msaViewer/       # MSA viewer components
│   │   ├── record/          # Screen recording
│   │   └── treeVisualisation/ # Tree rendering
│   ├── css/                 # Stylesheets
│   └── partials/            # HTML components
├── phylomovie/              # Python backend
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to:

- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

### Development Setup

1. Follow the installation instructions above
2. Create a new branch for your feature
3. Make your changes with appropriate tests
4. Submit a pull request with a clear description

## 📝 License

This project is open source. Please check the license file for specific terms and conditions.

## 🔬 Citation

If you use PhyloMovies in your research, please consider citing:

PhyloMovies: An Interactive Phylogenetic Tree Visualization Platform

[Authors and publication details to be added]

## 🆘 Support & Documentation

### Getting Help

- **Issues**: Report bugs on GitHub Issues
- **Documentation**: Check the wiki for detailed guides
- **Community**: Join discussions in GitHub Discussions

### Common Issues

- **Installation Problems**: Ensure Python 3.9+ and all dependencies are installed
- **Browser Issues**: Use a modern browser with JavaScript enabled
- **Performance**: For large datasets, consider reducing animation speed
- **File Upload**: Ensure files are in supported formats (Newick, FASTA)

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended for large datasets
- **Storage**: 1GB free space for installation and temporary files
- **Network**: Internet connection required for initial setup

## 🚧 Roadmap

### Upcoming Features

- [ ] Additional file format support (Nexus, PhyloXML)
- [ ] Advanced statistical analysis tools
- [ ] Collaborative features for team analysis
- [ ] Mobile-responsive optimizations
- [ ] Plugin system for custom visualizations

### Version History

- **v1.0**: Initial release with basic tree visualization
- **v1.1**: Added MSA integration and recording features
- **v1.2**: Enhanced chart system and export capabilities
- **Current**: Improved UI/UX and performance optimizations

---

**PhyloMovies** - Making phylogenetic analysis interactive and intuitive 🧬✨