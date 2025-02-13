import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as mime from 'mime-types';
import { extname } from 'path';
import { Readable } from 'stream';

import { randomFileName } from 'src/utils/tool';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class StorageService implements OnModuleInit {
  s3: S3Client;
  private endpoint: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    this.logger.setContext('StorageService');
    
    // For MinIO, we need to use path style endpoint
    const storageConfig = this.configService.get('storage');
    this.endpoint = storageConfig.endpoint;
    this.s3 = new S3Client({
      region: storageConfig.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: storageConfig.accessKey,
        secretAccessKey: storageConfig.secretKey,
      },
      forcePathStyle: storageConfig.forcePathStyle,
    });
  }

  onModuleInit() {
    this.logger.log('StorageService initialized with endpoint: ' + this.endpoint);
  }

  private getBucketName(): string {
    return this.configService.get('storage').bucket;
  }

  async getFile(name: string): Promise<Readable> {
    this.logger.debug(`Getting file: ${name}`);
    const res = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.getBucketName(),
        Key: name,
      })
    );
    return res.Body as Readable;
  }

  async getFileContentType(name: string): Promise<string> {
    this.logger.debug(`Getting content type for file: ${name}`);
    const res = await this.s3.send(
      new HeadObjectCommand({
        Bucket: this.getBucketName(),
        Key: name,
      })
    );
    return res.ContentType || 'application/octet-stream';
  }

  async getViewUrl(name: string) {
    this.logger.debug(`Generating view URL for file: ${name}`);
    const command = new GetObjectCommand({
      Bucket: this.getBucketName(),
      Key: name,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return url;
  }

  async putObject(key: string, body: Buffer, contentType: string) {
    this.logger.debug(`Uploading object: ${key} (${contentType})`);
    const command = new PutObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    try {
      await this.s3.send(command);
      const url = this.getObjectUrl(key);
      const signedUrl = await this.getViewUrl(key);
      
      this.logger.log(`Successfully uploaded object: ${key}`);
      return {
        url,
        signedUrl
      };
    } catch (error) {
      this.logger.error(`Failed to upload object: ${key}`, error.stack);
      throw error;
    }
  }

  private getObjectUrl(key: string): string {
    return `${this.endpoint}/${this.getBucketName()}/${key}`;
  }

  async getUploadUrl(extension: string) {
    this.logger.debug(`Generating upload URL for extension: ${extension}`);
    const contentType = mime.lookup(extension) || '';
    if (!contentType) {
      this.logger.error(`Invalid file extension: ${extension}`);
      throw new Error('Invalid file extension');
    }
    
    const fileKey = `${randomFileName()}${extension}`;
    const command = new PutObjectCommand({
      Key: fileKey,
      Bucket: this.getBucketName(),
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });

    return {
      signedUrl,
      path: this.getObjectUrl(fileKey),
      fileKey,
      contentType,
    };
  }

  async listFiles() {
    this.logger.debug('Listing all files');
    return await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.getBucketName(),
      })
    );
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.debug(`Deleting file: ${key}`);
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.getBucketName(),
          Key: key,
        })
      );
      this.logger.log(`Successfully deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error.stack);
      throw error;
    }
  }

  async uploadMultipleFiles(files: Array<{ buffer: Buffer; filename: string; mimetype: string }>) {
    this.logger.log(`Uploading ${files.length} files`);
    const uploadPromises = files.map(async (file) => {
      const fileKey = `${Date.now()}-${file.filename}`;
      try {
        const { url, signedUrl } = await this.putObject(fileKey, file.buffer, file.mimetype);
        
        this.logger.debug(`Successfully uploaded file: ${file.filename} as ${fileKey}`);
        return {
          fileKey,
          url,
          signedUrl,
          contentType: file.mimetype,
          originalName: file.filename
        };
      } catch (error) {
        this.logger.error(`Failed to upload file: ${file.filename}`, error.stack);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  }
}
