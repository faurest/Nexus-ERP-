import { INotificationFacade } from '../interfaces/INotificationFacade';

export class NotificationFacade implements INotificationFacade {
  constructor(
    private createNotificationUseCase: any,
    private updateNotificationUseCase: any,
    private deleteNotificationUseCase: any,
    private getNotificationUseCase: any,
    private listNotificationsUseCase: any,
    private observeNotificationsUseCase: any
  ) {}

  async createNotification(notification: any): Promise<string> { return this.createNotificationUseCase.execute(notification); }
  async updateNotification(id: string, data: any): Promise<void> { return this.updateNotificationUseCase.execute(id, data); }
  async deleteNotification(id: string): Promise<void> { return this.deleteNotificationUseCase.execute(id); }
  async getNotification(id: string): Promise<any> { return this.getNotificationUseCase.execute(id); }
  async listNotifications(userId: string): Promise<any[]> { return this.listNotificationsUseCase.execute(userId); }
  observeNotifications(userId: string, callback: (notifications: any[]) => void): () => void { return this.observeNotificationsUseCase.execute(userId, callback); }
}
