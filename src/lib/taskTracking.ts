import { addDoc, collection, db, doc, serverTimestamp, updateDoc } from './firebase';
import { createNotification, showSystemNotification } from './notifications';

export interface TaskStatusMeta {
  label: string;
  badge: string;
}

export const TASK_STATUSES: Record<string, TaskStatusMeta> = {
  todo: { label: 'À faire', badge: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'En cours', badge: 'bg-blue-100 text-blue-700' },
  blocked: { label: 'Bloquée', badge: 'bg-red-100 text-red-700' },
  done: { label: 'Terminée', badge: 'bg-green-100 text-green-700' },
  pending: { label: 'En attente', badge: 'bg-amber-100 text-amber-700' },
};

export const TASK_STATUS_ORDER = ['todo', 'in_progress', 'blocked', 'done'];

export function taskStatusLabel(status?: string): string {
  const key = status || 'todo';
  return (TASK_STATUSES[key] && TASK_STATUSES[key].label) || key || 'todo';
}

export function taskStatusBadge(status?: string): string {
  const key = status || 'todo';
  return (TASK_STATUSES[key] && TASK_STATUSES[key].badge) || 'bg-slate-100 text-slate-600';
}

export async function logTaskUpdate(
  companyId: string,
  taskId: string,
  payload: {
    actorId?: string;
    actorName?: string;
    fromStatus?: string;
    toStatus?: string;
    comment?: string;
  },
): Promise<void> {
  try {
    await addDoc(collection(db, 'task_updates'), {
      companyId,
      taskId,
      actorId: payload.actorId || null,
      actorName: payload.actorName || null,
      fromStatus: payload.fromStatus || null,
      toStatus: payload.toStatus || null,
      comment: payload.comment || null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Erreur lors de la journalisation de la tâche', err);
  }
}

export interface TaskActor {
  id?: string;
  name?: string;
}

export async function createTaskWithTracking(params: {
  companyId: string;
  data: any;
  actor?: TaskActor;
  recipients?: string[];
}): Promise<string> {
  const { companyId, data, actor, recipients } = params;
  const status = data.status || 'todo';
  const ref = await addDoc(collection(db, 'tasks'), {
    ...data,
    companyId,
    status,
    updatedAt: serverTimestamp(),
  });
  const taskId = ref.id;

  await logTaskUpdate(companyId, taskId, {
    actorId: actor && actor.id,
    actorName: actor && actor.name,
    fromStatus: null,
    toStatus: status,
    comment: `Tâche créée : ${data.title || 'sans titre'}`,
  });

  if (recipients && recipients.length > 0) {
    await createNotification(
      companyId,
      recipients,
      'Nouvelle Tâche',
      `Une nouvelle tâche "${data.title}" a été assignée.`,
      'task',
    );
  }
  return taskId;
}

export async function changeTaskStatus(params: {
  companyId: string;
  taskId: string;
  taskTitle: string;
  fromStatus?: string;
  toStatus: string;
  comment?: string;
  actor?: TaskActor;
  recipients?: string[];
}): Promise<void> {
  const { companyId, taskId, taskTitle, fromStatus, toStatus, comment, actor, recipients } = params;

  const patch: Record<string, any> = { status: toStatus };
  patch.completedAt = toStatus === 'done' ? serverTimestamp() : null;
  await updateDoc(doc(db, 'tasks', taskId), patch);

  await logTaskUpdate(companyId, taskId, {
    actorId: actor && actor.id,
    actorName: actor && actor.name,
    fromStatus: fromStatus || null,
    toStatus,
    comment: comment || null,
  });

  const title = 'Évolution de la tâche';
  const message = `La tâche "${taskTitle}" est passée de "${taskStatusLabel(fromStatus)}" à "${taskStatusLabel(toStatus)}".${comment ? ` ${comment}` : ''}`;
  if (recipients && recipients.length > 0) {
    await createNotification(
      companyId,
      recipients,
      title,
      message,
      toStatus === 'blocked' ? 'alert' : 'task',
    );
  }
  showSystemNotification(title, message);
}

export function collectTaskRecipients(
  options: { employees?: any[]; ownerId?: string; assigneeUid?: string },
): string[] {
  const set = new Set<string>();
  (options.employees || []).forEach((uid: any) => {
    if (uid !== null && uid !== undefined && uid !== '') set.add(String(uid));
  });
  if (options.ownerId) set.add(String(options.ownerId));
  if (options.assigneeUid) set.add(String(options.assigneeUid));
  return Array.from(set);
}
