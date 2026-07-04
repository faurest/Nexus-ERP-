import { IStorageRepository } from '../../../domain/repositories/IStorageRepository';

export class ListFilesUseCase {
  constructor(private repository: IStorageRepository) {}
  async execute(path: string): Promise<any> {
    return this.repository.listFiles(path);
  }
}
