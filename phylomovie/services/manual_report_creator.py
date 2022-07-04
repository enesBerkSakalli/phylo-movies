import click
from phylomovie.services.automatic_report_creator import main
from icecream import ic

@click.command()
@click.argument("outpath")
@click.option("--figures/--no-figures", default=False)
@click.option("--algo-filter", default=None)
@click.option("--path-filter", default=None)
@click.option("--debug/--no-debug", default=False)
def cli(outpath, figures, algo_filter, path_filter, debug):

    if debug:
        ic.enable()

    if algo_filter:
        def f_algo(x):
            return algo_filter in x
    else:
        f_algo = lambda x: True

    if path_filter:
        def f(x):
            return path_filter in x
        f_path = f
    else:
        f_path = lambda x: True

    main(make_figures=figures, outpath=outpath, algorithm_filter=f_algo, path_filter=f_path)

if __name__ == "__main__":
    cli()


