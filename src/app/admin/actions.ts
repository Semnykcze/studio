
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, startAfter, DocumentSnapshot, where } from 'firebase/firestore';

const SESSIONS_COLLECTION = 'userSessions';

// Helper to get user document reference
const getSessionDocRef = (sessionId: string) => {
  if (!sessionId) throw new Error("Session ID cannot be empty.");
  return doc(db, SESSIONS_COLLECTION, sessionId);
}

export interface UserSessionData {
  id: string;
  credits: number;
  lastInitialized?: string;
  lastUpdated?: string;
  // Add other fields if stored, e.g., firstSeen
}

export async function getUserSessions(
    itemsPerPage: number = 10, 
    lastVisibleDoc?: UserSessionData // Pass the whole object to reconstruct snapshot if needed
): Promise<{ sessions: UserSessionData[], newLastVisibleDoc?: UserSessionData | null }> {
  try {
    const sessionsCollectionRef = collection(db, SESSIONS_COLLECTION);
    let q = query(sessionsCollectionRef, orderBy('lastUpdated', 'desc'), limit(itemsPerPage));

    if (lastVisibleDoc?.id) {
      // To use startAfter, we need the actual DocumentSnapshot.
      // A common workaround if you only have the ID is to fetch that one doc first.
      // Or, if you stored a specific field like 'lastUpdated' timestamp accurately, you could query based on that.
      // For simplicity here, if lastVisibleDoc.id is provided, we fetch it to get the snapshot.
      // This is not the most performant for very large datasets but works for moderate amounts.
      const lastDocSnap = await getDoc(doc(db, SESSIONS_COLLECTION, lastVisibleDoc.id));
      if(lastDocSnap.exists()) {
        q = query(sessionsCollectionRef, orderBy('lastUpdated', 'desc'), startAfter(lastDocSnap), limit(itemsPerPage));
      }
    }
    
    const querySnapshot = await getDocs(q);
    const sessions: UserSessionData[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      sessions.push({
        id: docSnap.id,
        credits: data.credits as number,
        lastInitialized: data.lastInitialized as string | undefined,
        lastUpdated: data.lastUpdated as string | undefined,
      });
    });

    let newLastVisible: UserSessionData | null = null;
    if (querySnapshot.docs.length > 0) {
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      const lastData = lastDoc.data();
      newLastVisible = {
        id: lastDoc.id,
        credits: lastData.credits,
        lastInitialized: lastData.lastInitialized,
        lastUpdated: lastData.lastUpdated
      };
    }
    
    return { sessions, newLastVisibleDoc: newLastVisible };

  } catch (error) {
    console.error("Error fetching user sessions:", error);
    throw new Error("Could not fetch user sessions.");
  }
}


export async function adminUpdateUserCredits(sessionId: string, newCredits: number): Promise<number> {
  if (newCredits < 0) {
    throw new Error("Credits cannot be negative.");
  }
  try {
    const sessionDocRef = getSessionDocRef(sessionId);
    const docSnap = await getDoc(sessionDocRef);

    if (docSnap.exists()) {
      await updateDoc(sessionDocRef, { credits: newCredits, lastUpdatedByAdmin: new Date().toISOString() });
    } else {
      // If session doesn't exist, admin might be creating/setting it.
      await setDoc(sessionDocRef, { credits: newCredits, lastUpdatedByAdmin: new Date().toISOString(), createdByAdmin: new Date().toISOString() });
    }
    return newCredits;
  } catch (error) {
    console.error(`Error updating credits by admin for session ${sessionId}:`, error);
    throw new Error("Could not update credits by admin.");
  }
}

export async function searchUserSessionById(sessionId: string): Promise<UserSessionData | null> {
  if(!sessionId) return null;
  try {
    const sessionDocRef = getSessionDocRef(sessionId);
    const docSnap = await getDoc(sessionDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        credits: data.credits as number,
        lastInitialized: data.lastInitialized as string | undefined,
        lastUpdated: data.lastUpdated as string | undefined,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error searching session ${sessionId}:`, error);
    return null;
  }
}
