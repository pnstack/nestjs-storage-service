import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageObject } from '../entities/object.entity';
import { CreateObjectDto } from '../dto/create-object.dto';
import { NamespaceService } from './namespace.service';
import { AuditEventService } from './audit-event.service';
import { AuditAction } from '../entities/audit-event.entity';
import { LoggerService } from '@/common/logger/logger.service';
import { StorageService } from '../storage.service';

@Injectable()
export class ObjectStorageService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly objectRepository: Repository<StorageObject>,
    private readonly namespaceService: NamespaceService,
    private readonly auditService: AuditEventService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ObjectStorageService');
  }

  async createObject(
    createDto: CreateObjectDto,
    requestId: string,
  ): Promise<{ object: StorageObject; uploadUrl: string }> {
    this.logger.log(`Creating object: ${createDto.name} in namespace ${createDto.namespace}`);

    // Verify namespace exists and check quota
    await this.namespaceService.findByName(createDto.namespace);
    await this.namespaceService.checkQuota(createDto.namespace, createDto.sizeBytes);

    // Generate S3 key
    const s3Key = `${createDto.namespace}/${Date.now()}-${createDto.name}`;

    // Create object record
    const object = this.objectRepository.create({
      namespace: createDto.namespace,
      name: createDto.name,
      s3Key,
      contentType: createDto.contentType,
      sizeBytes: createDto.sizeBytes,
      checksum: createDto.checksum || null,
      customMetadata: createDto.customMetadata || null,
    });

    const saved = await this.objectRepository.save(object);

    // Update namespace usage
    await this.namespaceService.incrementUsage(createDto.namespace, createDto.sizeBytes);

    // Generate pre-signed upload URL
    const command = new PutObjectCommand({
      Bucket: this.configService.get('storage.bucket'),
      Key: s3Key,
      ContentType: createDto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.storageService.s3, command, {
      expiresIn: 900, // 15 minutes
    });

    // Log audit event
    await this.auditService.logEvent({
      requestId,
      action: AuditAction.CREATE,
      entityType: 'Object',
      entityId: saved.id,
      namespace: saved.namespace,
      metadata: { s3Key, sizeBytes: saved.sizeBytes },
    });

    this.logger.log(`Object created: ${saved.id}`);

    return { object: saved, uploadUrl };
  }

  async getObject(id: string): Promise<StorageObject> {
    this.logger.debug(`Getting object: ${id}`);

    const object = await this.objectRepository.findOne({
      where: { id },
    });

    if (!object) {
      throw new NotFoundException(`Object '${id}' not found`);
    }

    return object;
  }

  async generateSignedUrl(
    id: string,
    expiresIn: number,
    requestId: string,
  ): Promise<string> {
    this.logger.debug(`Generating signed URL for object: ${id}`);

    const object = await this.getObject(id);

    const command = new GetObjectCommand({
      Bucket: this.configService.get('storage.bucket'),
      Key: object.s3Key,
    });

    const url = await getSignedUrl(this.storageService.s3, command, {
      expiresIn,
    });

    // Log audit event
    await this.auditService.logEvent({
      requestId,
      action: AuditAction.READ,
      entityType: 'Object',
      entityId: object.id,
      namespace: object.namespace,
      metadata: { expiresIn },
    });

    return url;
  }

  async listByNamespace(
    namespace: string,
    prefix?: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ items: StorageObject[]; total: number }> {
    this.logger.debug(`Listing objects in namespace: ${namespace}`);

    // Verify namespace exists
    await this.namespaceService.findByName(namespace);

    const query = this.objectRepository
      .createQueryBuilder('object')
      .where('object.namespace = :namespace', { namespace })
      .andWhere('object.deletedAt IS NULL');

    if (prefix) {
      query.andWhere('object.name LIKE :prefix', { prefix: `${prefix}%` });
    }

    const [items, total] = await query
      .orderBy('object.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async deleteObject(id: string, requestId: string): Promise<void> {
    this.logger.log(`Deleting object: ${id}`);

    const object = await this.getObject(id);

    // Soft delete
    await this.objectRepository.softDelete(id);

    // Update namespace usage
    await this.namespaceService.decrementUsage(object.namespace, object.sizeBytes);

    // Log audit event
    await this.auditService.logEvent({
      requestId,
      action: AuditAction.DELETE,
      entityType: 'Object',
      entityId: object.id,
      namespace: object.namespace,
    });

    this.logger.log(`Object deleted: ${id}`);
  }
}
