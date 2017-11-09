const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const WORKSPACE_COUNT_KEY = 'workspace-count';
const WORKSPACE_INDEX = 'workspace-index';
const WALLPAPER_KEY = 'workspace-wallpapers';
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const CURRENT_WALLPAPER_KEY = 'picture-uri';

let index = global.screen.get_active_workspace_index(); //initialized here then updated in _changeWallpaper()

function debugLog(s) {
  // log(s);
}

function _changeWallpaper() {

  let pathSettings = Convenience.getSettings();
  let paths = pathSettings.get_strv(WALLPAPER_KEY);
  let backgroundSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });

  debugLog("Walkpaper change from WS " + index);

  // Save wallpaper for previous WS if changed.
  let wallpaper = backgroundSettings.get_string(CURRENT_WALLPAPER_KEY);

  paths[index] = wallpaper;

  // Fill in empty entries up to to current, otherwise set_strv fails
  for (let i=0; i < index; i++) {
    if (typeof paths[i] === "undefined") {
      paths[i] = wallpaper;
    }
  }
  pathSettings.set_strv(WALLPAPER_KEY, paths);

  // Now get wallpaper for current workspace
  index = global.screen.get_active_workspace_index();
  debugLog("Walkpaper change WS to " + index);

  wallpaper = paths[index];
  if ((typeof wallpaper === "undefined") || (wallpaper == "")) {
    wallpaper = paths[0];  // Default
  }
  debugLog("Walkpaper set wallpaper to  " + wallpaper);
  backgroundSettings.set_string(CURRENT_WALLPAPER_KEY, wallpaper);
}

function _changeIndex() {
  let index = global.screen.get_active_workspace_index();
  backgroundSettings.set_string(WORKSPACE_INDEX, index);
}

function _workspaceNumChanged() {
  let workspaceNum = Meta.prefs_get_num_workspaces();
  let pathSettings = Convenience.getSettings();
  pathSettings.set_int(WORKSPACE_COUNT_KEY, workspaceNum);
}

function init(metadata) {
  log("Walkpaper init");
}

let wSwitchedSignalId = new Array(2);
let wAddedSignalId;
let wRemovedSignalId;

function enable() {
  log("Walkpaper enable");
  _workspaceNumChanged();
  wSwitchedSignalId[0] = global.screen.connect('workspace-switched', _changeWallpaper);
  wSwitchedSignalId[1] = global.screen.connect('workspace-switched', _changeIndex);
  wAddedSignalId = global.screen.connect('workspace-added', _workspaceNumChanged);
  wRemovedSignalId = global.screen.connect('workspace-removed', _workspaceNumChanged);
}

function disable() {
  log("Walkpaper disable");
  global.screen.disconnect(wSwitchedSignalId[0]);
  global.screen.disconnect(wSwitchedSignalId[1]);
  global.screen.disconnect(wAddedSignalId);
  global.screen.disconnect(wRemovedSignalId);
}
