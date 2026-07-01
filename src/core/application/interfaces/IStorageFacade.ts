export interface IStorageFacade {
  uploadFile(path: string, file: any): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  listFiles(path: string): Promise<any[]>;
}
