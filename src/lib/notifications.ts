import { addDoc, collection, db, serverTimestamp } from './firebase';

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function showSystemNotification(title: string, message: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    // If we have a service worker, use it to show the notification
    // This allows it to work better in background
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: message,
          icon: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=192'
        });
      });
    } else {
      // Fallback to normal notification
      new Notification(title, {
        body: message,
        icon: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=192'
      });
    }
  }
}

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
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      })
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to create notifications", err);
  }
}
