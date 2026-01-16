# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for bundling Phylo-Movies backend.

Usage:
    cd electron-app/backend
    pyinstaller brancharchitect.spec --clean

Prerequisites:
    - BranchArchitect cloned in ./BranchArchitect
    - poetry install run in BranchArchitect directory
"""

import os
import sys

# Add BranchArchitect to the path for analysis
brancharchitect_path = os.path.join(os.path.dirname(os.path.abspath(SPEC)), 'BranchArchitect')
if os.path.isdir(brancharchitect_path):
    sys.path.insert(0, brancharchitect_path)

a = Analysis(
    ['server.py'],
    pathex=[brancharchitect_path],
    binaries=[],
    datas=[
        # Include BranchArchitect webapp templates/static if needed
        # (os.path.join(brancharchitect_path, 'webapp', 'templates'), 'webapp/templates'),
    ],
    hiddenimports=[
        # Flask
        'flask', 'flask_cors', 'werkzeug', 'jinja2', 'click',
        # BranchArchitect
        'brancharchitect', 'webapp', 'webapp.routes', 'webapp.routes.routes',
        'webapp.services', 'webapp.config',
        # Scientific stack
        'numpy', 'scipy', 'scipy.special', 'scipy.linalg',
        'skbio', 'skbio.tree', 'skbio.io',
        'Bio', 'Bio.Phylo', 'Bio.SeqIO', 'Bio.AlignIO',
        'pandas', 'matplotlib',
        # MSA pipeline
        'msa_to_trees', 'msa_to_trees.pipeline', 'msa_to_trees.split_alignment',
    ],
    excludes=['tkinter', 'PyQt5', 'IPython', 'jupyter', 'pytest'],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='brancharchitect-server',
    debug=False,
    strip=False,
    upx=True,
    console=True,
)
