import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadSession, UploadSessionStatus } from '../entities/upload-session.entity';
import { StorageObject } from '../../storage/entities/object.entity';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { LoggerService } from '@/common/logger/logger.service';
import { StorageService } from '../../storage/storage.service';
import { NamespaceService } from '../../storage/services/namespace.service';
import { AuditEventService } from '../../storage/services/audit-event.service';
import { AuditAction } from '../../storage/entities/audit-event.entity';

@Injectable()
export class MultipartUploadService {
  constructor(
    @InjectRepository(UploadSession)
    private readonly sessionRepository: Repository<UploadSession>,
    @InjectRepository(StorageObject)
    private readonly objectRepository: Repository<StorageObject>,
    private readonly storageService: StorageService,
    private readonly namespaceService: NamespaceService,
    private readonly auditService: AuditEventService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('MultipartUploadService');
  }

  async initiateUpload(
    dto: InitiateUploadDto,
    requestId: string,
  ): Promise<UploadSession> {
    this.logger.log(`Initiating multipart upload: ${dto.name} in ${dto.namespace}`);

    // Verify namespace exists and check quota
    await this.namespaceService.findByName(dto.namespace);
    await this.namespaceService.checkQuota(dto.namespace, dto.expectedSizeBytes);

    // Check for existing in-progress session (idempotency)
    const existingSession = await this.sessionRepository.findOne({
      where: {
        namespace: dto.namespace,
        name: dto.name,
        status: UploadSessionStatus.IN_PROGRESS,
      },
    });

    if (existingSession && existingSession.expiresAt > new Date()) {
      this.logger.log(`Returning existing upload session: ${existingSession.id}`);
      return existingSession;
    }

    // Generate S3 key
    const s3Key = `${dto.namespace}/${Date.now()}-${dto.name}`;

    // Create multipart upload in S3
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.configService.get('storage.bucket'),
      Key: s3Key,
      ContentType: dto.contentType,
      ChecksumAlgorithm: 'SHA256',
    });

    const s3Response = await this.storageService.s3.send(createCommand);

    if (!s3Response.UploadId) {
      throw new Error('Failed to initiate multipart upload in S3');
    }

    // Create session record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const session = this.sessionRepository.create({
      uploadId: s3Response.UploadId,
      namespace: dto.namespace,
      name: dto.name,
      s3Key,
      contentType: dto.contentType,
      expectedSizeBytes: dto.expectedSizeBytes,
      uploadedSizeBytes: 0,
      partsCompleted: [],
      status: UploadSessionStatus.IN_PROGRESS,
      expiresAt,
    });

    const saved = await this.sessionRepository.save(session);

    // Log audit event
    await this.auditService.logEvent({
      requestId,
      action: AuditAction.CREATE,
      entityType: 'UploadSession',
      entityId: saved.id,
      namespace: saved.namespace,
      metadata: { s3Key, expectedSizeBytes: saved.expectedSizeBytes },
    });

    this.logger.log(`Upload session created: ${saved.id}`);
    return saved;
  }

  async uploadPart(
    sessionId: string,
    partNumber: number,
    body: Buffer,
  ): Promise<{ partNumber: number; ETag: string }> {
    this.logger.debug(`Uploading part ${partNumber} for session ${sessionId}`);

    const session = await this.getSession(sessionId);

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      throw new BadRequestException('Upload session has expired');
    }

    if (session.status !== UploadSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Upload session is not in progress');
    }

    // Upload part to S3
    const uploadCommand = new UploadPartCommand({
      Bucket: this.configService.get('storage.bucket'),
      Key: session.s3Key,
      UploadId: session.uploadId,
      PartNumber: partNumber,
      Body: body,
    });

    const uploadResponse = await this.storageService.s3.send(uploadCommand);

    if (!uploadResponse.ETag) {
      throw new Error('Failed to upload part to S3');
    }

    // Update session with completed part
    const partsCompleted = [...session.partsCompleted];
    const existingPartIndex = partsCompleted.findIndex((p) => p.partNumber === partNumber);

    if (existingPartIndex >= 0) {
      partsCompleted[existingPartIndex] = { partNumber, ETag: uploadResponse.ETag };
    } else {
      partsCompleted.push({ partNumber, ETag: uploadResponse.ETag });
    }

    session.partsCompleted = partsCompleted;
    session.uploadedSizeBytes += body.length;

    await this.sessionRepository.save(session);

    this.logger.debug(`Part ${partNumber} uploaded successfully`);

    return { partNumber, ETag: uploadResponse.ETag };
  }

  async completeUpload(
    sessionId: string,
    requestId: string,
  ): Promise<{ objectId: string; s3Key: string }> {
    this.logger.log(`Completing upload session: ${sessionId}`);

    const session = await this.getSession(sessionId);

    if (session.status !== UploadSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Upload session is not in progress');
    }

    if (session.partsCompleted.length === 0) {
      throw new BadRequestException('No parts uploaded');
    }

    // Sort parts by part number
    const sortedParts = [...session.partsCompleted].sort(
      (a, b) => a.partNumber - b.partNumber,
    );

    // Complete multipart upload in S3
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: this.configService.get('storage.bucket'),
      Key: session.s3Key,
      UploadId: session.uploadId,
      MultipartUpload: {
        Parts: sortedParts.map((part) => ({
          PartNumber: part.partNumber,
          ETag: part.ETag,
        })),
      },
    });

    await this.storageService.s3.send(completeCommand);

    // Create object record
    const object = this.objectRepository.create({
      namespace: session.namespace,
      name: session.name,
      s3Key: session.s3Key,
      contentType: session.contentType,
      sizeBytes: session.uploadedSizeBytes,
      checksum: null,
      customMetadata: null,
    });

    const savedObject = await this.objectRepository.save(object);

    // Update session status
    session.status = UploadSessionStatus.COMPLETED;
    await this.sessionRepository.save(session);

    // Update namespace usage
    await this.namespaceService.incrementUsage(session.namespace, session.uploadedSizeBytes);

    // Log audit event
    await this.auditService.logEvent({
      requestId,
      action: AuditAction.CREATE,
      entityType: 'Object',
      entityId: savedObject.id,
      namespace: savedObject.namespace,
      metadata: { uploadSessionId: sessionId, sizeBytes: savedObject.sizeBytes },
    });

    this.logger.log(`Upload completed: object ${savedObject.id}`);

    return { objectId: savedObject.id, s3Key: savedObject.s3Key };
  }

  async getSession(sessionId: string): Promise<UploadSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Upload session '${sessionId}' not found`);
    }

    return session;
  }

  async abortExpiredSessions(): Promise<number> {
    this.logger.log('Running cleanup job for expired upload sessions');

    const expiredSessions = await this.sessionRepository.find({
      where: {
        status: UploadSessionStatus.IN_PROGRESS,
      },
    });

    const now = new Date();
    const sessionsToAbort = expiredSessions.filter((s) => s.expiresAt < now);

    let aborted = 0;

    for (const session of sessionsToAbort) {
      try {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: this.configService.get('storage.bucket'),
          Key: session.s3Key,
          UploadId: session.uploadId,
        });

        await this.storageService.s3.send(abortCommand);

        session.status = UploadSessionStatus.EXPIRED;
        await this.sessionRepository.save(session);

        aborted++;
      } catch (error) {
        this.logger.error(`Failed to abort session ${session.id}`, error.stack);
      }
    }

    this.logger.log(`Cleanup job completed: ${aborted} sessions aborted`);
    return aborted;
  }
}
