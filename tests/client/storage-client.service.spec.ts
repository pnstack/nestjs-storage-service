import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { StorageClientService } from '../../src/client/nestjs/storage-client.service';
import { STORAGE_CLIENT_CONFIG } from '../../src/client/nestjs/storage-client.constants';

describe('StorageClientService', () => {
  let service: StorageClientService;
  let httpService: HttpService;

  const mockConfig = {
    baseUrl: 'http://localhost:4000',
    timeout: 30000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        StorageClientService,
        {
          provide: STORAGE_CLIENT_CONFIG,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<StorageClientService>(StorageClientService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      const mockResponse: AxiosResponse = {
        data: mockNamespace,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.createNamespace({
        name: 'test-namespace',
        displayName: 'Test Namespace',
        quotaBytes: 1000000,
      });

      expect(result).toEqual(mockNamespace);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/namespaces',
        expect.objectContaining({
          name: 'test-namespace',
          displayName: 'Test Namespace',
          quotaBytes: 1000000,
        }),
        expect.any(Object),
      );
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

      const mockResponse: AxiosResponse = {
        data: mockObject,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.createObject({
        namespace: 'test-namespace',
        name: 'test-file.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
      });

      expect(result).toEqual(mockObject);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/objects',
        expect.objectContaining({
          namespace: 'test-namespace',
          name: 'test-file.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1024,
        }),
        expect.any(Object),
      );
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

      const mockResponse: AxiosResponse = {
        data: mockObject,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.getObject('obj-123');

      expect(result).toEqual(mockObject);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/objects/obj-123',
        expect.any(Object),
      );
    });
  });

  describe('deleteObject', () => {
    it('should delete an object', async () => {
      const mockResponse: AxiosResponse = {
        data: null,
        status: 204,
        statusText: 'No Content',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'delete').mockReturnValue(of(mockResponse));

      await service.deleteObject('obj-123');

      expect(httpService.delete).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/objects/obj-123',
        expect.any(Object),
      );
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate a signed URL', async () => {
      const mockSignedUrl = {
        url: 'https://s3.amazonaws.com/signed-download-url',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      const mockResponse: AxiosResponse = {
        data: mockSignedUrl,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.generateSignedUrl('obj-123', {
        expiresIn: 3600,
      });

      expect(result).toEqual(mockSignedUrl);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/objects/obj-123/signed-url',
        expect.objectContaining({
          expiresIn: 3600,
        }),
        expect.any(Object),
      );
    });
  });

  describe('healthLive', () => {
    it('should check liveness', async () => {
      const mockHealth = { status: 'ok' };

      const mockResponse: AxiosResponse = {
        data: mockHealth,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.healthLive();

      expect(result).toEqual(mockHealth);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/health/live',
      );
    });
  });
});
