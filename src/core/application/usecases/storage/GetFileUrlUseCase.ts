import { IStorageRepository } from '../../../domain/repositories/IStorageRepository';

export class GetFileUrlUseCase {
  constructor(private repository: IStorageRepository) {}
  async execute(path: string): Promise<any> {
    return this.repository.getFileUrl(path);
  }
}
