import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  Persistence,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import {
  Bookmark,
  QuizResult,
  SyncQueueItem,
  enqueueSyncOperation,
  getSyncQueue,
  setSyncQueue,
} from "./storage";

const authPersistenceModule = require("firebase/auth") as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

const { getReactNativePersistence } = authPersistenceModule;

const firebaseConfig = {
  apiKey: "AIzaSyDOSRnQiJcfn78WKxEmzIV-Uz8y2DPRi_8",
  authDomain: "quiz-d8afd.firebaseapp.com",
  projectId: "quiz-d8afd",
  storageBucket: "quiz-d8afd.firebasestorage.app",
  messagingSenderId: "410999962659",
  appId: "1:410999962659:android:29722ece78ba44d6210596",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

let isFlushingQueue = false;

export function isSyncQueueFlushing() {
  return isFlushingQueue;
}

export async function ensureAuth(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  throw new Error("NOT_LOGGED_IN");
}

export async function loginUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function registerUser(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

async function performResultSave(result: QuizResult): Promise<void> {
  const uid = await ensureAuth();
  await setDoc(doc(db, "users", uid, "results", result.id), result);
}

async function performResultDelete(resultId: string): Promise<void> {
  const uid = await ensureAuth();
  await deleteDoc(doc(db, "users", uid, "results", resultId));
}

async function performBookmarkSave(bookmark: Bookmark): Promise<void> {
  const uid = await ensureAuth();
  await setDoc(doc(db, "users", uid, "bookmarks", bookmark.questionId), bookmark);
}

async function performBookmarkDelete(questionId: string): Promise<void> {
  const uid = await ensureAuth();
  await deleteDoc(doc(db, "users", uid, "bookmarks", questionId));
}

async function queueSyncOperation(item: SyncQueueItem): Promise<void> {
  await enqueueSyncOperation(item);
}

export async function flushSyncQueue(): Promise<void> {
  if (isFlushingQueue) return;

  isFlushingQueue = true;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    const remaining: SyncQueueItem[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];

      try {
        if (item.type === "result" && item.action === "save") {
          await performResultSave(item.payload);
          continue;
        }

        if (item.type === "result" && item.action === "delete") {
          await performResultDelete(item.payload.id);
          continue;
        }

        if (item.type === "bookmark" && item.action === "save") {
          await performBookmarkSave(item.payload);
          continue;
        }

        if (item.type === "bookmark" && item.action === "delete") {
          await performBookmarkDelete(item.payload.questionId);
        }
      } catch (error) {
        console.error("flushSyncQueue item error:", error);
        remaining.push(...queue.slice(index));
        break;
      }
    }

    await setSyncQueue(remaining);
  } finally {
    isFlushingQueue = false;
  }
}

export async function syncResultToFirestore(result: QuizResult): Promise<void> {
  try {
    await performResultSave(result);
    await flushSyncQueue();
  } catch (error) {
    console.error("syncResult error:", error);
    await queueSyncOperation({
      type: "result",
      action: "save",
      payload: result,
      timestamp: Date.now(),
    });
  }
}

export async function fetchResultsFromFirestore(): Promise<QuizResult[]> {
  try {
    const uid = await ensureAuth();
    const resultQuery = query(
      collection(db, "users", uid, "results"),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(resultQuery);
    return snapshot.docs.map((docSnap) => docSnap.data() as QuizResult);
  } catch (error) {
    console.error("fetchResults error:", error);
    return [];
  }
}

export async function deleteResultFromFirestore(resultId: string): Promise<void> {
  try {
    await performResultDelete(resultId);
    await flushSyncQueue();
  } catch (error) {
    console.error("deleteResult error:", error);
    await queueSyncOperation({
      type: "result",
      action: "delete",
      payload: { id: resultId },
      timestamp: Date.now(),
    });
  }
}

export async function syncBookmarkToFirestore(bookmark: Bookmark): Promise<void> {
  try {
    await performBookmarkSave(bookmark);
    await flushSyncQueue();
  } catch (error) {
    console.error("syncBookmark error:", error);
    await queueSyncOperation({
      type: "bookmark",
      action: "save",
      payload: bookmark,
      timestamp: Date.now(),
    });
  }
}

export async function deleteBookmarkFromFirestore(questionId: string): Promise<void> {
  try {
    await performBookmarkDelete(questionId);
    await flushSyncQueue();
  } catch (error) {
    console.error("deleteBookmark error:", error);
    await queueSyncOperation({
      type: "bookmark",
      action: "delete",
      payload: { questionId },
      timestamp: Date.now(),
    });
  }
}

export async function fetchBookmarksFromFirestore(): Promise<Bookmark[]> {
  try {
    const uid = await ensureAuth();
    const snapshot = await getDocs(collection(db, "users", uid, "bookmarks"));
    return snapshot.docs.map((docSnap) => docSnap.data() as Bookmark);
  } catch (error) {
    console.error("fetchBookmarks error:", error);
    return [];
  }
}
