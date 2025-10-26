import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CreateNamespaceRequest,
  NamespaceResponse,
  CreateObjectRequest,
  ObjectResponse,
  GenerateSignedUrlRequest,
  SignedUrlResponse,
  ListObjectsResponse,
  InitiateUploadRequest,
  InitiateUploadResponse,
  UploadPartResponse,
  CompleteUploadResponse,
} from '../shared/types';
import { STORAGE_CLIENT_CONFIG } from './storage-client.constants';
import { StorageClientModuleOptions } from './storage-client.interfaces';

/**
 * Storage Service Client for NestJS backend microservices
 * 
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     StorageClientModule.register({
 *       baseUrl: 'http://localhost:4000',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * 
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly storageClient: StorageClientService) {}
 * 
 *   async uploadDocument(file: Express.Multer.File) {
 *     const object = await this.storageClient.createObject({
 *       namespace: 'documents',
 *       name: file.originalname,
 *       contentType: file.mimetype,
 *       sizeBytes: file.size,
 *     });
 *     return object;
 *   }
 * }
 * ```
 */
@Injectable()
export class StorageClientService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(STORAGE_CLIENT_CONFIG)
    private readonly config: StorageClientModuleOptions,
  ) {}

  /**
   * Get the base URL for API calls
   */
  private getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get default headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
  }

  // ============= Namespace Operations =============

  /**
   * Create a new namespace
   */
  async createNamespace(data: CreateNamespaceRequest): Promise<NamespaceResponse> {
    const response = await firstValueFrom(
      this.httpService.post<NamespaceResponse>(
        `${this.getBaseUrl()}/api/v1/namespaces`,
        data,
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  /**
   * Get namespace details by name
   */
  async getNamespace(name: string): Promise<NamespaceResponse> {
    const response = await firstValueFrom(
      this.httpService.get<NamespaceResponse>(
        `${this.getBaseUrl()}/api/v1/namespaces/${name}`,
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  // ============= Object Operations =============

  /**
   * Create a new object and get upload URL
   */
  async createObject(data: CreateObjectRequest): Promise<ObjectResponse> {
    const response = await firstValueFrom(
      this.httpService.post<ObjectResponse>(
        `${this.getBaseUrl()}/api/v1/objects`,
        data,
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  /**
   * Get object metadata by ID
   */
  async getObject(id: string): Promise<ObjectResponse> {
    const response = await firstValueFrom(
      this.httpService.get<ObjectResponse>(
        `${this.getBaseUrl()}/api/v1/objects/${id}`,
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  /**
   * Generate a signed download URL for an object
   */
  async generateSignedUrl(
    id: string,
    data?: GenerateSignedUrlRequest,
  ): Promise<SignedUrlResponse> {
    const response = await firstValueFrom(
      this.httpService.post<SignedUrlResponse>(
        `${this.getBaseUrl()}/api/v1/objects/${id}/signed-url`,
        data || {},
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  /**
   * Delete an object
   */
  async deleteObject(id: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(`${this.getBaseUrl()}/api/v1/objects/${id}`, {
        headers: this.getHeaders(),
      }),
    );
  }

  /**
   * List objects in a namespace
   */
  async listObjects(
    namespace: string,
    options?: { prefix?: string; limit?: number; offset?: number },
  ): Promise<ListObjectsResponse> {
    const params = new URLSearchParams();
    if (options?.prefix) params.append('prefix', options.prefix);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await firstValueFrom(
      this.httpService.get<ListObjectsResponse>(
        `${this.getBaseUrl()}/api/v1/namespaces/${namespace}/objects?${params.toString()}`,
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  // ============= Upload Operations =============

  /**
   * Initiate a multipart upload for large files
   */
  async initiateUpload(data: InitiateUploadRequest): Promise<InitiateUploadResponse> {
    const response = await firstValueFrom(
      this.httpService.post<InitiateUploadResponse>(
        `${this.getBaseUrl()}/api/v1/uploads/initiate`,
        data,
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  /**
   * Upload a single part of a multipart upload
   */
  async uploadPart(
    sessionId: string,
    partNumber: number,
    data: Buffer,
  ): Promise<UploadPartResponse> {
    const response = await firstValueFrom(
      this.httpService.put<UploadPartResponse>(
        `${this.getBaseUrl()}/api/v1/uploads/${sessionId}/parts/${partNumber}`,
        data,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        },
      ),
    );
    return response.data;
  }

  /**
   * Complete a multipart upload
   */
  async completeUpload(sessionId: string): Promise<CompleteUploadResponse> {
    const response = await firstValueFrom(
      this.httpService.post<CompleteUploadResponse>(
        `${this.getBaseUrl()}/api/v1/uploads/${sessionId}/complete`,
        {},
        { headers: this.getHeaders() },
      ),
    );
    return response.data;
  }

  // ============= Health Checks =============

  /**
   * Check if the service is alive
   */
  async healthLive(): Promise<{ status: string }> {
    const response = await firstValueFrom(
      this.httpService.get<{ status: string }>(
        `${this.getBaseUrl()}/api/v1/health/live`,
      ),
    );
    return response.data;
  }

  /**
   * Check if the service is ready (DB + S3 connectivity)
   */
  async healthReady(): Promise<{ status: string; checks: Record<string, any> }> {
    const response = await firstValueFrom(
      this.httpService.get<{ status: string; checks: Record<string, any> }>(
        `${this.getBaseUrl()}/api/v1/health/ready`,
      ),
    );
    return response.data;
  }
}
