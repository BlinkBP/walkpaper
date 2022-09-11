const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;

const Gettext = imports.gettext.domain('walkpaper2@walkpaper.massimiliano-dalcero.github.com');
const _ = Gettext.gettext;
const N_ = function(e) { return e };

const ExtensionUtils = imports.misc.extensionUtils;

const WORKSPACE_COUNT_KEY = 'workspace-count';
const WORKSPACE_INDEX = 'workspace-index';
const WALLPAPERS_KEY = 'workspace-wallpapers';
let   CURRENT_WALLPAPER_KEY = 'picture-uri';
const INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
const COLOR_SCHEME_KEY = 'color-scheme'



const WalkpaperModel = new GObject.Class({
    Name: 'Walkpaper2.WalkpaperModel',
    GTypeName: 'WalkpaperModel',
    Extends: Gtk.ListStore,

    Columns: {
        NUMBER: 0,
        PATH: 1,
    },

    Thumbnails: [],

    _init: function(params) {
        this.parent(params);
        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        this._settings = ExtensionUtils.getSettings();

        let workspaceNum = this._settings.get_int(WORKSPACE_COUNT_KEY);
        for (let i = 0; i < workspaceNum; i++) {
          this.Thumbnails.push(null);
        }

        this._reloadFromSettings();

        this.connect('row-changed', this._onRowChanged.bind(this));
    },

    _reloadFromSettings: function() {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let workspaceNum = this._settings.get_int(WORKSPACE_COUNT_KEY);
        let newPaths = this._settings.get_strv(WALLPAPERS_KEY);

        for (let i = newPaths.length; i < workspaceNum; i++) {
            newPaths[i] = '';
        }

        let i = 0;
        let [ok, iter] = this.get_iter_first();
        while (ok && i < workspaceNum) {
            this.set(iter, [this.Columns.PATH], [newPaths[i]]);
            this.set(iter, [this.Columns.NUMBER], [parseInt(i+1)]);
            ok = this.iter_next(iter);
            i++;
        }

         while (ok)
            ok = this.remove(iter);
        //Adding new rows
        for ( ; i < workspaceNum; i++) {
            iter = this.append();
            this.set(iter, [this.Columns.PATH], [newPaths[i]]);
            this.set(iter, [this.Columns.NUMBER], [parseInt(i+1)]);
        }

        this._preventChanges = false;
    },

    _onRowChanged: function(self, path, iter) {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let index = path.get_indices()[0];
        //let index = this._settings.get_int(WORKSPACE_COUNT_KEY);
        let paths = this._settings.get_strv(WALLPAPERS_KEY);

        if (index >= paths.length) {
            // fill with blanks
            for (let i = paths.length; i <= index; i++)
                paths[i] = '';
        }

        paths[index] = this.get_value(iter, this.Columns.PATH);

        this._settings.set_strv(WALLPAPERS_KEY, paths);

        this._preventChanges = false;
    },
});

