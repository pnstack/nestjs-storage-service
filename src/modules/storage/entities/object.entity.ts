import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('objects')
@Index(['namespace', 'deletedAt'])
export class StorageObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  namespace: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'varchar', length: 1000, unique: true })
  s3Key: string;

  @Column({ type: 'varchar', length: 255 })
  contentType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @Column({ type: 'jsonb', nullable: true })
  customMetadata: Record<string, string> | null;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
