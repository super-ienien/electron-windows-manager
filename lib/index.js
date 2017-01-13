if (process.type === 'renderer') module.exports = require('./renderer');
else module.exports = require('./browser');
