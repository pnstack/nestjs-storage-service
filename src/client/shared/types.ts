/**
 * Shared types and interfaces for storage service clients
 */

export interface CreateNamespaceRequest {
  name: string;
  displayName?: string;
  quotaBytes?: number;
  metadata?: Record<string, any>;
}

export interface NamespaceResponse {
  id: string;
  name: string;
  displayName: string | null;
  quotaBytes: number | null;
  usedBytes: number;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObjectRequest {
  namespace: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string;
  customMetadata?: Record<string, string>;
}

export interface ObjectResponse {
  id: string;
  namespace: string;
  name: string;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  checksum: string | null;
  customMetadata: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  uploadUrl?: string;
}

export interface GenerateSignedUrlRequest {
  expiresIn?: number;
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: string;
}

export interface ListObjectsResponse {
  items: ObjectResponse[];
  total: number;
}

export interface InitiateUploadRequest {
  namespace: string;
  name: string;
  contentType: string;
  expectedSizeBytes: number;
}

export interface InitiateUploadResponse {
  sessionId: string;
  uploadId: string;
  objectId: string;
  partUrls: Array<{ partNumber: number; url: string }>;
}

export interface UploadPartResponse {
  etag: string;
}

export interface CompleteUploadResponse {
  objectId: string;
  s3Key: string;
}

export interface StorageClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}
