import { IStorageFacade } from '../interfaces/IStorageFacade';

export class StorageFacade implements IStorageFacade {
  constructor(
    private uploadFileUseCase: any,
    private deleteFileUseCase: any,
    private getFileUrlUseCase: any,
    private listFilesUseCase: any
  ) {}

  async uploadFile(path: string, file: any): Promise<string> { return this.uploadFileUseCase.execute(path, file); }
  async deleteFile(path: string): Promise<void> { return this.deleteFileUseCase.execute(path); }
  async getFileUrl(path: string): Promise<string> { return this.getFileUrlUseCase.execute(path); }
  async listFiles(path: string): Promise<any[]> { return this.listFilesUseCase.execute(path); }
}
