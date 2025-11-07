import pino from 'pino';
import { env } from '../config/env.js';

// Create pino logger instance
export const logger = pino({
  level: env.isDev ? 'debug' : 'info',
  transport: env.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
        },
      }
    : undefined,
  base: {
    service: 'thecookflow-api',
    environment: env.NODE_ENV,
    version: env.API_VERSION,
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      parameters: req.params,
      query: req.query,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders(),
    }),
    error: (err) => ({
      type: err.type || err.constructor.name,
      message: err.message,
      stack: env.isDev ? err.stack : undefined,
      code: err.code,
      statusCode: err.statusCode,
    }),
  },
});

// Create child loggers for specific modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};