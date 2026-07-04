import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';

export class UpdateNotificationUseCase {
  constructor(private repository: INotificationRepository) {}
  async execute(id: string, data: any): Promise<void> {
    return this.repository.updateNotification(id, data);
  }
}
