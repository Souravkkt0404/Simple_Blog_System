/* eslint-disable no-console */
const silent = process.env.NODE_ENV === 'test';

const format = (level, args) => [`[${new Date().toISOString()}] ${level.toUpperCase()}:`, ...args];

module.exports = {
  info: (...args) => !silent && console.log(...format('info', args)),
  warn: (...args) => !silent && console.warn(...format('warn', args)),
  error: (...args) => !silent && console.error(...format('error', args)),
};
