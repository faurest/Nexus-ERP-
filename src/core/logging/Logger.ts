export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
  AUDIT,
  SYNC
}

export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message} ${context ? JSON.stringify(context) : ''}`;
  }

  public debug(message: string, context?: any) {
    if (import.meta.env.MODE === 'development') {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  public info(message: string, context?: any) {
    console.info(this.formatMessage('INFO', message, context));
  }

  public warn(message: string, context?: any) {
    console.warn(this.formatMessage('WARN', message, context));
  }

  public error(message: string, error?: any, context?: any) {
    console.error(this.formatMessage('ERROR', message, context), error);
  }

  public audit(action: string, userId: string, companyId: string, details?: any) {
    const auditContext = { userId, companyId, action, ...details };
    console.info(this.formatMessage('AUDIT', `User action: ${action}`, auditContext));
  }

  public sync(message: string, context?: any) {
    console.info(this.formatMessage('SYNC', message, context));
  }
}
