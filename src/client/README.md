# Storage Service Client Module

This module provides client libraries for both NestJS backend microservices and frontend applications to interact with the storage service.

## Installation

```bash
npm install @pnstack/nestjs-storage-service
```

## Usage

### NestJS Backend Client

For NestJS microservices, use the `StorageClientModule`:

#### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { StorageClientModule } from '@pnstack/nestjs-storage-service/client/nestjs';

@Module({
  imports: [
    StorageClientModule.register({
      baseUrl: 'http://localhost:4000',
      timeout: 30000, // optional, defaults to 30000ms
      headers: {
        'X-API-Key': 'your-api-key', // optional custom headers
      },
    }),
  ],
})
export class AppModule {}
```

#### Async Configuration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageClientModule } from '@pnstack/nestjs-storage-service/client/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageClientModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseUrl: config.get('STORAGE_SERVICE_URL'),
        timeout: config.get('STORAGE_SERVICE_TIMEOUT'),
      }),
    }),
  ],
})
export class AppModule {}
```

#### Using the Service

```typescript
import { Injectable } from '@nestjs/common';
import { StorageClientService } from '@pnstack/nestjs-storage-service/client/nestjs';

@Injectable()
export class DocumentService {
  constructor(private readonly storageClient: StorageClientService) {}

  async uploadDocument(file: Express.Multer.File) {
    // Create a namespace
    const namespace = await this.storageClient.createNamespace({
      name: 'documents',
      displayName: 'Documents',
      quotaBytes: 1073741824, // 1GB
    });

    // Create an object
    const object = await this.storageClient.createObject({
      namespace: 'documents',
      name: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
    });

    // Upload the file to the pre-signed URL (you would do this from your client or use axios)
    // await uploadToSignedUrl(object.uploadUrl, file.buffer);

    return object;
  }

  async downloadDocument(objectId: string) {
    // Generate a signed download URL
    const { url, expiresAt } = await this.storageClient.generateSignedUrl(objectId, {
      expiresIn: 3600, // 1 hour
    });

    return { url, expiresAt };
  }

  async listDocuments() {
    // List objects in a namespace
    const { items, total } = await this.storageClient.listObjects('documents', {
      limit: 10,
      offset: 0,
    });

    return { items, total };
  }

  async deleteDocument(objectId: string) {
    await this.storageClient.deleteObject(objectId);
  }
}
```

### Frontend Client (Axios)

For frontend applications (React, Vue, Angular, etc.), use the `StorageClient` class:

#### Basic Setup

```typescript
import { StorageClient } from '@pnstack/nestjs-storage-service/client/axios';

const client = new StorageClient({
  baseUrl: 'http://localhost:4000',
  timeout: 30000, // optional, defaults to 30000ms
  headers: {
    'X-API-Key': 'your-api-key', // optional custom headers
  },
});
```

#### React Example

```typescript
import React, { useState } from 'react';
import { StorageClient } from '@pnstack/nestjs-storage-service/client/axios';

const client = new StorageClient({
  baseUrl: 'http://localhost:4000',
});

function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Create the object and get upload URL
      const object = await client.createObject({
        namespace: 'user-uploads',
        name: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      // Upload the file to the pre-signed URL
      await client.uploadFile(object.uploadUrl!, file);

      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}
```

#### Vue Example

```vue
<template>
  <div>
    <input type="file" @change="onFileChange" />
    <button @click="uploadFile" :disabled="!file || uploading">
      {{ uploading ? 'Uploading...' : 'Upload' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { StorageClient } from '@pnstack/nestjs-storage-service/client/axios';

const client = new StorageClient({
  baseUrl: 'http://localhost:4000',
});

const file = ref<File | null>(null);
const uploading = ref(false);

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  file.value = target.files?.[0] || null;
};

const uploadFile = async () => {
  if (!file.value) return;

  uploading.value = true;
  try {
    const object = await client.createObject({
      namespace: 'user-uploads',
      name: file.value.name,
      contentType: file.value.type,
      sizeBytes: file.value.size,
    });

    await client.uploadFile(object.uploadUrl!, file.value);
    alert('File uploaded successfully!');
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Upload failed');
  } finally {
    uploading.value = false;
  }
};
</script>
```

## API Reference

### Namespace Operations

- `createNamespace(data: CreateNamespaceRequest): Promise<NamespaceResponse>`
- `getNamespace(name: string): Promise<NamespaceResponse>`

### Object Operations

- `createObject(data: CreateObjectRequest): Promise<ObjectResponse>`
- `getObject(id: string): Promise<ObjectResponse>`
- `generateSignedUrl(id: string, data?: GenerateSignedUrlRequest): Promise<SignedUrlResponse>`
- `deleteObject(id: string): Promise<void>`
- `listObjects(namespace: string, options?: ListOptions): Promise<ListObjectsResponse>`

### Upload Operations

- `uploadFile(url: string, file: File | Blob, contentType?: string): Promise<void>` (Axios client only)
- `initiateUpload(data: InitiateUploadRequest): Promise<InitiateUploadResponse>`
- `uploadPart(sessionId: string, partNumber: number, data: Blob | Buffer): Promise<UploadPartResponse>`
- `completeUpload(sessionId: string): Promise<CompleteUploadResponse>`

### Health Checks

- `healthLive(): Promise<{ status: string }>`
- `healthReady(): Promise<{ status: string; checks: Record<string, any> }>`

## TypeScript Support

All clients are fully typed with TypeScript. Import types from the package:

```typescript
import {
  CreateNamespaceRequest,
  NamespaceResponse,
  CreateObjectRequest,
  ObjectResponse,
  // ... other types
} from '@pnstack/nestjs-storage-service/client';
```

## Authentication

To add authentication headers:

### NestJS Client

Pass headers in the module configuration:

```typescript
StorageClientModule.register({
  baseUrl: 'http://localhost:4000',
  headers: {
    'Authorization': 'Bearer your-token',
  },
})
```

### Axios Client

Use the `setAuthToken` method or `setHeaders`:

```typescript
const client = new StorageClient({
  baseUrl: 'http://localhost:4000',
});

// Set authorization token
client.setAuthToken('your-token');

// Or set custom headers
client.setHeaders({
  'X-Custom-Header': 'value',
});
```

## License

MIT
