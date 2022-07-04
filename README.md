# phylo-movies
Phylo-Movies

# Combined-Developement-Master

The main project focus is to build a tool for dynamic visualisation of phylogenetic trees like a media player, which enables browsing dynamically through a list of trees. Primarily the wish is to visualise a trajectory of trees along an alignment, by helping the human eye to catch changes between trees with the same leaves but different hierarchies.

Dependencies: flask and Biopython 

Then install gunicorn with

```bash
sudo apt-get install gunicorn3
```

Then direct into the first combinedProjects Folder and call

```bash
gunicorn3 combinedProject.wsgi
```
