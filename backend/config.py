from pathlib import Path


class Config:
    """Central configuration for the Flask backend.

    Change only the attributes below if you need to tweak behaviour; the rest
    of the application imports this object so there is a *single* source of
    truth.
    """

    # Flask core -------------------------------------------------
    DEBUG: bool = True
    TEMPLATES_AUTO_RELOAD: bool = True
    # Uploads up to 16 MiB (Newick collections can get large)
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024

    # Paths ------------------------------------------------------
    PROJECT_ROOT: Path = Path(__file__).resolve().parent
    LOG_DIR: Path = PROJECT_ROOT / "logs"
    LOG_FILE: Path = LOG_DIR / "debug_log.html"

    # PCA / random‑state so results are reproducible during a session
    PCA_RANDOM_STATE: int = 42

    # Number of PCA components sent to the 3‑D viewer in the front‑end
    PCA_COMPONENTS: int = 3
