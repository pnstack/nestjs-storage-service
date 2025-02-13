import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;

  constructor(private configService: ConfigService) {}

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.printMessage('LOG', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.printMessage('ERROR', message, context);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string) {
    this.printMessage('WARN', message, context);
  }

  debug(message: string, context?: string) {
    this.printMessage('DEBUG', message, context);
  }

  verbose(message: string, context?: string) {
    this.printMessage('VERBOSE', message, context);
  }

  private printMessage(level: string, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const finalContext = context || this.context;
    
    console.log(
      `[${timestamp}] [${level}] ${finalContext ? `[${finalContext}] ` : ''}${message}`,
    );
  }
}