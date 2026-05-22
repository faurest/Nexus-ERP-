import { auth, loginWithGoogle, logout as firebaseLogout, onAuthStateChanged } from '../../lib/firebase';
import { getSupabase } from '../../lib/supabase';

export const authApi = {
  login: () => loginWithGoogle(),
  logout: () => firebaseLogout(),
  onAuthStateChanged: (callback: (user: any) => void) => onAuthStateChanged(auth, callback),

  async fetchProfile(email: string, firebaseUid: string) {
    const sb = getSupabase();
    if (!sb) return null;

    let { data: profile } = await sb.from('users').select('*').eq('email', email).maybeSingle();

    if (profile) {
      await sb.from('users').update({ firebase_uid: firebaseUid }).eq('id', profile.id);
    } else {
      const { data: newProfile, error } = await sb.from('users').insert({
        email,
        firebase_uid: firebaseUid,
        fullname: email.split('@')[0],
        is_active: true
      }).select('*').single();
      if (!error) profile = newProfile;
    }
    return profile;
  }
};
