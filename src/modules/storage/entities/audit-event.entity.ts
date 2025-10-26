import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  DELETE = 'DELETE',
  UPDATE = 'UPDATE',
}

@Entity('audit_events')
@Index(['namespace', 'createdAt'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  requestId: string;

  @Column({ type: 'enum', enum: AuditAction })
  @Index()
  action: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ type: 'varchar', length: 255 })
  namespace: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actor: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
