import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';

export class ListNotificationUseCase {
  constructor(private repository: INotificationRepository) {}
  async execute(companyId: string, userId?: string): Promise<any[]> {
    return this.repository.getNotifications(companyId, userId);
  }
}
