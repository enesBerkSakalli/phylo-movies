#!/usr/bin/env python3
"""
Phylo-Movies Desktop - Backend Server

Entry point for the bundled Flask backend.
"""

import argparse
import os
import sys
import logging


def setup_paths():
    """Set up Python paths for the bundled environment."""
    if getattr(sys, "frozen", False):
        # Running in a PyInstaller bundle
        bundle_dir = sys._MEIPASS
        sys.path.insert(0, bundle_dir)
    else:
        # Running in development - add BranchArchitect to path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        brancharchitect_path = os.path.join(script_dir, "BranchArchitect")
        if os.path.isdir(brancharchitect_path):
            sys.path.insert(0, brancharchitect_path)
            print(f"Added BranchArchitect to path: {brancharchitect_path}")


setup_paths()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("phylo-movies-server")


def main():
    parser = argparse.ArgumentParser(description="Phylo-Movies Backend Server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5002)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    logger.info(f"Starting server on {args.host}:{args.port}")

    try:
        from webapp import create_app

        app = create_app()

        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug,
            use_reloader=False,
            threaded=True,
        )
    except ImportError as e:
        logger.error(f"Failed to import webapp: {e}")
        logger.error(
            "Make sure BranchArchitect is installed: pip install -r requirements.txt"
        )
        sys.exit(1)
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
