export interface INotificationFacade {
  createNotification(notification: any): Promise<string>;
  updateNotification(id: string, data: any): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  getNotification(id: string): Promise<any>;
  listNotifications(userId: string): Promise<any[]>;
  observeNotifications(userId: string, callback: (notifications: any[]) => void): () => void;
}
