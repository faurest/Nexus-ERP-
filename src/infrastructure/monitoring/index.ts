import { addDoc, collection, serverTimestamp } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { getSupabase } from '../../lib/supabase';

export const monitoring = {
  log(event: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Monitoring Event] ${event}`, meta);
    }
  },
  
  error(error: any, context?: any) {
    console.error(`[Monitoring Error]`, error, context);
  },

  securityAlert(type: string, message: string, meta?: any) {
    console.warn(`[SECURITY ALERT] ${type}: ${message}`, meta);
    // Future integration with Sentry/Datadog here...
    this.audit(`SECURITY_${type}`, 'SYSTEM', { message, ...meta });
  },

  async audit(action: string, performedBy: string, metadata: Record<string, any>) {
    try {
      // 1. Log to fast Firebase DB for recent activity
      await addDoc(collection(db, 'audit_logs'), {
        action,
        performedBy,
        metadata,
        timestamp: serverTimestamp()
      });

      // 2. Archive to Supabase (if required for permanent storage)
      const sb = getSupabase();
      if (sb) {
        await sb.from('audit_logs').insert({
           action,
           performed_by: performedBy,
           metadata: metadata
        });
      }
    } catch (e) {
      console.error("Failed to write audit log:", e);
    }
  }
};

