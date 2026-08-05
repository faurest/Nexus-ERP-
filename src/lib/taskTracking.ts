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
  if (toStatus === 'blocked') patch.blockedSince = serverTimestamp();
  if (fromStatus === 'blocked' && toStatus !== 'blocked') patch.blockedSince = null;
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

function taskDateToMs(ts: any): number | null {
  if (ts === null || ts === undefined || ts === '') return null;
  if (typeof ts === 'number') return ts;
  if (ts.seconds !== undefined && ts.nanoseconds !== undefined) return ts.seconds * 1000;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? null : parsed;
}

export const TASK_ALERT_DEFAULTS = {
  dueWindowMs: 24 * 60 * 60 * 1000, // alerte 24h avant échéance
  blockedAfterMs: 48 * 60 * 60 * 1000, // escalade après 48h de blocage
  reNotifyAfterMs: 24 * 60 * 60 * 1000, // re-notification max 1x / 24h
};

export async function checkTaskAlerts(params: {
  companyId: string;
  tasks: any[];
  employees?: any[];
  ownerId?: string;
  actorName?: string;
  overrides?: Partial<typeof TASK_ALERT_DEFAULTS>;
}): Promise<{ reminders: number; escalations: number }> {
  const { companyId, tasks, employees, ownerId, actorName, overrides } = params;
  const cfg = { ...TASK_ALERT_DEFAULTS, ...(overrides || {}) };
  const now = Date.now();
  const result = { reminders: 0, escalations: 0 };
  const patchById: Record<string, Record<string, any>> = {};

  for (const t of tasks || []) {
    if (!t || t.status === 'done' || t.status === 'pending') continue;

    const due = taskDateToMs(t.endDate);
    const lastReminder = taskDateToMs(t.reminderSentAt);
    const lastEscalation = taskDateToMs(t.escalationSentAt);
    const blockedSince = taskDateToMs(t.blockedSince);

    // 1) Rappel d'échéance : échéance dans < 24h OU en retard, max 1 notification / 24h
    if (due !== null && (due - now <= cfg.dueWindowMs)) {
      const shouldRemind = !lastReminder || (now - lastReminder) >= cfg.reNotifyAfterMs;
      if (shouldRemind) {
        const isOverdue = due < now;
        const recipients = collectTaskRecipients({ employees, ownerId, assigneeUid: t.assignedToUid });
        const day = new Date(due).toLocaleDateString();
        const msg = isOverdue
          ? `La tâche "${t.title || ''}" est en RETARD depuis le ${day}.`
          : `La tâche "${t.title || ''}" arrive à échéance le ${day}.`;
        await logTaskUpdate(companyId, t.id, {
          actorName: actorName || 'Système',
          comment: `Rappel automatique : ${msg}`,
        });
        if (recipients.length > 0) {
          await createNotification(
            companyId,
            recipients,
            isOverdue ? 'Tâche en retard' : 'Échéance proche',
            msg,
            'alert',
          );
        }
        showSystemNotification(isOverdue ? 'Tâche en retard' : 'Échéance proche', msg);
        patchById[t.id] = { ...(patchById[t.id] || {}), reminderSentAt: serverTimestamp() };
        result.reminders += 1;
      }
    }

    // 2) Escalade : tâche bloquée depuis > 48h, max 1 notification / 24h
    if (t.status === 'blocked' && blockedSince !== null && (now - blockedSince) >= cfg.blockedAfterMs) {
      const shouldEscalate = !lastEscalation || (now - lastEscalation) >= cfg.reNotifyAfterMs;
      if (shouldEscalate) {
        const hours = Math.floor((now - blockedSince) / (60 * 60 * 1000));
        const recipients = collectTaskRecipients({ employees, ownerId, assigneeUid: t.assignedToUid });
        await logTaskUpdate(companyId, t.id, {
          actorName: actorName || 'Système',
          comment: `Escalade automatique : tâche bloquée depuis ${hours}h.`,
        });
        if (recipients.length > 0) {
          await createNotification(
            companyId,
            recipients,
            'Tâche bloquée à débloquer',
            `La tâche "${t.title || ''}" est bloquée depuis ${hours}h.`,
            'alert',
          );
        }
        showSystemNotification(
          'Tâche bloquée à débloquer',
          `La tâche "${t.title || ''}" est bloquée depuis ${hours}h.`,
        );
        patchById[t.id] = { ...(patchById[t.id] || {}), escalationSentAt: serverTimestamp() };
        result.escalations += 1;
      }
    }
  }

  for (const [taskId, patch] of Object.entries(patchById)) {
    try {
      await updateDoc(doc(db, 'tasks', taskId), patch);
    } catch (err) {
      console.error('Erreur lors de la persistance du marqueur d\'alerte', err);
    }
  }

  return result;
}
