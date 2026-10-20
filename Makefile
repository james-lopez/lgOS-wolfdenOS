# lgOS-wolfdenOS (wolfdenOS / wolf OS)
# Built on throwaway96/slopbro
# Copyright 2026. Licensed under AGPL v3 or later. No warranties.

INPUT_SCRIPT = wolfdenOS.py
WWWROOT_FILES = index.html autoroot.sh package.json main.js debloat_home.sh wolfdenos.ipk
PACKED_FILE = dist/wolfdenOS_packed.py
LAUNCHER_IPK = wwwroot/wolfdenos.ipk

PACKAGING_TOOL = tools/package_single_file.py
IPK_TOOL = tools/build_launcher_ipk.py

.PHONY: all
all: dist

# The ipk is generated from debloat_home.sh's heredocs, so it must be rebuilt
# whenever the launcher UI changes.
$(LAUNCHER_IPK): $(IPK_TOOL) wwwroot/debloat_home.sh
	python3 '$(IPK_TOOL)' --out '$(LAUNCHER_IPK)'

.PHONY: ipk
ipk: $(LAUNCHER_IPK)

.PHONY: dist
dist: $(PACKAGING_TOOL) $(INPUT_SCRIPT) $(LAUNCHER_IPK) $(addprefix wwwroot/, $(WWWROOT_FILES))
	python3 '$(PACKAGING_TOOL)' --source '$(INPUT_SCRIPT)' --files $(WWWROOT_FILES) --out '$(PACKED_FILE)'

.PHONY: clean
clean:
	rm -rf -- 'dist/' '$(LAUNCHER_IPK)'
