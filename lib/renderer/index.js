"use strict";
const ipc = require('electron').ipcRenderer;
const objectPath = require('object-path');

module.exports = exports = {
    main:
    {
        id: null
    ,   ready: main.send.bind(main, 'ready')
    ,   send: queue
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
    }
,   exports: mainExports
};

ipc.once('initialize', function ()
{
    exports.main.id = arguments[arguments.length-1];
    exports.main.send = ipc.emit.bind(ipc, '__command__', exports.main.id);
    for (let i = 0, l = _queue.length; i<l; i++)
    {
        exports.main.send(..._queue[i]);
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
    exports.main.on ('__command__', function (sender, command, callback, args)
    {
        if (typeof command === 'string') command = command.split('.');
        try
        {
            objectPath.get(exported, command).apply(command.length > 1 ? objectPath.get(exported, command.slice(0,-1)):exported, Array.prototype.slice.call(args));
        }
        catch (err)
        {
            console.error ('Command execution error : ' + command);
            console.error (err.stack);
        }
    });
    return exports.main;
}