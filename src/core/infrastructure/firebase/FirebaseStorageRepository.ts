import { IStorageRepository } from '../../domain/repositories/IStorageRepository';

export class FirebaseStorageRepository implements IStorageRepository {
  async uploadFile(path: string, file: File): Promise<string> {
    console.warn('Storage not implemented');
    return '';
  }

  async deleteFile(path: string): Promise<void> {
    console.warn('Storage not implemented');
  }

  async getFileUrl(path: string): Promise<string> {
    console.warn('Storage not implemented');
    return '';
  }
}
