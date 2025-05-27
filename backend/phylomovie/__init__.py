# --------------------------------------------------------------
#  __init__.py (package root)
# --------------------------------------------------------------
from flask import Flask

from .config import Config
from .logging_config import configure_logging
from .routes import bp as main_bp
from pathlib import Path

__all__ = ["create_app"]


def create_app() -> Flask:
    """Factory for the Flask WSGI application.

    Using a *factory* makes unit testing trivial (each test just calls
    ``create_app()``) and prevents module-level side effects.
    """

    app = Flask(__name__, static_folder="static")
    app.config.from_object(Config)

    # Logging first so early import failures are visible
    configure_logging(app)

    # Register blueprints (keeps route definitions in *one* place)
    app.register_blueprint(main_bp)

    # Inject config into Jinja globals so templates can access constants
    app.jinja_env.globals.update(config=app.config)

    # Expose short *commit* string if present (useful in sentry etc.)
    try:
        with open(Path(__file__).resolve().parent.parent / "commithash", "r") as fp:
            app.config["APP_COMMIT"] = fp.read().strip()
    except FileNotFoundError:
        app.config["APP_COMMIT"] = "unknown"
    return app