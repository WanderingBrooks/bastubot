import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { config } from './config';

let fullRunLog = '';
let logger: winston.Logger | null = null;

const log = (message: string) => {
  if (!logger) {
    throw new Error('Logger not initialized. Call setupLogger first.');
  }

  fullRunLog += message + '\n';
  logger.info(message);
};

const setupLogger = () => {
  const logDir = config.paths.logDir;

  fs.mkdirSync(logDir, { recursive: true });

  logger = winston.createLogger({
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
};

export default log;
export { fullRunLog, setupLogger };
