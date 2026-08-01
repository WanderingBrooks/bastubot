import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import os from 'os';
import fs from 'fs';

let fullRunLog = '';
let logger: winston.Logger | null = null;

const log = (message: string) => {
  if (!logger) {
    throw new Error('Logger not initialized. Call setupLogger first.');
  }

  fullRunLog += message + '\n';
  logger.info(message);
};

const setupLogger = (week: string) => {
  const weekLogDir = path.join(os.homedir(), 'logs', 'bastubot', week);

  fs.mkdirSync(weekLogDir, { recursive: true });

  logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm' }),
      winston.format.printf(
        ({ timestamp, level, message }) =>
          `${timestamp} [${level}] [${week}]: ${message}`,
      ),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
      new DailyRotateFile({
        filename: path.join(weekLogDir, '%DATE%.log'),
        datePattern: 'YYYY-MM-DD-HH-mm',
        maxFiles: '7d',
        zippedArchive: true,
      }),
    ],
  });
};

export default log;
export { fullRunLog, setupLogger };
