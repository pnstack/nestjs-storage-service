export interface StorageClientModuleOptions {
  /**
   * Base URL of the storage service
   */
  baseUrl: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;
}
