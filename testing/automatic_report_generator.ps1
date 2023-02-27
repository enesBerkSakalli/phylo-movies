python -m phylomovie.services.automatic_report_creator
wsl --exec pandoc --from=markdown+header_attributes ./phylomovie/services/reports/auto/report.md -o ./phylomovie/services/reports/auto/report.html --standalone
