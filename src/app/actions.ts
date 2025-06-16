
'use server';

import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

const SESSIONS_COLLECTION = 'userSessions';

// Helper to get user document reference
const getSessionDocRef = (sessionId: string) => {
  if (!sessionId) throw new Error("Session ID cannot be empty.");
  return doc(db, SESSIONS_COLLECTION, sessionId);
}

function ensureFirebaseIsConfigured() {
  if (!isFirebaseConfigured()) {
    const errorMessage = "Firebase is not configured on the server. Please update src/lib/firebase.ts with your project details. Credit system is disabled.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function initializeCreditsForSession(sessionId: string, initialCredits: number): Promise<number> {
  ensureFirebaseIsConfigured();
  try {
    const sessionDocRef = getSessionDocRef(sessionId);
    await setDoc(sessionDocRef, { credits: initialCredits, lastInitialized: new Date().toISOString() });
    return initialCredits;
  } catch (error) {
    console.error(`Error initializing credits for session ${sessionId}:`, error);
    throw new Error("Could not initialize credits.");
  }
}

export async function getCreditsForSession(sessionId: string): Promise<number | null> {
  ensureFirebaseIsConfigured();
  try {
    const sessionDocRef = getSessionDocRef(sessionId);
    const docSnap = await getDoc(sessionDocRef);
    if (docSnap.exists()) {
      return docSnap.data()?.credits as number;
    }
    return null; // Session not found or no credits field
  } catch (error) {
    console.error(`Error fetching credits for session ${sessionId}:`, error);
    // Don't throw, allow fallback in UI, or re-initialization
    return null; 
  }
}

export async function updateCreditsForSession(sessionId: string, newCredits: number): Promise<number> {
  ensureFirebaseIsConfigured();
  if (newCredits < 0) {
    throw new Error("Credits cannot be negative.");
  }
  try {
    const sessionDocRef = getSessionDocRef(sessionId);
    await updateDoc(sessionDocRef, { credits: newCredits, lastUpdated: new Date().toISOString() });
    return newCredits;
  } catch (error) {
    console.error(`Error updating credits for session ${sessionId}. Attempting to set if not exists.`, error);
    try {
        await setDoc(getSessionDocRef(sessionId), { credits: newCredits, lastUpdated: new Date().toISOString() }, { merge: true });
        return newCredits;
    } catch (setError) {
        console.error(`Failed to set credits for session ${sessionId} after update error:`, setError);
        throw new Error("Could not update or set credits.");
    }
  }
}
