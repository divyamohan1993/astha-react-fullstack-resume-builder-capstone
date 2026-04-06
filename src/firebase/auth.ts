import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { getAppAuth } from './config';

export async function signInAnon(): Promise<User> {
  const { user } = await signInAnonymously(getAppAuth());
  return user;
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(getAppAuth(), email, password);
  return user;
}

export async function registerEmail(email: string, password: string): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(getAppAuth(), email, password);
  return user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(getAppAuth());
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getAppAuth(), callback);
}

export function getCurrentUser(): User | null {
  return getAppAuth().currentUser;
}
