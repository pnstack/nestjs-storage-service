import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UploadSessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED',
}

@Entity('upload_sessions')
@Index(['namespace', 'status'])
export class UploadSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  uploadId: string;

  @Column({ type: 'varchar', length: 255 })
  namespace: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'varchar', length: 1000 })
  s3Key: string;

  @Column({ type: 'varchar', length: 255 })
  contentType: string;

  @Column({ type: 'bigint' })
  expectedSizeBytes: number;

  @Column({ type: 'bigint', default: 0 })
  uploadedSizeBytes: number;

  @Column({ type: 'jsonb', default: '[]' })
  partsCompleted: Array<{ partNumber: number; ETag: string }>;

  @Column({ type: 'enum', enum: UploadSessionStatus })
  status: UploadSessionStatus;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
