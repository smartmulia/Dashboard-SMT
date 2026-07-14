const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Folder logs dibuat otomatis (diabaikan git). File dirotasi berdasarkan ukuran.
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Hanya error → error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),
    // Semua log (termasuk akses HTTP) → combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),
  ],
});

// Di non-production tampilkan juga ke console agar mudah saat development
if (!isProduction) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }));
}

// Stream untuk morgan (access log HTTP) → diarahkan ke level info
logger.stream = { write: (message) => logger.info(message.trim()) };

module.exports = logger;
