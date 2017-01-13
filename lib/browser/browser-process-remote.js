const windowsManager = require('./index');

exports.send = function (windowId)
{
    let window = windowsManager.window(windowId);
    if (window)
    {
        window.emit.apply(window, Array.prototype.slice.call(arguments, 1));
    }
};