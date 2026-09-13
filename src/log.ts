import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { config } from './config';

// Never reset - safe only because every deployment path (cron, docker
// compose run --rm) starts a fresh process per run, and index.ts always
// calls process.exit() right after run() finishes. Would need an explicit
// reset if bastubot ever became a long-running process instead.
let fullRunLog = '';

const logDir = config.paths.logDir;

fs.mkdirSync(logDir, { recursive: true });

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm' }),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`,
    ),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%.log'),
      datePattern: 'YYYY-MM-DD-HH-mm',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
});

const log = (message: string) => {
  fullRunLog += message + '\n';
  logger.info(message);
};

const getFullRunLog = () => fullRunLog;

export default log;
export { getFullRunLog };
