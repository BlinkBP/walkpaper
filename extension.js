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

const WORKSPACE_COUNT_KEY = 'workspace-count';
const WALLPAPER_KEY = 'workspace-wallpapers';
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const CURRENT_WALLPAPER_KEY = 'picture-uri';

function _changeWallpaper() {
    let pathSettings = Convenience.getSettings();
    let paths = pathSettings.get_strv(WALLPAPER_KEY);
    let backgroundSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });
    let index = global.screen.get_active_workspace_index();
    let wallpaper = 'file://'.concat(paths[index]);
    backgroundSettings.set_string(CURRENT_WALLPAPER_KEY, wallpaper);
}

function init(metadata) {
  let workspaceCount = Meta.prefs_get_num_workspaces();
  let pathSettings = Convenience.getSettings();
  pathSettings.set_int(WORKSPACE_COUNT_KEY, workspaceCount);
  log("Walkpaper initiated.")
}

let signalId;

function enable() {
    signalId = global.screen.connect('workspace-switched', _changeWallpaper);
}

function disable() {
    if (signalId) {
	     global.screen.disconnect(signalId);
	     signalId = 0;
    }
}
