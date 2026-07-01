export interface INotificationRepository {
  getNotifications(companyId: string, userId?: string): Promise<any[]>;
  markAsRead(id: string): Promise<void>;
  createNotification(notification: any): Promise<string>;
  subscribeToNotifications(companyId: string, userId: string, callback: (notifications: any[]) => void): () => void;
}
