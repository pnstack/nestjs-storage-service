import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
  StorageClientConfig,
} from '../shared/types';

/**
 * Storage Service Client for frontend applications using Axios
 * 
 * @example
 * ```typescript
 * const client = new StorageClient({
 *   baseUrl: 'http://localhost:4000',
 * });
 * 
 * // Create a namespace
 * const namespace = await client.createNamespace({
 *   name: 'my-org',
 *   displayName: 'My Organization',
 *   quotaBytes: 1073741824, // 1GB
 * });
 * 
 * // Upload a file
 * const object = await client.createObject({
 *   namespace: 'my-org',
 *   name: 'document.pdf',
 *   contentType: 'application/pdf',
 *   sizeBytes: 1024000,
 * });
 * 
 * // Upload to the returned URL
 * await client.uploadFile(object.uploadUrl!, file);
 * ```
 */
export class StorageClient {
  private readonly axios: AxiosInstance;

  constructor(config: StorageClientConfig) {
    this.axios = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
  }

  /**
   * Set custom headers for all requests
   */
  setHeaders(headers: Record<string, string>): void {
    Object.assign(this.axios.defaults.headers.common, headers);
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string): void {
    this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // ============= Namespace Operations =============

  /**
   * Create a new namespace
   */
  async createNamespace(data: CreateNamespaceRequest): Promise<NamespaceResponse> {
    const response = await this.axios.post<NamespaceResponse>('/api/v1/namespaces', data);
    return response.data;
  }

  /**
   * Get namespace details by name
   */
  async getNamespace(name: string): Promise<NamespaceResponse> {
    const response = await this.axios.get<NamespaceResponse>(`/api/v1/namespaces/${name}`);
    return response.data;
  }

  // ============= Object Operations =============

  /**
   * Create a new object and get upload URL
   */
  async createObject(data: CreateObjectRequest): Promise<ObjectResponse> {
    const response = await this.axios.post<ObjectResponse>('/api/v1/objects', data);
    return response.data;
  }

  /**
   * Get object metadata by ID
   */
  async getObject(id: string): Promise<ObjectResponse> {
    const response = await this.axios.get<ObjectResponse>(`/api/v1/objects/${id}`);
    return response.data;
  }

  /**
   * Generate a signed download URL for an object
   */
  async generateSignedUrl(
    id: string,
    data?: GenerateSignedUrlRequest,
  ): Promise<SignedUrlResponse> {
    const response = await this.axios.post<SignedUrlResponse>(
      `/api/v1/objects/${id}/signed-url`,
      data || {},
    );
    return response.data;
  }

  /**
   * Delete an object
   */
  async deleteObject(id: string): Promise<void> {
    await this.axios.delete(`/api/v1/objects/${id}`);
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

    const response = await this.axios.get<ListObjectsResponse>(
      `/api/v1/namespaces/${namespace}/objects?${params.toString()}`,
    );
    return response.data;
  }

  // ============= Upload Operations =============

  /**
   * Upload a file directly to a pre-signed URL
   */
  async uploadFile(url: string, file: File | Blob, contentType?: string): Promise<void> {
    await axios.put(url, file, {
      headers: {
        'Content-Type': contentType || (file as File).type || 'application/octet-stream',
      },
    });
  }

  /**
   * Initiate a multipart upload for large files
   */
  async initiateUpload(data: InitiateUploadRequest): Promise<InitiateUploadResponse> {
    const response = await this.axios.post<InitiateUploadResponse>(
      '/api/v1/uploads/initiate',
      data,
    );
    return response.data;
  }

  /**
   * Upload a single part of a multipart upload
   */
  async uploadPart(
    sessionId: string,
    partNumber: number,
    data: Blob,
  ): Promise<UploadPartResponse> {
    const response = await this.axios.put<UploadPartResponse>(
      `/api/v1/uploads/${sessionId}/parts/${partNumber}`,
      data,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      },
    );
    return response.data;
  }

  /**
   * Complete a multipart upload
   */
  async completeUpload(sessionId: string): Promise<CompleteUploadResponse> {
    const response = await this.axios.post<CompleteUploadResponse>(
      `/api/v1/uploads/${sessionId}/complete`,
    );
    return response.data;
  }

  // ============= Health Checks =============

  /**
   * Check if the service is alive
   */
  async healthLive(): Promise<{ status: string }> {
    const response = await this.axios.get<{ status: string }>('/api/v1/health/live');
    return response.data;
  }

  /**
   * Check if the service is ready (DB + S3 connectivity)
   */
  async healthReady(): Promise<{ status: string; checks: Record<string, any> }> {
    const response = await this.axios.get<{ status: string; checks: Record<string, any> }>(
      '/api/v1/health/ready',
    );
    return response.data;
  }

  /**
   * Get the underlying Axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axios;
  }
}
