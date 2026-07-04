export interface INotificationRepository {
  getNotifications(companyId: string, userId?: string): Promise<any[]>;
  getNotificationById(id: string): Promise<any | null>;
  markAsRead(id: string): Promise<void>;
  createNotification(notification: any): Promise<string>;
  updateNotification(id: string, data: any): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  subscribeToNotifications(companyId: string, userId: string, callback: (notifications: any[]) => void): () => void;
}
