import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';

export class DeleteNotificationUseCase {
  constructor(private repository: INotificationRepository) {}
  async execute(id: string): Promise<void> {
    return this.repository.deleteNotification(id);
  }
}
