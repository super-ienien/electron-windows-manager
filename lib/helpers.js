exports.addListenersTo = function (target, listeners)
{
    for (var i in listeners)
    {
        target.on(i,listeners[i]);
    }
    return target;
};

exports.removeListenersFrom = function (target, listeners)
{
    for (var i in listeners)
    {
        target.removeListener(i,listeners[i]);
    }
    return target;
};