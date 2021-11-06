const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const WORKSPACE_COUNT_KEY = 'workspace-count';
const WORKSPACE_INDEX = 'workspace-index';
const WALLPAPERS_KEY = 'workspace-wallpapers';
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
const CURRENT_WALLPAPER_KEY = 'picture-uri';

let _settings = Convenience.getSettings();

function debugLog(s) {
    //log(s);
}

function _changeWallpaper() {
    debugLog("changeWallpaper");
    let backgroundSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });
    let paths = _settings.get_strv(WALLPAPERS_KEY);
    let index = _settings.get_int(WORKSPACE_INDEX);

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
    _settings.set_strv(WALLPAPERS_KEY, paths);

    // Now get wallpaper for current workspace
    index = global.workspace_manager.get_active_workspace_index();
    debugLog("Walkpaper change to WS " + index);

    wallpaper = paths[index];
    if ((typeof wallpaper === "undefined") || (wallpaper == "")) {
        wallpaper = paths[0];    // Default
    }

    //Change wallpaper
    debugLog("Walkpaper set wallpaper to " + wallpaper);
    backgroundSettings.set_string(CURRENT_WALLPAPER_KEY, wallpaper);

    let workspace = global.workspace_manager.get_workspace_by_index(index);
    let bg = Meta.Background.new(workspace.get_display());
    let bg_actor = Meta.BackgroundActor.new(workspace.get_display(), 0);

    global.stage.remove_all_transitions();
    global.stage.clear_effects();

    _changeIndex();
}

function _changeIndex() {
    let index = global.workspace_manager.get_active_workspace_index();
    _settings.set_int(WORKSPACE_INDEX, index);
}

function _workspaceNumChanged() {
    let workspaceNum = Meta.prefs_get_num_workspaces();
    _settings.set_int(WORKSPACE_COUNT_KEY, workspaceNum);
}

function init(metadata) {
    log("Walkpaper init");
}

let wSwitchedSignalId;
let wAddedSignalId;
let wRemovedSignalId;

function enable() {
    log("Walkpaper enable");
    _changeIndex();
    _workspaceNumChanged();
    wSwitchedSignalId = global.workspace_manager.connect('workspace-switched', _changeWallpaper);
    wAddedSignalId = global.workspace_manager.connect('workspace-added', _workspaceNumChanged);
    wRemovedSignalId = global.workspace_manager.connect('workspace-removed', _workspaceNumChanged);
}

function disable() {
    log("Walkpaper disable");
    global.workspace_manager.disconnect(wSwitchedSignalId);
    global.workspace_manager.disconnect(wAddedSignalId);
    global.workspace_manager.disconnect(wRemovedSignalId);
}
