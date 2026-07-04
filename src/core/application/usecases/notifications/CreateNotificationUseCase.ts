import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';

export class CreateNotificationUseCase {
  constructor(private repository: INotificationRepository) {}
  async execute(data: any): Promise<string> {
    return this.repository.createNotification(data);
  }
}
