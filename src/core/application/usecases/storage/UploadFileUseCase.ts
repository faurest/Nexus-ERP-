import { IStorageRepository } from '../../../domain/repositories/IStorageRepository';

export class UploadFileUseCase {
  constructor(private repository: IStorageRepository) {}
  async execute(path: string, file: any): Promise<any> {
    return this.repository.uploadFile(path, file);
  }
}
