import Constants from 'expo-constants';
import { getApp } from '@react-native-firebase/app';
import {
  createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword,
  signOut, updateProfile,
} from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import type { AuthBackend, AuthUser } from './types';

/**
 * Firebase, as in the Motion app (same project, fitness-52d79, so one account works in both).
 * Only active when this build has google-services.json for this app (see app.config.js).
 */

let ready: boolean | null = null;
function isReady() {
  if (ready !== null) return ready;
  try {
    ready = !!Constants.expoConfig?.extra?.firebase && !!getApp();
  } catch {
    ready = false; // no Firebase app in this build
  }
  return ready;
}
const auth = () => getAuth(getApp());
const saveDoc = (uid: string) => doc(getFirestore(getApp()), 'users', uid);
const toUser = (u: { uid: string; email: string | null; displayName: string | null }): AuthUser => ({ uid: u.uid, email: u.email ?? '', name: u.displayName });

export const backend: AuthBackend = {
  available: isReady,
  onChange(cb) {
    if (!isReady()) return () => {};
    return onAuthStateChanged(auth(), (u) => cb(u ? toUser(u) : null));
  },
  async signUp(email, password, name) {
    const cred = await createUserWithEmailAndPassword(auth(), email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
  },
  async signIn(email, password) {
    await signInWithEmailAndPassword(auth(), email, password);
  },
  async signOut() {
    await signOut(auth());
  },
  async resetPassword(email) {
    await sendPasswordResetEmail(auth(), email);
  },
  async loadSave(uid) {
    const snap = await getDoc(saveDoc(uid));
    return snap.exists() ? (snap.data()?.spaceBolt ?? null) : null;
  },
  async writeSave(uid, save) {
    // merge: the users/{uid} document is shared with the Motion app's profile fields
    await setDoc(saveDoc(uid), { spaceBolt: save }, { merge: true });
  },
};
