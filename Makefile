SHELL := /bin/bash

JS_FILES = extension.js prefs.js

.PHONY: clean all

all: walkpaper.zip

schemas: org.gnome.shell.extensions.walkpaper.gschema.xml
	mkdir -p schemas
	glib-compile-schemas --strict --targetdir=./schemas/ .

walkpaper.zip: schemas $(JS_FILES)
	zip walkpaper2.zip -r $(JS_FILES) metadata.json schemas

clean:
	rm -rf walkpaper2.zip schemas
