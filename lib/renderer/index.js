"use strict";
const main = require('electron').remote.require('../browser/browser-process-remote');
const ipc = require('electron').ipcRenderer;
const objectPath = require('object-path');

module.exports = exports = {
    send: queue
,   exports: mainExports
,   ready: main.send.bind(main, 'ready')
,   emit: ipc.emit.bind(ipc)
,   on: ipc.on.bind(ipc)
,   once: ipc.once.bind(ipc)
,   off: ipc.removeListener.bind(ipc)
,   addListener: ipc.addListener.bind(ipc)
,   removeListener: ipc.removeListener.bind(ipc)
,   removeAllListeners: ipc.removeAllListeners.bind(ipc)
,   getMaxListeners: ipc.getMaxListeners.bind(ipc)
,   setMaxListeners: ipc.setMaxListeners.bind(ipc)
,   listenerCount: ipc.listenerCount.bind(ipc)
,   listeners: ipc.listeners.bind(ipc)
};

ipc.once('initialize', function ()
{
    global.__ID__ = arguments[arguments.length-1];
    exports.send = main.send.bind(main, __ID__);
    for (let i = 0, l = _queue.length; i<l; i++)
    {
        exports.send.apply(null, _queue[i]);
    }
    _queue = null;
});

let _queue = [];
function queue ()
{
    _queue.push(arguments);
}

let exported = null;
function mainExports (obj)
{
    exported = obj;
    exports.on ('command', function (sender, command, callback, args)
    {
        if (typeof command === 'string') command = command.split('.');
        try
        {
            objectPath.get(exported, command).apply(command.length > 1 ? objectPath.get(exported, command.slice(0,-1)):exported, Array.prototype.slice.call(args));
        }
        catch (err)
        {
            console.error ('Command execution error : ' + command)
            console.error (err.stack);
        }
    });
}