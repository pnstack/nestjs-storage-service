import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { StorageClient } from '../../src/client/axios/storage-client';

describe('StorageClient (Axios)', () => {
  let client: StorageClient;
  let mock: MockAdapter;

  beforeEach(() => {
    client = new StorageClient({
      baseUrl: 'http://localhost:4000',
      timeout: 30000,
    });
    mock = new MockAdapter(client.getAxiosInstance());
  });

  afterEach(() => {
    mock.restore();
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  describe('createNamespace', () => {
    it('should create a namespace', async () => {
      const mockNamespace = {
        id: '123',
        name: 'test-namespace',
        displayName: 'Test Namespace',
        quotaBytes: 1000000,
        usedBytes: 0,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mock.onPost('/api/v1/namespaces').reply(201, mockNamespace);

      const result = await client.createNamespace({
        name: 'test-namespace',
        displayName: 'Test Namespace',
        quotaBytes: 1000000,
      });

      expect(result).toEqual(mockNamespace);
    });
  });

  describe('createObject', () => {
    it('should create an object', async () => {
      const mockObject = {
        id: 'obj-123',
        namespace: 'test-namespace',
        name: 'test-file.pdf',
        s3Key: 'test-namespace/123456-test-file.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
        checksum: null,
        customMetadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
      };

      mock.onPost('/api/v1/objects').reply(201, mockObject);

      const result = await client.createObject({
        namespace: 'test-namespace',
        name: 'test-file.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
      });

      expect(result).toEqual(mockObject);
    });
  });

  describe('getObject', () => {
    it('should get an object by ID', async () => {
      const mockObject = {
        id: 'obj-123',
        namespace: 'test-namespace',
        name: 'test-file.pdf',
        s3Key: 'test-namespace/123456-test-file.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
        checksum: null,
        customMetadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mock.onGet('/api/v1/objects/obj-123').reply(200, mockObject);

      const result = await client.getObject('obj-123');

      expect(result).toEqual(mockObject);
    });
  });

  describe('deleteObject', () => {
    it('should delete an object', async () => {
      mock.onDelete('/api/v1/objects/obj-123').reply(204);

      await expect(client.deleteObject('obj-123')).resolves.not.toThrow();
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate a signed URL', async () => {
      const mockSignedUrl = {
        url: 'https://s3.amazonaws.com/signed-download-url',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mock.onPost('/api/v1/objects/obj-123/signed-url').reply(200, mockSignedUrl);

      const result = await client.generateSignedUrl('obj-123', {
        expiresIn: 3600,
      });

      expect(result).toEqual(mockSignedUrl);
    });
  });

  describe('listObjects', () => {
    it('should list objects in a namespace', async () => {
      const mockResponse = {
        items: [
          {
            id: 'obj-123',
            namespace: 'test-namespace',
            name: 'file1.pdf',
            s3Key: 'test-namespace/file1.pdf',
            contentType: 'application/pdf',
            sizeBytes: 1024,
            checksum: null,
            customMetadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      };

      mock.onGet(/\/api\/v1\/namespaces\/test-namespace\/objects/).reply(200, mockResponse);

      const result = await client.listObjects('test-namespace');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('setAuthToken', () => {
    it('should set authorization header', () => {
      client.setAuthToken('test-token');

      expect(client.getAxiosInstance().defaults.headers.common['Authorization']).toBe(
        'Bearer test-token',
      );
    });
  });

  describe('setHeaders', () => {
    it('should set custom headers', () => {
      client.setHeaders({
        'X-Custom-Header': 'custom-value',
      });

      expect(client.getAxiosInstance().defaults.headers.common['X-Custom-Header']).toBe(
        'custom-value',
      );
    });
  });

  describe('healthLive', () => {
    it('should check liveness', async () => {
      const mockHealth = { status: 'ok' };

      mock.onGet('/api/v1/health/live').reply(200, mockHealth);

      const result = await client.healthLive();

      expect(result).toEqual(mockHealth);
    });
  });
});
