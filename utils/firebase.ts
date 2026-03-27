import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, getDocs,
  deleteDoc, orderBy, query,
} from "firebase/firestore";
import {
  initializeAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QuizResult, Bookmark } from "./storage";


const firebaseConfig = {
  apiKey:            "AIzaSyDOSRnQiJcfn78WKxEmzIV-Uz8y2DPRi_8",
  authDomain:        "quiz-d8afd.firebaseapp.com",
  projectId:         "quiz-d8afd",
  storageBucket:     "quiz-d8afd.firebasestorage.app",
  messagingSenderId: "410999962659",
  appId:             "1:410999962659:android:29722ece78ba44d6210596",
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);


// ✅ Custom persistence — يحفظ الجلسة في AsyncStorage
const asyncStoragePersistence = {
  type: "LOCAL" as const,
  async _isAvailable(): Promise<boolean> { return true; },
  async _set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async _get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async _remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
  _addListener(_key: string, _listener: unknown): void {},
  _removeListener(_key: string, _listener: unknown): void {},
};


// ✅ آمن لـ APK + Dev + Hot Reload
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, { persistence: asyncStoragePersistence as any });
} catch {
  auth = getAuth(app);
}


// ── Auth ──
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

export function getCurrentUser() {
  return auth.currentUser;
}


// ── Results ──
export async function syncResultToFirestore(result: QuizResult): Promise<void> {
  try {
    const uid = await ensureAuth();
    await setDoc(doc(db, "users", uid, "results", result.id), result);
  } catch (e) { console.error("syncResult error:", e); }
}

export async function fetchResultsFromFirestore(): Promise<QuizResult[]> {
  try {
    const uid  = await ensureAuth();
    const q    = query(collection(db, "users", uid, "results"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as QuizResult);
  } catch (e) { console.error("fetchResults error:", e); return []; }
}

export async function deleteResultFromFirestore(resultId: string): Promise<void> {
  try {
    const uid = await ensureAuth();
    await deleteDoc(doc(db, "users", uid, "results", resultId));
  } catch (e) { console.error("deleteResult error:", e); }
}


// ── Bookmarks ──
export async function syncBookmarkToFirestore(bookmark: Bookmark): Promise<void> {
  try {
    const uid = await ensureAuth();
    await setDoc(doc(db, "users", uid, "bookmarks", bookmark.questionId), bookmark);
  } catch (e) { console.error("syncBookmark error:", e); }
}

export async function deleteBookmarkFromFirestore(questionId: string): Promise<void> {
  try {
    const uid = await ensureAuth();
    await deleteDoc(doc(db, "users", uid, "bookmarks", questionId));
  } catch (e) { console.error("deleteBookmark error:", e); }
}

export async function fetchBookmarksFromFirestore(): Promise<Bookmark[]> {
  try {
    const uid  = await ensureAuth();
    const snap = await getDocs(collection(db, "users", uid, "bookmarks"));
    return snap.docs.map(d => d.data() as Bookmark);
  } catch (e) { console.error("fetchBookmarks error:", e); return []; }
}
