const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e };

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const WORKSPACE_COUNT_KEY = 'workspace-count';
const WORKSPACE_INDEX = 'workspace-index';
const WALLPAPER_KEY = 'workspace-wallpapers';

const WalkpaperModel = new GObject.Class({
    Name: 'Walkpaper.WalkpaperModel',
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

        this._settings = Convenience.getSettings();

        let workspaceNum = this._settings.get_int(WORKSPACE_COUNT_KEY);
        for (let i = 0; i < workspaceNum; i++) {
          this.Thumbnails.push(null);
        }

        this._reloadFromSettings();

        this.connect('row-changed', Lang.bind(this, this._onRowChanged));
    },

    _reloadFromSettings: function() {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let workspaceNum = this._settings.get_int(WORKSPACE_COUNT_KEY);
        let newPaths = this._settings.get_strv(WALLPAPER_KEY);

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
        let paths = this._settings.get_strv(WALLPAPER_KEY);

        if (index >= paths.length) {
            // fill with blanks
            for (let i = paths.length; i <= index; i++)
                paths[i] = '';
        }

        paths[index] = this.get_value(iter, this.Columns.PATH);

        this._settings.set_strv(WALLPAPER_KEY, paths);

        this._preventChanges = false;
    },
});

const WalkpaperSettingsWidget = new GObject.Class({
    Name: 'Walkpaper.WalkpaperSettingsWidget',
    GTypeName: 'WalkpaperSettingsWidget',
    Extends: Gtk.Grid,

    _init: function(params) {
        this.parent(params);
        this.margin = 12;
        this.orientation = Gtk.Orientation.VERTICAL;

        let scrolled = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN });
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.add(scrolled);

        this._store = new WalkpaperModel();

        this._treeView = new Gtk.TreeView({ model: this._store,
                                            headers_visible: false,
                                            reorderable: true,
                                            hexpand: true,
                                            vexpand: true
                                          });

        //Workspace number
        let columnNumbers = new Gtk.TreeViewColumn({ title: _("Workspace") });
        let rendererNumbers = new Gtk.CellRendererText({ editable: false });
        columnNumbers.pack_start(rendererNumbers, true);
        columnNumbers.add_attribute(rendererNumbers, 'text', this._store.Columns.NUMBER);
        this._treeView.append_column(columnNumbers);

        //Preview picture
        let columnImages = new Gtk.TreeViewColumn({title: "Preview" });
        let rendererImages = new Gtk.CellRendererPixbuf();
        rendererImages.set_fixed_size(240, 120);
        columnImages.pack_start(rendererImages, true);
        columnImages.set_cell_data_func(rendererImages, this.getCellPreviewPixbuf)
        this._treeView.append_column(columnImages);

        //Workspace wallpapers paths
        let columnPaths = new Gtk.TreeViewColumn({ title: _("Path to wallpaper") });
        let rendererPaths = new Gtk.CellRendererText({ editable: false });
        columnPaths.pack_start(rendererPaths, true);
        columnPaths.add_attribute(rendererPaths, 'text', this._store.Columns.PATH);
        this._treeView.append_column(columnPaths);

        this._treeView.connect('row-activated', Lang.bind(this, this._editPath));

        scrolled.add(this._treeView);
    },
    _editPath: function(renderer, path, data) {
        let chooser = new Gtk.FileChooserDialog({
            action: Gtk.FileChooserAction.OPEN,
            select_multiple: false,
            transient_for: renderer.get_toplevel(),
            title: 'Select Wallpaper'
        });
        //Without setting a current folder folders won't show their content
        chooser.set_current_folder(GLib.get_home_dir());

        let filter = new Gtk.FileFilter();
        filter.set_name("Wallpapers");
        filter.add_pattern("*.png");
        filter.add_pattern("*.jpg");
        filter.add_pattern("*.jpeg");
        filter.add_pattern("*.tga");
        chooser.add_filter(filter);

        chooser.add_button('Cancel', Gtk.ResponseType.CANCEL);
        chooser.add_button('OK', Gtk.ResponseType.OK);

        let result = chooser.run();
        if (result === Gtk.ResponseType.OK) {
            let filename = "file://" + chooser.get_filename();
            let [ok, iter] = this._store.get_iter(path);
            if (ok) {
                this._store.set(iter, [this._store.Columns.PATH], [filename]);
                //Check if we changed current wallpaper
                let _settings = Convenience.getSettings();
                let index = _settings.get_int(WORKSPACE_INDEX);
                if (this._store.get_string_from_iter(iter) == '' + index) {
                  //We change the wallpaper immediately because workspace change
                  //triggers wallpaper save
                  this.changeWallpaper(filename);
                }
                //Invalidate thumbnail so it is recreated
                let thumb_index = parseInt(this._store.get_string_from_iter(iter)) + 1;
                this._store.Thumbnails[thumb_index] = GdkPixbuf.Pixbuf.new_from_file_at_scale(filename.replace(/file:\/\//, ""), 240, 160, true);
            }
        }
        chooser.destroy()
    },
    changeWallpaper: function(wallpaper) {
      const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';
      const CURRENT_WALLPAPER_KEY = 'picture-uri';
      let backgroundSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });
      backgroundSettings.set_string(CURRENT_WALLPAPER_KEY, wallpaper);
    },
    getCellPreviewPixbuf: function(col, cell, model, iter, user_data) {
      let index = model.get_value(iter, [model.Columns.NUMBER]);

      if (model.Thumbnails[index] == null) {
        let path = model.get_value(iter, [model.Columns.PATH]).replace(/file:\/\//, "");
        model.Thumbnails[index] = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 240, 160, true);
      }

      cell.set_property('pixbuf', model.Thumbnails[index]);
    }
});

function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    let widget = new WalkpaperSettingsWidget();
    widget.show_all();
    return widget;
}
