# --------------------------------------------------------------
#  logging_config.py
# --------------------------------------------------------------
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from config import Config


def configure_logging(app: Flask) -> None:
    """Attach both *file* and *console* handlers to ``app.logger``.

    *   **File handler** - HTML-wrapped `debug_log.html` (rotates at 1 MiB,
        keeps 5 backups).
    *   **Console handler** - colour-less, human-readable output for local dev.
    """

    # Ensure the log directory exists *before* touching the file.
    Config.LOG_DIR.mkdir(parents=True, exist_ok=True)

    # -------- File handler (rotating) --------
    file_handler = RotatingFileHandler(
        Config.LOG_FILE,
        maxBytes=1_000_000,  # 1 MiB each
        backupCount=5,
        encoding="utf‑8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        "<pre>%(asctime)s [%(levelname)s] %(name)s: %(message)s</pre>",
        "%Y‑%m‑%d %H:%M:%S",
    )
    file_handler.setFormatter(file_formatter)

    # -------- Console handler --------
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        "%H:%M:%S",
    )
    console_handler.setFormatter(console_formatter)

    # Attach only if not already present (avoids duplicates in watch‑reload)
    for handler in (file_handler, console_handler):
        if not any(isinstance(h, type(handler)) for h in app.logger.handlers):
            app.logger.addHandler(handler)

    app.logger.setLevel(logging.DEBUG)
