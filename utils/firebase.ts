import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, getDocs,
  deleteDoc, orderBy, query,
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "firebase/auth";
import { QuizResult, Bookmark } from "./storage";

const firebaseConfig = {
  apiKey:            "AIzaSyDOSRnQiJcfn78WKxEmzIV-Uz8y2DPRi_8",
  authDomain:        "quiz-d8afd.firebaseapp.com",
  projectId:         "quiz-d8afd",
  storageBucket:     "quiz-d8afd.firebasestorage.app",
  messagingSenderId: "410999962659",
  appId:             "1:410999962659:android:29722ece78ba44d6210596",
};

const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db   = getFirestore(app);
const auth = getAuth(app);

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

// جيب تاريخ الإجابات لكل سؤال
export async function fetchQuestionHistory(subjectId: string): Promise<Record<string, "correct"|"wrong">> {
  try {
    const uid  = await ensureAuth();
    const snap = await getDocs(collection(db, "users", uid, "questionHistory"));
    const result: Record<string, "correct"|"wrong"> = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.subjectId === subjectId) result[d.id] = data.status;
    });
    return result;
  } catch (e) { return {}; }
}



export async function saveQuestionHistory(
  subjectId: string,
  questionId: string,
  status: "correct" | "wrong"
): Promise<void> {
  try {
    const uid = await ensureAuth();
    await setDoc(doc(db, "users", uid, "questionHistory", questionId), { subjectId, status });
    console.log("✅ saved:", questionId, status); // ← أضف هذا
  } catch (e) { 
    console.error("❌ saveQuestionHistory error:", e); // ← وهذا
  }
}

// حساب تقدم المادة الحقيقي
export async function fetchSubjectProgress(
  subjectId: string,
  subject: any
): Promise<{
  topicsDone:    Record<string, boolean>;
  chaptersDone:  Record<string, boolean>;
  totalProgress: number;
}> {
  try {
    const uid  = await ensureAuth();
    const snap = await getDocs(collection(db, "users", uid, "questionHistory"));

    const history: Record<string, "correct" | "wrong"> = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.subjectId === subjectId) history[d.id] = data.status;
    });

    const topicsDone:   Record<string, boolean> = {};
    const chaptersDone: Record<string, boolean> = {};

    for (const ch of subject.chapters) {
      let chapterComplete = true;
      for (const topic of ch.topics) {
        const allCorrect = topic.questions.every(
          (q: any) => history[q.id] === "correct"
        );
        topicsDone[topic.id] = allCorrect;
        if (!allCorrect) chapterComplete = false;
      }
      chaptersDone[ch.id] = chapterComplete;
    }

    const totalChapters = subject.chapters.length;
    const doneChapters  = Object.values(chaptersDone).filter(Boolean).length;
    const totalProgress = totalChapters > 0
      ? Math.round((doneChapters / totalChapters) * 100) : 0;

    return { topicsDone, chaptersDone, totalProgress };
  } catch (e) {
    return { topicsDone: {}, chaptersDone: {}, totalProgress: 0 };
  }
}

// Reset تاريخ الأسئلة لفصل معين
export async function resetChapterHistory(
  subjectId: string,
  chapterId: string,
  subject: any
): Promise<void> {
  try {
    const uid     = await ensureAuth();
    const chapter = subject.chapters.find((c: any) => c.id === chapterId);
    if (!chapter) return;

    const questionIds: string[] = [];
    chapter.topics.forEach((t: any) =>
      t.questions.forEach((q: any) => questionIds.push(q.id))
    );

    await Promise.all(
      questionIds.map(qid =>
        deleteDoc(doc(db, "users", uid, "questionHistory", qid))
      )
    );
  } catch (e) { console.error("resetChapterHistory error:", e); }
}
