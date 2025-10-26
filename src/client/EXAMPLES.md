/**
 * Example usage of the Storage Service Client libraries
 * 
 * This file demonstrates how to use both the NestJS backend client
 * and the frontend Axios client.
 */

// =============================================================================
// NestJS Backend Client Example
// =============================================================================

/**
 * 1. Install the package in your NestJS project
 * 
 * npm install @pnstack/nestjs-storage-service
 */

/**
 * 2. Import and configure the StorageClientModule in your app.module.ts
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageClientModule } from '@pnstack/nestjs-storage-service/client/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot(),
    
    // Synchronous registration
    StorageClientModule.register({
      baseUrl: 'http://localhost:4000',
      timeout: 30000,
    }),

    // OR Async registration with ConfigService
    StorageClientModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseUrl: config.get('STORAGE_SERVICE_URL') || 'http://localhost:4000',
        timeout: config.get('STORAGE_SERVICE_TIMEOUT') || 30000,
        headers: {
          'X-API-Key': config.get('STORAGE_API_KEY'),
        },
      }),
    }),
  ],
})
export class AppModule {}

/**
 * 3. Use the StorageClientService in your services
 */

import { Injectable } from '@nestjs/common';
import { StorageClientService } from '@pnstack/nestjs-storage-service/client/nestjs';

@Injectable()
export class FileService {
  constructor(private readonly storageClient: StorageClientService) {}

  async uploadDocument(file: Express.Multer.File, userId: string) {
    // Create namespace for user
    await this.storageClient.createNamespace({
      name: `user-${userId}`,
      displayName: `User ${userId} Files`,
      quotaBytes: 1073741824, // 1GB
    });

    // Create object and get upload URL
    const object = await this.storageClient.createObject({
      namespace: `user-${userId}`,
      name: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
    });

    return {
      objectId: object.id,
      uploadUrl: object.uploadUrl,
    };
  }

  async getDownloadUrl(objectId: string) {
    const { url, expiresAt } = await this.storageClient.generateSignedUrl(objectId, {
      expiresIn: 3600, // 1 hour
    });

    return { url, expiresAt };
  }

  async listUserFiles(userId: string) {
    const { items, total } = await this.storageClient.listObjects(`user-${userId}`, {
      limit: 100,
      offset: 0,
    });

    return { items, total };
  }

  async deleteFile(objectId: string) {
    await this.storageClient.deleteObject(objectId);
  }
}

// =============================================================================
// Frontend Client (React) Example
// =============================================================================

/**
 * 1. Install the package in your React/Vue/Angular project
 * 
 * npm install @pnstack/nestjs-storage-service
 */

/**
 * 2. Create a storage client instance
 */

import { StorageClient } from '@pnstack/nestjs-storage-service/client/axios';

const storageClient = new StorageClient({
  baseUrl: 'http://localhost:4000',
  timeout: 30000,
});

// Set authentication token if needed
storageClient.setAuthToken('your-jwt-token');

/**
 * 3. React component example
 */

import React, { useState } from 'react';

function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Step 1: Create object and get upload URL
      const object = await storageClient.createObject({
        namespace: 'user-uploads',
        name: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      // Step 2: Upload file to pre-signed URL
      await storageClient.uploadFile(object.uploadUrl!, file);

      alert('File uploaded successfully!');
      setFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileSelect} disabled={uploading} />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>
  );
}

/**
 * 4. File list component example
 */

function FileList({ namespace }: { namespace: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { items } = await storageClient.listObjects(namespace);
      setFiles(items);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (objectId: string) => {
    try {
      const { url } = await storageClient.generateSignedUrl(objectId, {
        expiresIn: 3600,
      });
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to generate download URL:', error);
    }
  };

  const deleteFile = async (objectId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await storageClient.deleteObject(objectId);
      await loadFiles(); // Reload list
      alert('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  React.useEffect(() => {
    loadFiles();
  }, [namespace]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Files</h2>
      <button onClick={loadFiles}>Refresh</button>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <span>{file.name}</span>
            <span>{(file.sizeBytes / 1024).toFixed(2)} KB</span>
            <button onClick={() => downloadFile(file.id)}>Download</button>
            <button onClick={() => deleteFile(file.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// Vue Composition API Example
// =============================================================================

import { ref, onMounted } from 'vue';

function useFileUpload() {
  const file = ref<File | null>(null);
  const uploading = ref(false);

  const uploadFile = async () => {
    if (!file.value) return;

    uploading.value = true;
    try {
      const object = await storageClient.createObject({
        namespace: 'user-uploads',
        name: file.value.name,
        contentType: file.value.type,
        sizeBytes: file.value.size,
      });

      await storageClient.uploadFile(object.uploadUrl!, file.value);
      alert('File uploaded!');
      file.value = null;
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      uploading.value = false;
    }
  };

  return {
    file,
    uploading,
    uploadFile,
  };
}

// =============================================================================
// Advanced: Multipart Upload for Large Files
// =============================================================================

async function uploadLargeFile(file: File) {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE);

  // Step 1: Initiate multipart upload
  const session = await storageClient.initiateUpload({
    namespace: 'large-files',
    name: file.name,
    contentType: file.type,
    expectedSizeBytes: file.size,
  });

  // Step 2: Upload each part
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await storageClient.uploadPart(session.sessionId, i + 1, chunk);
    
    console.log(`Uploaded part ${i + 1}/${chunks}`);
  }

  // Step 3: Complete the upload
  const result = await storageClient.completeUpload(session.sessionId);
  
  return result;
}
