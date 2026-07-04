import { IStorageRepository } from '../../../domain/repositories/IStorageRepository';

export class DeleteFileUseCase {
  constructor(private repository: IStorageRepository) {}
  async execute(path: string): Promise<any> {
    return this.repository.deleteFile(path);
  }
}
