SHELL := /bin/bash

JS_FILES = {extension,convenience,prefs}.js

.PHONY: clean all

all: walkpaper.zip

schemas:
	glib-compile-schemas --strict --targetdir=./schemas/ ./schemas

hidetopbar.zip: schemas
	zip walkpaper.zip -r $(JS_FILES) metadata.json locale/*/*/*.mo schemas

clean:
	rm -rf walkpaper.zip schemas
