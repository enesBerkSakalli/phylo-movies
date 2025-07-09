# --------------------------------------------------------------
#  run.py
# --------------------------------------------------------------
"""``python -m phylo_movies_backend`` launches the *development* server."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from __init__ import create_app
import argparse
from typing import Any, Mapping, cast

app = create_app()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=5000)
    # *Never* enable `debug=True` for production – use a real WSGI/ASGI server
    args = parser.parse_args()
    config: Mapping[str, Any] = cast(Mapping[str, Any], app.config)
    app.run(host=args.host, port=args.port, debug=bool(config.get("DEBUG", False)))
