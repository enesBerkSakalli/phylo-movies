# PhyloMovies

Interactive phylogenetic tree viewer with a focus on tree trajectories and visualising the difference between two trees.

## Installation

Download the source code from [github](https://github.com/enesBerkSakalli/phylo-movies) and have python in version 3.9 or newer installed. Create a python virtual environment `python -m venv phylomovies_environment` and activate it `source phylomovies_environment/bin/activate`. Install all requirements from the `requirements.txt` file with pip `python -m pip install -r requirements.txt`. To temporarily run phylomovies use the flask development server:

    export FLASK_APP=phylomovie.app
    export FLASK_ENV=phylomovies_environment
    python -m flask run

which starts a server on `http://localhost:5000`. For a more permanent installation use the gunicorn WSGI server (install gunicorn into the virtual environment `python -m pip install gunicorn`):

    python -m gunicorn phylomovie.app:app

It is recommended to use a reverse-proxy like nginx for instances that are reachable from the public internet.
