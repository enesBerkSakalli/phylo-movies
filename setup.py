from setuptools import setup, find_packages
setup(
    name='phylo-movies',
    version='1.0',
    long_description=__doc__,
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=['biopython==1.79',
                      'ete3==3.1.2',
                      'Flask==2.0.1',
                      'Jinja2==3.0.1',
                      'Werkzeug==2.0.1',
                      'icecream'
                      ]
)
