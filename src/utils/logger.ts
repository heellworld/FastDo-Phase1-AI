import fs from 'fs';
import path from 'path';

// Error severity levels
export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Log entry structure
export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  type?: string;
  category: string;
  details?: any;
  context?: {
    sessionId?: string;
    requestId?: string;
    userAgent?: string;
    ipAddress?: string;
    path?: string;
  };
  stackTrace?: string;
}

// Logger configuration
export interface LoggerConfig {
  enabled: boolean;
  logDirectory: string;
  filePrefix: string;
  maxFileSizeBytes: number;
  maxFiles: number;
  consoleOutput: boolean;
  minLevel: LogLevel;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  logDirectory: path.join(process.cwd(), 'src', 'logs'),
  filePrefix: 'app-error',
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  maxFiles: 10,
  consoleOutput: true,
  minLevel: LogLevel.WARNING
};

class Logger {
  private config: LoggerConfig;
  private currentLogFile: string;

  constructor(customConfig?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    this.ensureLogDirectory();
    this.currentLogFile = this.getLogFilePath();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    return path.join(
      this.config.logDirectory, 
      `${this.config.filePrefix}-${dateStr}.log`
    );
  }

  private shouldRotateFile(): boolean {
    try {
      const stats = fs.statSync(this.currentLogFile);
      return stats.size > this.config.maxFileSizeBytes;
    } catch (error) {
      return false;
    }
  }

  private rotateLogsIfNeeded(): void {
    if (this.shouldRotateFile()) {
      const now = new Date();
      const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const newFile = path.join(
        this.config.logDirectory,
        `${this.config.filePrefix}-${timestamp}.log`
      );
      
      try {
        fs.renameSync(this.currentLogFile, newFile);
        this.currentLogFile = this.getLogFilePath();
        
        // Cleanup old logs if exceeding max files
        this.cleanupOldLogs();
      } catch (error) {
        console.error('Error rotating log files:', error);
      }
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDirectory)
        .filter(file => file.startsWith(this.config.filePrefix))
        .map(file => path.join(this.config.logDirectory, file));
      
      if (files.length > this.config.maxFiles) {
        // Sort by creation time (oldest first)
        const sortedFiles = files.sort((a, b) => {
          return fs.statSync(a).birthtime.getTime() - fs.statSync(b).birthtime.getTime();
        });
        
        // Delete oldest files
        const filesToDelete = sortedFiles.slice(0, files.length - this.config.maxFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file);
        });
      }
    } catch (error) {
      console.error('Error cleaning up old log files:', error);
    }
  }

  public log(entry: LogEntry): void {
    if (!this.config.enabled || this.getLevelValue(entry.level) < this.getLevelValue(this.config.minLevel)) {
      return;
    }

    try {
      this.rotateLogsIfNeeded();
      
      // Format log entry
      const formattedLog = JSON.stringify(entry, null, 2);
      
      // Write to file
      fs.appendFileSync(this.currentLogFile, formattedLog + '\n\n');
      
      // Output to console if enabled
      if (this.config.consoleOutput) {
        const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.category}]`;
        const message = entry.type ? `${entry.type}: ${entry.message}` : entry.message;
        
        switch (entry.level) {
          case LogLevel.ERROR:
          case LogLevel.CRITICAL:
            console.error(`${prefix} ${message}`);
            if (entry.details) console.error('Details:', entry.details);
            if (entry.stackTrace) console.error('Stack:', entry.stackTrace);
            break;
          case LogLevel.WARNING:
            console.warn(`${prefix} ${message}`);
            if (entry.details) console.warn('Details:', entry.details);
            break;
          default:
            console.log(`${prefix} ${message}`);
            if (entry.details) console.log('Details:', entry.details);
        }
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  public info(message: string, category: string, options?: Partial<Omit<LogEntry, 'level' | 'timestamp' | 'message' | 'category'>>): void {
    this.log({
      level: LogLevel.INFO,
      timestamp: new Date().toISOString(),
      message,
      category,
      ...options
    });
  }

  public warning(message: string, category: string, options?: Partial<Omit<LogEntry, 'level' | 'timestamp' | 'message' | 'category'>>): void {
    this.log({
      level: LogLevel.WARNING,
      timestamp: new Date().toISOString(),
      message,
      category,
      ...options
    });
  }

  public error(message: string, category: string, options?: Partial<Omit<LogEntry, 'level' | 'timestamp' | 'message' | 'category'>>): void {
    this.log({
      level: LogLevel.ERROR,
      timestamp: new Date().toISOString(),
      message,
      category,
      ...options
    });
  }

  public critical(message: string, category: string, options?: Partial<Omit<LogEntry, 'level' | 'timestamp' | 'message' | 'category'>>): void {
    this.log({
      level: LogLevel.CRITICAL,
      timestamp: new Date().toISOString(),
      message,
      category,
      ...options
    });
  }

  private getLevelValue(level: LogLevel): number {
    switch (level) {
      case LogLevel.INFO: return 0;
      case LogLevel.WARNING: return 1;
      case LogLevel.ERROR: return 2;
      case LogLevel.CRITICAL: return 3;
      default: return 0;
    }
  }

  // Helper to get stack trace
  public static getStackTrace(error: Error): string {
    return error.stack || '';
  }
}

// Create and export singleton instance
const logger = new Logger();
export default logger; 