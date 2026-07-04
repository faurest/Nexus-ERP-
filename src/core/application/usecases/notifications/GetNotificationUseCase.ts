import { INotificationRepository } from '../../../domain/repositories/INotificationRepository';

export class GetNotificationUseCase {
  constructor(private repository: INotificationRepository) {}
  async execute(id: string): Promise<any> {
    return this.repository.getNotificationById(id);
  }
}
