import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent, AuditAction } from '../entities/audit-event.entity';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class AuditEventService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuditEventService');
  }

  async logEvent(params: {
    requestId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    namespace: string;
    actor?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const event = this.auditRepository.create({
        requestId: params.requestId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        namespace: params.namespace,
        actor: params.actor || null,
        metadata: params.metadata || null,
      });

      await this.auditRepository.save(event);
      
      this.logger.debug(
        `Audit event logged: ${params.action} ${params.entityType} ${params.entityId} in ${params.namespace}`,
      );
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.error('Failed to log audit event', error.stack);
    }
  }
}