const WalkpaperSettingsWidget = new GObject.Class({
    Name: 'Walkpaper2.WalkpaperSettingsWidget',
    GTypeName: 'WalkpaperSettingsWidget',
    Extends: Gtk.Box,
    Signals: {
        'change-wallpaper': { param_types: [ GObject.TYPE_STRING] },
    },

    _init: function(params) {
        this.parent(params);
        this.margin = 12;
        this.orientation = Gtk.Orientation.VERTICAL;
        this.connect('change-wallpaper', this.changeWallpaper)

        let scrolled = new Gtk.ScrolledWindow();
        //hscroll, vscroll policy
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this.append(scrolled);

        let _store = new WalkpaperModel();

        let _treeView = new Gtk.TreeView({ model: _store,
                                           headers_visible: true,
                                           reorderable: true,
                                           hexpand: true,
                                           vexpand: true });

        //Workspace number
        let columnNumbers = new Gtk.TreeViewColumn({ title: _("Workspace") });
        let rendererNumbers = new Gtk.CellRendererText({ editable: false });
        columnNumbers.pack_start(rendererNumbers, true);
        columnNumbers.add_attribute(rendererNumbers, 'text', _store.Columns.NUMBER);
        _treeView.append_column(columnNumbers);

        //Preview picture
        let columnImages = new Gtk.TreeViewColumn({title: "Preview" });
        let rendererImages = new Gtk.CellRendererPixbuf();
        rendererImages.set_fixed_size(240, 120);
        columnImages.pack_start(rendererImages, true);
        columnImages.set_cell_data_func(rendererImages, this.getCellPreviewPixbuf)
        _treeView.append_column(columnImages);

        //Workspace wallpapers paths
        let columnPaths = new Gtk.TreeViewColumn({ title: _("Path to wallpaper") });
        let rendererPaths = new Gtk.CellRendererText({ editable: false });
        columnPaths.pack_start(rendererPaths, true);
        columnPaths.add_attribute(rendererPaths, 'text', _store.Columns.PATH);
        _treeView.append_column(columnPaths);

        _treeView.connect('row-activated', this._editPath.bind(this));

        scrolled.set_child(_treeView);
    },

    _editPath: function(renderer, path, data) {
        let chooser = new Gtk.FileChooserDialog({
            action: Gtk.FileChooserAction.OPEN,
            select_multiple: false,
            transient_for: renderer.get_ancestor(Gtk.Window),
            title: 'Select Wallpaper'});

        let filter = new Gtk.FileFilter();
        filter.set_name("Wallpapers");
        filter.add_pattern("*.png");
        filter.add_pattern("*.jpg");
        filter.add_pattern("*.jpeg");
        filter.add_pattern("*.tga");
        chooser.add_filter(filter);

        chooser.add_button('Cancel', Gtk.ResponseType.CANCEL);
        chooser.add_button('OK', Gtk.ResponseType.OK);

        chooser.connect('response', this._onEditPath.bind(chooser, path, renderer));

        chooser.show();
    },

    _onEditPath: function(path, parent, source, result) {
        if (result === Gtk.ResponseType.OK) {
            let file = source.get_file();
            let filename = "file://" + file.get_path();
            //We own the file and need to release them after being done
            file.unref();
	    //log(filename)

            let _store = new WalkpaperModel();
            let [ok, iter] = _store.get_iter(path);
            if (ok) {
                _store.set(iter, [_store.Columns.PATH], [filename]);
                //Check if we changed current wallpaper
                let _settings = ExtensionUtils.getSettings();
                let index = _settings.get_int(WORKSPACE_INDEX);
                if (_store.get_string_from_iter(iter) == '' + index) {
                    //We need to change the wallpaper immediately because workspace change
                    //triggers wallpaper save
                    parent.get_ancestor(WalkpaperSettingsWidget).emit('change-wallpaper', filename);
                }
                //Invalidate thumbnail so it is recreated
                let thumb_index = parseInt(_store.get_string_from_iter(iter)) + 1;
                _store.Thumbnails[thumb_index] = GdkPixbuf.Pixbuf.new_from_file_at_scale(filename.replace(/file:\/\//, ""), 240, 160, true);
            }
        }

        source.destroy();
    },

    changeWallpaper: function(source, wallpaper) {
        let colorSettings = new Gio.Settings({ schema_id: INTERFACE_SCHEMA });
        let scheme = colorSettings.get_string(COLOR_SCHEME_KEY);
	//log("SCHEME:")
	//log(scheme);
        if ( scheme == 'prefer-dark' ) {
           CURRENT_WALLPAPER_KEY = 'picture-uri-dark';
        }
        const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
        let backgroundSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });
        backgroundSettings.set_string(CURRENT_WALLPAPER_KEY, wallpaper);
    },

    getCellPreviewPixbuf: function(col, cell, model, iter, user_data) {
        let index = model.get_value(iter, [model.Columns.NUMBER]);

        if (model.Thumbnails[index] == null) {
            let path = model.get_value(iter, [model.Columns.PATH]).replace(/file:\/\//, "");
            if (path !== "") {
                model.Thumbnails[index] = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 240, 160, true);
            }
        }

        if (model.Thumbnails[index] != null) {
            cell.set_property('pixbuf', model.Thumbnails[index]);
        }
    }
});

function init() {
    ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
    let widget = new WalkpaperSettingsWidget();
    widget.show();
    return widget;
}
