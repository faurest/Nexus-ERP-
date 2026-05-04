import { addDoc, collection, db } from './firebase';

export async function createNotification(
  companyId: string, 
  userIds: string[], 
  title: string, 
  message: string, 
  type: 'task' | 'project' | 'alert' | 'general'
) {
  try {
    const validUserIds = userIds.filter(uid => !!uid);
    const promises = validUserIds.map(uid => 
      addDoc(collection(db, 'notifications'), {
        companyId,
        userId: uid,
        title,
        message,
        type,
        isRead: 0,
        date: Date.now(),
        createdAt: Date.now()
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to create notifications", err);
  }
}
