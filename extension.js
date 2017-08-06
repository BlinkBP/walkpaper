// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-
// Sample extension code, makes clicking on the panel show a message
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const WALLPAPER_KEY = 'workspace-wallpapers';
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const CURRENT_WALLPAPER_KEY = 'picture-uri';

let index = global.screen.get_active_workspace_index();

function debugLog(s) {
  // log(s);
}

function _changeWallpaper() {

  let pathSettings = Convenience.getSettings();
  let paths = pathSettings.get_strv(WALLPAPER_KEY);
  let backgroundSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });

  debugLog("Walkpaper change from " + index);

  // Save wallpaper for previous WS if changed.
  let wallpaper = backgroundSettings.get_string(CURRENT_WALLPAPER_KEY);
  if (wallpaper != paths[index]) {
    paths[index] = wallpaper;
    pathSettings.set_strv(WALLPAPER_KEY, paths);
  }

  index = global.screen.get_active_workspace_index();
  debugLog("Walkpaper change to " + index);

  let wallpaper = paths[index];
  if ((typeof wallpaper === "undefined") || (wallpaper == "")) {
    wallpaper = paths[0];
  }
  debugLog("wallpaper is " + wallpaper);
  backgroundSettings.set_string(CURRENT_WALLPAPER_KEY, wallpaper);
}

function init(metadata) {
  log("Walkpaper init");
}

let wSwitchedSignalId;

function enable() {
  log("Walkpaper enable");
  wSwitchedSignalId = global.screen.connect('workspace-switched', _changeWallpaper);
}

function disable() {
  log("Walkpaper disable");
  global.screen.disconnect(wSwitchedSignalId);
}
