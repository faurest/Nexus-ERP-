import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';

export class ObserveNotificationUseCase {
  constructor(private repository: INotificationRepository) {}
  execute(companyId: string, userId: string, callback: (data: any[]) => void): () => void {
    return this.repository.subscribeToNotifications(companyId, userId, callback);
  }
}
