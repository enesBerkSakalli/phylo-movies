# Latexmk configuration file
# Output all generated files to build/ directory

$out_dir = 'build';
$aux_dir = 'build';

# Use pdflatex
$pdf_mode = 1;
$pdflatex = 'pdflatex -interaction=nonstopmode -synctex=1 %O %S';

# Bibtex settings
$bibtex_use = 2;
