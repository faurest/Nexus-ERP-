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

  const profilePayload = {
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email?.toLowerCase().trim() || '',
    fullname: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur Nexus',
    avatar_url: firebaseUser.photoURL || '',
    last_login: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. SUPABASE SYNC (Source of Truth for Identity)
  if (supabase) {
    try {
      // Step A: Attempt full sync
      const { data, error } = await supabase
        .from('users')
        .upsert(profilePayload, { onConflict: 'firebase_uid' })
        .select()
        .single();

      // Step B: Handle schema mismatches (e.g., missing avatar_url or fullname)
      if (error) {
        console.warn("Supabase sync issue, attempting limited fallback:", error.message);
        
        // Dynamic column stripping for common missing columns in older schemas
        if (error.message.includes('column') || error.code === 'PGRST204') {
           const commonMissingColumns = ['avatar_url', 'fullname', 'last_login', 'kyc_status', 'is_active'];
           let safePayload = { ...profilePayload } as any;
           
           // If error specifies a column, remove it. Otherwise try without non-essential ones
           const missingColMatch = error.message.match(/column "(.*)"/);
           if (missingColMatch) {
             delete safePayload[missingColMatch[1]];
           } else {
             commonMissingColumns.forEach(col => delete safePayload[col]);
           }

           const { data: retryData, error: retryError } = await supabase
             .from('users')
             .upsert(safePayload, { onConflict: 'firebase_uid' })
             .select()
             .single();
           
           if (retryData && !retryError) {
             return {
               id: retryData.id,
               firebase_uid: retryData.firebase_uid,
               email: retryData.email,
               fullName: retryData.fullname || profilePayload.fullname,
               photoURL: retryData.avatar_url || profilePayload.avatar_url,
               lastLogin: retryData.last_login || profilePayload.last_login
             };
           }
        }
        // If still failing, catch-all fallback to Firestore below
      }

      if (data && !error) {
        console.log("Nexus Identity: Authenticated as", data.id);
        return {
          id: data.id,
          firebase_uid: data.firebase_uid,
          email: data.email,
          fullName: data.fullname,
          photoURL: data.avatar_url,
          lastLogin: data.last_login
        };
      }
    } catch (err) {
      console.error("Fatal sync error:", err);
    }
  }

  // 2. FIRESTORE FALLBACK (UX Reliability)
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: profilePayload.email,
      displayName: profilePayload.fullname,
      photoURL: profilePayload.avatar_url,
      lastLogin: serverTimestamp(),
      syncStatus: 'active'
    }, { merge: true });

    return {
      id: firebaseUser.uid, // Temporary fallback
      firebase_uid: firebaseUser.uid,
      email: profilePayload.email,
      fullName: profilePayload.fullname,
      photoURL: profilePayload.avatar_url
    };
  } catch (err) {
    return null;
  }
}
