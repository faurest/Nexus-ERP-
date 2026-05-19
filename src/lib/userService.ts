import { supabase } from './supabase';
import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string; // Supabase UUID (Business ID)
  firebase_uid: string; // Internal Auth ID
  email: string;
  fullName: string;
  photoURL?: string;
  role?: string;
  lastLogin?: string;
}

export async function syncUserProfile(firebaseUser: any): Promise<UserProfile | null> {
  if (!firebaseUser) return null;

  const rawEmail = firebaseUser.email?.toLowerCase().trim() || '';
  const cleanEmail = rawEmail.replace(/\s+/g, '');
  
  const profilePayload = {
    firebase_uid: firebaseUser.uid,
    email: cleanEmail,
    fullname: firebaseUser.displayName || cleanEmail.split('@')[0] || 'Utilisateur Nexus',
    avatar_url: firebaseUser.photoURL || '',
    last_login: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. SUPABASE SYNC (Source of Truth for Identity)
  if (supabase) {
    try {
      console.log("Nexus Identity: Synchronizing user", cleanEmail);
      
      // Step A: Check for existing user by email (most portable identifier)
      let { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      // Handle the case where firebase_uid column is missing from schema
      const hasFirebaseUidCol = findError ? !findError.message.includes('firebase_uid') : true;

      // If findError is specifically about firebase_uid column missing, retry without it
      if (findError && findError.message.includes('firebase_uid')) {
        console.warn("Nexus Identity: firebase_uid column missing, syncing by email only.");
        const { data: retryEmail } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
        existingUser = retryEmail;
      }

      let resultData = null;

      // Step B: Robust Payload Sanitization (Handles Schema Mismatches)
      const stripInvalidColumns = (payload: any, errorMessage: string) => {
        const cleanPayload = { ...payload };
        // Detect missing column from error message like: Could not find the 'avatar_url' column
        const columnMatch = errorMessage.match(/column "(.*)"/i) || errorMessage.match(/column '(.*)'/i);
        if (columnMatch) {
          const col = columnMatch[1];
          console.warn(`Nexus Identity: Schema mismatch detected. Removing column: ${col}`);
          delete cleanPayload[col];
          return cleanPayload;
        }
        
        // If it's a generic error about firebase_uid
        if (errorMessage.includes('firebase_uid')) {
          delete cleanPayload['firebase_uid'];
        }

        // General fallback: remove common non-essential columns if generic error
        if (errorMessage.includes('cache') || errorMessage.includes('column')) {
           const nonEssential = ['avatar_url', 'fullname', 'last_login', 'kyc_status', 'updated_at', 'firebase_uid'];
           nonEssential.forEach(col => delete cleanPayload[col]);
        }
        return cleanPayload;
      };

      if (existingUser) {
        // Prepare update payload
        let updatePayload = { 
           fullname: profilePayload.fullname,
           avatar_url: profilePayload.avatar_url,
           last_login: profilePayload.last_login,
           updated_at: profilePayload.updated_at
        } as any;

        // Only add firebase_uid if we think the column exists
        if (hasFirebaseUidCol && !existingUser.firebase_uid) {
           updatePayload.firebase_uid = firebaseUser.uid;
        }

        const { data: updated, error: linkError } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', existingUser.id)
          .select()
          .single();
        
        if (linkError) {
          console.warn("Nexus Identity: Update failed, retrying sanitized.");
          const sanitized = stripInvalidColumns(updatePayload, linkError.message);
          const { data: retryData } = await supabase.from('users').update(sanitized).eq('id', existingUser.id).select().single();
          resultData = retryData;
        } else {
          resultData = updated;
        }
      } else {
        // New user entirely
        let insertPayload = { ...profilePayload };
        if (!hasFirebaseUidCol) delete (insertPayload as any).firebase_uid;

        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert(insertPayload)
          .select()
          .single();
        
        if (insertError) {
          console.warn("Nexus Identity: Insert failed, retrying sanitized.");
          const sanitized = stripInvalidColumns(insertPayload, insertError.message);
          const { data: retryData, error: retryError } = await supabase.from('users').insert(sanitized).select().single();
          if (retryError) console.error("Supabase definitive insert error:", retryError.message);
          resultData = retryData;
        } else {
          resultData = inserted;
        }
      }

      if (resultData) {
        console.log("Nexus Identity: Successfully synced as", resultData.id);
        return {
          id: resultData.id,
          firebase_uid: resultData.firebase_uid,
          email: resultData.email,
          fullName: resultData.fullname,
          photoURL: resultData.avatar_url,
          lastLogin: resultData.last_login
        };
      }
    } catch (err) {
      console.error("Fatal Supabase sync error:", err);
    }
  }

  // 2. FIRESTORE FALLBACK (UX Reliability)
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userData = {
      uid: firebaseUser.uid,
      email: cleanEmail,
      displayName: profilePayload.fullname,
      photoURL: profilePayload.avatar_url,
      lastLogin: serverTimestamp(),
      syncStatus: 'active'
    };
    await setDoc(userRef, userData, { merge: true });

    // Also index by email for HR modules that lookup by email
    await setDoc(doc(db, 'users', cleanEmail), userData, { merge: true });

    return {
      id: firebaseUser.uid,
      firebase_uid: firebaseUser.uid,
      email: cleanEmail,
      fullName: profilePayload.fullname,
      photoURL: profilePayload.avatar_url
    };
  } catch (err) {
    return null;
  }
}

/**
 * Normalizes a phone number to standard format, defaults to Cameroon +237
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `+237${digits}`;
  if (digits.startsWith('237') && digits.length === 12) return `+${digits}`;
  return phone;
}
