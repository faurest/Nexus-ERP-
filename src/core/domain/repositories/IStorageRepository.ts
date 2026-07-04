export interface IStorageRepository {
  uploadFile(path: string, file: File): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  listFiles(path: string): Promise<any[]>;
}
