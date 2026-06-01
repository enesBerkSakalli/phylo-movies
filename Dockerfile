# ==============================================================================
#  Phylo-Movies — Multi-stage Docker build
#
#  Stage 1 (fixture-build):  Generate browser demo payloads from source data
#  Stage 2 (frontend-build): Build the Vite/React frontend
#  Stage 3 (backend):        Python 3.11 runtime with Flask backend + nginx
#                            serving the static frontend
# ==============================================================================

# ── Stage 1: Generate static demo payloads ───────────────────────────────────
FROM python:3.11-slim AS fixture-build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s /opt/poetry/bin/poetry /usr/local/bin/poetry

WORKDIR /app/engine/BranchArchitect

COPY engine/BranchArchitect/pyproject.toml engine/BranchArchitect/poetry.lock ./
RUN poetry install --no-root --no-directory

COPY engine/BranchArchitect/ ./
RUN poetry install

WORKDIR /app
COPY scripts/ scripts/
COPY publication_data/ publication_data/
RUN cd engine/BranchArchitect && \
    poetry run python ../../scripts/generate-frontend-fixtures.py --write --reuse-inferred


# ── Stage 2: Build frontend ──────────────────────────────────────────────────
FROM node:22-slim AS frontend-build

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY scripts/ scripts/
COPY assets/ assets/
COPY electron-app/build/ electron-app/build/
COPY --from=fixture-build /app/publication_data/ publication_data/
COPY src/ src/
COPY vite.config.mts tsconfig.json jsconfig.json components.json ./
RUN npm run build


# ── Stage 3: Python backend + static frontend ───────────────────────────────
FROM python:3.11-slim AS runtime

# System deps for scientific Python packages (numpy, scikit-bio, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gfortran \
        libopenblas-dev \
        nginx \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
ENV POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s /opt/poetry/bin/poetry /usr/local/bin/poetry

# ── Backend dependencies ─────────────────────────────────────────────────────
WORKDIR /app/engine/BranchArchitect

# Copy only dependency files first (cache layer)
COPY engine/BranchArchitect/pyproject.toml engine/BranchArchitect/poetry.lock ./
RUN poetry install --no-root --no-directory

# Copy the rest of the backend
COPY engine/BranchArchitect/ ./
RUN poetry install

# ── Frontend static files ────────────────────────────────────────────────────
COPY --from=frontend-build /app/dist /var/www/html

# ── nginx config ─────────────────────────────────────────────────────────────
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# ── Startup script ───────────────────────────────────────────────────────────
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/about || exit 1

ENTRYPOINT ["/entrypoint.sh"]
