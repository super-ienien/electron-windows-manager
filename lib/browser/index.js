"use strict";
const uid = require('uid');
const {app} = require('electron');

module.exports = exports = new WindowsManager();

class WindowsManager
{
    constructor ()
    {
        this.configs = {};
        this.windows = {};
        this.windowsById = {};
        this.defaultDirectory = '';
    }

    setDefaultDirectory (dir)
    {
        this.defaultDirectory = dir;
    }

    registerWindowConfiguration (name, config)
    {
        if (this.configs.hasOwnProperty(name)) return;
        config.name = name;
        if (config.file)
        {
            if (config.file[0] === '/' || config.file[0] === '\\' )
            {
                config.url = 'file://'+this.defaultDirectory+config.file;
            }
            else config.url = 'file://'+config.file;
        }
        this.configs[name] = config;
        this.windows[name] = [];
    }

    open (name)
    {
        if (!this.configs.hasOwnProperty(name)) return;

        var config = this.configs[name];
        if (config.singleton && this.windows[name].length > 0)
        {
            if (config.show) this.windows[name][0].show();
            return this.windows[name][0];
        }

        var windowProcess = new WindowProcess(config, Array.prototype.slice.call(arguments, 1));
        this.windows[name].push(windowProcess);
        this.windowsById[windowProcess.id] = windowProcess;
        windowProcess.once ('closed', this._onWindowProcessClosed.bind(this));
        return windowProcess;
    }

    isOpen (name)
    {
        return this.windows.hasOwnProperty(name) && this.windows[name].length > 0;
    }

    window (name, idx)
    {
        if (arguments.length === 1)
        {
            return this.windowsById[name] || false;
        }
        else
        {
            if (!this.windows.hasOwnProperty(name)) return false;
            return this.windows[name][idx || 0];
        }
    }

    send (name, event, ...args)
    {
        if (!this.windows.hasOwnProperty(name)) return;
        for (var i = 0, l = this.windows[name].length; i < l; i++)
        {
            this.windows[name][i].process.send(event, ...args);
        }
    }

    broadcast (event, ...args)
    {
        for (var i in this.windows)
        {
            for (var j = 0, l = this.windows[i].length; j < l; j++)
            {
                this.windows[i][j].process.send(event, ...args);
            }
        }
    }

    _onWindowProcessClosed (windowProcess)
    {
        if (this.windows.hasOwnProperty(windowProcess.config.name))
        {
            let idx = this.windows[windowProcess.config.name].indexOf(windowProcess);
            if (idx > -1) this.windows[windowProcess.config.name].splice(idx,1);
        }
        delete this.windowsById[windowProcess.id];
    };

}