const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty'
  },
  level: "trace"
});

module.exports = logger;