"use strict";

const EventEmitter = require ('events');
const BrowserWindow = require ('electron').BrowserWindow;
const querystring = require ('querystring');
const helpers = require('./helpers/helpers');
const util = require('util');

class RendererProcess
{
    constructor(config, args)
    {
        this.id = uid(32);
        this._windowEventsListeners = {
            'closed': this._onProcessWindowClosed.bind(this)
        };
        this._processEventsListeners = {
            'did-finish-load': this._onProcessLoaded.bind(this)
        ,   'command-callback': this._onProcessCommandCallback.bind(this)
        ,   'crashed': this._onProcessCrashed.bind(this)
        ,   'will-navigate': this._onProcessWillNavigate.bind(this)
        ,   'did-start-loading': this._onProcessDidStartLoading.bind(this)
        };

        this.on('ready', this._onProcessReady);

        app.once ('before-quit', this._onAppBeforeQuit.bind(this));

        this._queue = [];
        this._commandPromises = {};
        this.__commandUid = 0;
        this.config = config;
        this.initialArguments = args;
        this.open();
    }

    open()
    {
        if (!appReady && !this._openWait)
        {
            this._openWait = true;
            let args;
            let self = this;
            app.once('ready', function ()
            {
                self._openWait = false;
                self.open.apply(self, args);
            });
            return;
        }
        if (this.opened) return;

        this.ready = false;
        this.window = new BrowserWindow(this.config);
        this.process = this.window.webContents;

        this.window.loadURL(this.config.params ? this.config.url + "#/?"+querystring.stringify(this.config.params):this.config.url);

        if (this.config.devTools) this.process.openDevTools({detach: true});

        helpers.addListenersTo(this.process, this._processEventsListeners);
        helpers.addListenersTo(this.window, this._windowEventsListeners);
    }

    remote()
    {
        if (!this._proxy)
        {
            this._commandProxyHandler = {
                get: function (target, command, proxy)
                {
                    target.path = target.path+'.'+command;
                    return proxy;
                }
                ,   apply: function (target, thisArg, args)
                {
                    target.self._executeCommand(target.path, false, args);
                }
            };

            let proxyGetHandler = function (target, command)
            {
                if (command in target) return target[command];
                let fn = function (){};
                fn.path = command;
                fn.self = this;
                return new Proxy (fn, this._commandProxyHandler);
            };

            this._proxy = new Proxy (
                {
                    emit: this.emit.bind(this)
                ,   on: this.on.bind(this)
                ,   once: this.once.bind(this)
                ,   off: this.removeListener.bind(this)
                ,   addListener: this.addListener.bind(this)
                ,   removeListener: this.removeListener.bind(this)
                ,   removeAllListeners: this.removeAllListeners.bind(this)
                ,   getMaxListeners: this.getMaxListeners.bind(this)
                ,   setMaxListeners: this.setMaxListeners.bind(this)
                ,   listenerCount: this.listenerCount.bind(this)
                ,   listeners: this.listeners.bind(this)
                }
                ,   {
                    get: proxyGetHandler.bind(this)
                }
            );
        }
        return this._proxy;
    }

    _onAppBeforeQuit()
    {
        this.open = helpers.noop;
        this.config.persistent = false;
    }

    _onProcessWindowClosed()
    {
        helpers.removeListenersFrom(this.process, this._processEventsListeners);
        helpers.removeListenersFrom(this.window, this._windowEventsListeners);
        this.window = null;
        this.process = null;
        this.opened = false;

        if (this.config.persistent) this.open();
        else this.emit('closed', this);
    }

    _onProcessLoaded()
    {
        console.log ('window process "' + this.config.name +'" - loaded');
        if (this.initialArguments) this.process.send.apply(this.process, ['initialize'].concat(this.initialArguments, this.id));
        else this.process.send.call(this.process, 'initialize', this.id);
    }

    _onProcessReady()
    {
        this.ready = true;
        this._executeQueue();
        console.log ('window process "' + this.config.name +'" - ready');
    }

    _onProcessDidStartLoading()
    {
        this.ready = false;
        console.log ('window process "' + this.config.name +'" - did start loading');
    }

    _onProcessWillNavigate()
    {
        this.ready = false;
        console.log ('window process "' + this.config.name +'" - will navigate');
    }

    _onProcessCrashed()
    {
        this.ready = false;
        console.log ('window process "' + this.config.name +'" - crashed');
        this.window.destroy();
    }

    _onProcessCommandCallback (cid, error, success)
    {
        if (!this._commandPromises.hasOwnProperty(cid)) return;
        if (err)
        {
            this._commandPromises[cid].reject(error);
        }
        else
        {
            this._commandPromises[cid].resolve(success);
        }
        delete this._commandPromises[cid];
    }

    _executeCommand (command, withCallback, args)
    {
        var cid;
        var r;
        if (withCallback)
        {
            cid = this._commandUid();
            this._commandPromises[cid] = helpers.defer();
            r = this._commandPromises[cid].promise;
        }

        if (!this.ready) this._addToQueue(command, cid, Array.prototype.slice.call(args));
        else this.process.send('command', command, cid, Array.prototype.slice.call(args));

        return r;
    }

    _executeQueue ()
    {
        for (var i = 0, l = this._queue.length; i<l; i++)
        {
            this.process.send('command', this._queue[i].command, this._queue[i].cid, this._queue[i].args);
        }
        this._queue = [];
    }

    _addToQueue (command, cid, args)
    {
        this._queue.push({command: command, cid: cid, args: args});
    }

    _commandUid()
    {
        return this.__commandUid > 9999999 ? (this.__commandUid = 0):this.__commandUid++;
    }
}

util.inherits(RendererProcess, EventEmitter);
