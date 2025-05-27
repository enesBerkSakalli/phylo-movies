# --------------------------------------------------------------
#  run.py
# --------------------------------------------------------------
"""``python -m phylo_movies_backend`` launches the *development* server."""
from . import create_app
import argparse

app = create_app()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()
    # *Never* enable `debug=True` for production – use a real WSGI/ASGI server
    app.run(host=args.host, port=args.port, debug=app.config["DEBUG"])