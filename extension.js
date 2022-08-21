const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;

const WORKSPACE_COUNT_KEY = 'workspace-count';
const WORKSPACE_INDEX = 'workspace-index';
const WALLPAPERS_KEY = 'workspace-wallpapers';
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
let   CURRENT_WALLPAPER_KEY = 'picture-uri';
const INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
const COLOR_SCHEME_KEY = 'color-scheme'

let   _settings;
let _changeWallpaperTimeout = null;

function debugLog(s) {
    //log(s);
}


function _changeWallpaper() {
	_changeWallpaperTimeout = GLib.timeout_add(GLib.PRIORITY_HIGH, 500, 
		function() {
			_changeWallpaper_delay();
	        	_changeWallpaperTimeout = null;
		        return GLib.SOURCE_REMOVE;
		}
	)
	//Mainloop.timeout_add(500, _changeWallpaper_delay );
}


function _changeWallpaper_delay() {
    debugLog("changeWallpaper");
    
    let colorSettings = new Gio.Settings({ schema_id: INTERFACE_SCHEMA });
    let scheme = colorSettings.get_string(COLOR_SCHEME_KEY);
    if ( scheme == 'prefer-dark' ) {
        CURRENT_WALLPAPER_KEY = 'picture-uri-dark';
    }


    let backgroundSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });
    let paths = _settings.get_strv(WALLPAPERS_KEY);
    let index = _settings.get_int(WORKSPACE_INDEX);

    debugLog("SCHEME: " + scheme)
    debugLog("CURRENT_WALLPAPER_KEY: " + CURRENT_WALLPAPER_KEY)
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

    //Initialize globals
    _settings = ExtensionUtils.getSettings();

    //Initialize settings values
    _changeIndex();
    _workspaceNumChanged();

    //Connect signals
    wSwitchedSignalId = global.workspace_manager.connect('workspace-switched', _changeWallpaper);
    wAddedSignalId = global.workspace_manager.connect('workspace-added', _workspaceNumChanged);
    wRemovedSignalId = global.workspace_manager.connect('workspace-removed', _workspaceNumChanged);
}

function disable() {
    log("Walkpaper disable");
    
    if (_changeWallpaperTimeout) {
        GLib.Source.remove(_changeWallpaperTimeout);
        _changeWallpaperTimeout = null;
    }

    //Dispose of globals
    _settings?.run_dispose();
    _settings = null;

    //Disconnect signals
    global.workspace_manager.disconnect(wSwitchedSignalId);
    global.workspace_manager.disconnect(wAddedSignalId);
    global.workspace_manager.disconnect(wRemovedSignalId);
}
