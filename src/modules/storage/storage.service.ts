import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as mime from 'mime-types';
import { extname } from 'path';
import { Readable } from 'stream';

import { randomFileName } from 'src/utils/tool';

@Injectable()
export class StorageService implements OnModuleInit {
  s3: S3Client;
  private endpoint: string;

  constructor(private readonly configService: ConfigService) {
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
    console.log('StorageService initialized with endpoint:', this.endpoint);
  }

  private getBucketName(): string {
    return this.configService.get('storage').bucket;
  }

  async getFile(name: string): Promise<Readable> {
    const res = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.getBucketName(),
        Key: name,
      })
    );
    return res.Body as Readable;
  }

  async getFileContentType(name: string): Promise<string> {
    const res = await this.s3.send(
      new HeadObjectCommand({
        Bucket: this.getBucketName(),
        Key: name,
      })
    );
    return res.ContentType || 'application/octet-stream';
  }

  async getViewUrl(name: string) {
    const command = new GetObjectCommand({
      Bucket: this.getBucketName(),
      Key: name,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return url;
  }

  async putObject(key: string, body: Buffer, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.s3.send(command);
    return this.getObjectUrl(key);
  }

  private getObjectUrl(key: string): string {
    return `${this.endpoint}/${this.getBucketName()}/${key}`;
  }

  async getUploadUrl(extension: string) {
    const contentType = mime.lookup(extension) || '';
    if (!contentType) throw new Error('Invalid file extension');
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
    return await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.getBucketName(),
      })
    );
  }
}
