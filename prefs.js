const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e };

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const WORKSPACE_COUNT_KEY = 'workspace-count';
const WALLPAPER_KEY = 'workspace-wallpapers';

const WalkpaperModel = new GObject.Class({
    Name: 'Walkpaper.WalkpaperModel',
    GTypeName: 'WalkpaperModel',
    Extends: Gtk.ListStore,

    Columns: {
        PATH: 0,
    },

    _init: function(params) {
        this.parent(params);
        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        this._settings = Convenience.getSettings();

        this._reloadFromSettings();

        // overriding class closure doesn't work, because GtkTreeModel
        // plays tricks with marshallers and class closures
        this.connect('row-changed', Lang.bind(this, this._onRowChanged));
    },

    _reloadFromSettings: function() {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let workspaceNum = this._settings.get_int(WORKSPACE_COUNT_KEY);
        let newPaths = this._settings.get_strv(WALLPAPER_KEY);

        for (let i = newPaths.length; i < workspaceNum; i++)
            newPaths[i] = '';

        let i = 0;
        let [ok, iter] = this.get_iter_first();
        while (ok && i < workspaceNum) {
            this.set(iter, [this.Columns.PATH], [newPaths[i]]);
            ok = this.iter_next(iter);
            i++;
        }

         while (ok)
            ok = this.remove(iter);
        //Adding new rows
        for ( ; i < workspaceNum; i++) {
            iter = this.append();
            this.set(iter, [this.Columns.PATH], [newPaths[i]]);
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
//TODO add new label Paths
        this.add(new Gtk.Label({ label: '<b>' + _("Workspace Names") + '</b>',
                                 use_markup: true, margin_bottom: 6,
                                 hexpand: true, halign: Gtk.Align.START }));

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

        let columnPaths = new Gtk.TreeViewColumn({ title: _("Path") });
        let rendererPaths = new Gtk.CellRendererText({ editable: true });
        rendererPaths.connect('edited', Lang.bind(this, this._pathEdited));
        columnPaths.pack_start(rendererPaths, true);
        columnPaths.add_attribute(rendererPaths, 'text', this._store.Columns.PATH);
        this._treeView.append_column(columnPaths);

        scrolled.add(this._treeView);
    },
    _pathEdited: function(renderer, path, new_text) {
        let [ok, iter] = this._store.get_iter_from_string(path);

        if (ok)
            this._store.set(iter, [this._store.Columns.PATH], [new_text]);
    },
});

function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    let widget = new WalkpaperSettingsWidget();
    widget.show_all();
    return widget;
}
