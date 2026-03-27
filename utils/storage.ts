import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncResultToFirestore, syncBookmarkToFirestore, deleteBookmarkFromFirestore } from "./firebase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type QuizResult = {
  id:         string;
  subjectId:  string;
  chapterId:  string;
  topicId:    string;
  mode:       string;
  correct:    number;
  wrong:      number;
  skipped:    number;
  total:      number;
  percentage: number;
  date:       string;
};

export type Bookmark = {
  questionId: string;
  subjectId:  string;
  savedAt:    string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Keys
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const KEYS = {
  results:   "quiz_results",
  bookmarks: "quiz_bookmarks",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Results
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveResult(result: Omit<QuizResult, "id" | "date">): Promise<void> {
  try {
    const existing = await getResults();
    const newResult: QuizResult = {
      ...result,
      id:   Date.now().toString(),
      date: new Date().toISOString(),
    };
    const updated = [newResult, ...existing].slice(0, 200);
    await AsyncStorage.setItem(KEYS.results, JSON.stringify(updated));
    await syncResultToFirestore(newResult); // ✅ سنك مع Firebase
  } catch (e) {
    console.error("saveResult error:", e);
  }
}

export async function getResults(): Promise<QuizResult[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.results);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getResults error:", e);
    return [];
  }
}

export async function clearResults(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.results);
  } catch (e) {
    console.error("clearResults error:", e);
  }
}

export async function removeResult(resultId: string): Promise<void> {
  try {
    const existing = await getResults();
    const updated = existing.filter(result => result.id !== resultId);
    await AsyncStorage.setItem(KEYS.results, JSON.stringify(updated));
  } catch (e) {
    console.error("removeResult error:", e);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Bookmarks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.bookmarks);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getBookmarks error:", e);
    return [];
  }
}

export async function saveBookmark(questionId: string, subjectId: string): Promise<void> {
  try {
    const existing = await getBookmarks();
    const already  = existing.find(b => b.questionId === questionId);
    if (already) return;
    const newBookmark: Bookmark = {
      questionId,
      subjectId,
      savedAt: new Date().toISOString(),
    };
    const updated = [...existing, newBookmark];
    await AsyncStorage.setItem(KEYS.bookmarks, JSON.stringify(updated));
    await syncBookmarkToFirestore(newBookmark); // ✅ سنك مع Firebase
  } catch (e) {
    console.error("saveBookmark error:", e);
  }
}

export async function removeBookmark(questionId: string): Promise<void> {
  try {
    const existing = await getBookmarks();
    const updated  = existing.filter(b => b.questionId !== questionId);
    await AsyncStorage.setItem(KEYS.bookmarks, JSON.stringify(updated));
    await deleteBookmarkFromFirestore(questionId); // ✅ احذف من Firebase
  } catch (e) {
    console.error("removeBookmark error:", e);
  }
}

export async function isBookmarked(questionId: string): Promise<boolean> {
  try {
    const existing = await getBookmarks();
    return existing.some(b => b.questionId === questionId);
  } catch (e) {
    return false;
  }
}

export async function clearBookmarks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.bookmarks);
  } catch (e) {
    console.error("clearBookmarks error:", e);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Quiz Session (Resume)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type QuizSession = {
  subjectId:   string;
  chapterId:   string;
  topicId:     string;
  mode:        string;
  hardMode:    string;
  order:       string;
  percentage:  number;
  questionIds: string[];
  answers:     Record<string, string>;
  current:     number;
  timeLeft:    number | null;
  savedAt:     string;
};

const SESSION_KEY = "quiz_session";

export async function saveSession(session: QuizSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("saveSession error:", e);
  }
}

export async function getSession(): Promise<QuizSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error("clearSession error:", e);
  }
}
