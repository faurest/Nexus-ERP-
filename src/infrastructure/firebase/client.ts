import { auth, db } from '../../lib/firebase';

// Centralize firebase config
export const firebaseClient = {
  auth,
  db
};
