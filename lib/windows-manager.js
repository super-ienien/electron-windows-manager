"use strict";

const BrowserWindow = require ('browser-window');
const querystring = require ('querystring');
const ipc = require('electron').ipcMain;
const helpers = require('./helpers');

class WindowsManager
{
    constructor ()
    {
        var self = this;
        this.configs = {};
        this.windows = {};
        this.windowsById = {};
        this._namesIndex = {};
        ipc.on ('/__rd2wm__/', this._onRendererMessage.bind(this));

        this._windowListeners = {
            'closed': function () {self._onWindowClosed(this)}
        };

        this._windowWebContentsListeners = {
            'did-finish-load': function () {self._onWebContentsFinishLoad(this)}
        };
    }

    registerWindowConfiguration (name, config)
    {
        if (this.configs.hasOwnProperty(name)) return;
        this.configs[name] = config;
        this.windows[name] = [];
    }

    open (name, params)
    {
        if (!this.configs.hasOwnProperty(name)) return;

        var config = this.configs[name];

        if (config.singleton && this.windows[name].length > 0)
        {
            this.windows[name][0].show();
            return this.windows[name][0];
        }

        var window = new BrowserWindow(this.configs[name]);
        this.windows[name].push(window);
        this.windowsById[window.id] = window;
        this._namesIndex[window.id] = name;

        helpers.addListenersTo(window, this._windowListeners);
        helpers.addListenersTo(window.webContents, this._windowWebContentsListeners);

        if (config.dev) window.webContents.openDevTools();

        window.loadURL(params ? 'file://' + this.windowsDirectory + config.url + "#/?"+querystring.stringify(params):'file://' + this.windowsDirectory + config.url);

        return window;
    }

    isOpen (name)
    {
        return this.windows.hasOwnProperty(name) && this.windows[name].length > 0;
    }

    window (name, idx)
    {
        if (!this.windows.hasOwnProperty(name)) return false;
        return this.windows[name][idx || 0];
    }

    send (name, event, data)
    {
        if (!this.windows.hasOwnProperty(name)) return;
        for (var i = 0, l = this.windows[name].length; i < l; i++)
        {
            this.windows[name][i].webContents.send(event, data);
        }
    }

    broadcast (event, data)
    {
        for (var i in this.windows)
        {
            for (var j = 0, l = this.windows[i].length; j < l; j++)
            {
                this.windows[i][j].webContents.send(event, data);
            }
        }
    }

    windowName (window)
    {
        return this._namesIndex[window.id];
    }

    _onWindowClosed (window)
    {
        try
        {
            var idx = this.windows[this.windowName(window)].indexOf(window);
            if (idx > -1) this.windows[name].splice(idx, 1);
            delete this.windowsById[window.id];
            delete this._namesIndex[window.id];
        }
        catch (e)
        {
            console.error (e);
        }
    }

    _onWebContentsFinishLoad (webContents)
    {
        webContents.executeJavaScript("__wid__ = " + BrowserWindow.fromWebContents (webContents).id)
    }

    _onRendererMessage (sender, wid)
    {
        if (!this.windowsById.hasOwnProperty(wid)) return;
        this.windowsById[wid].webContents.emit(Array.prototype.slice.call(arguments, 2))
    }
}

module.exports = new WindowsManager();