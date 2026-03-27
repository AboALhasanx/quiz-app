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

export type CompletionEntry = {
  completed: true;
  completedAt: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Keys
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const KEYS = {
  results:   "quiz_results",
  bookmarks: "quiz_bookmarks",
  topicCompletions:   "topicCompletions",
  chapterCompletions: "chapterCompletions",
  subjectCompletions: "subjectCompletions",
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

function getTopicCompletionStorageKey(subjectId: string, chapterId: string, topicId: string) {
  return `${subjectId}:${chapterId}:${topicId}`;
}

function getChapterCompletionStorageKey(subjectId: string, chapterId: string) {
  return `${subjectId}:${chapterId}`;
}

function getSubjectCompletionStorageKey(subjectId: string) {
  return subjectId;
}

async function getCompletionMap(
  storageKey: string
): Promise<Record<string, CompletionEntry>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("getCompletionMap error:", e);
    return {};
  }
}

async function saveCompletionMap(
  storageKey: string,
  value: Record<string, CompletionEntry>
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(value));
  } catch (e) {
    console.error("saveCompletionMap error:", e);
  }
}

async function markCompletion(storageKey: string, key: string): Promise<void> {
  const completions = await getCompletionMap(storageKey);
  if (completions[key]?.completed) return;

  completions[key] = {
    completed: true,
    completedAt: new Date().toISOString(),
  };

  await saveCompletionMap(storageKey, completions);
}

export async function getTopicCompletions(): Promise<Record<string, CompletionEntry>> {
  return getCompletionMap(KEYS.topicCompletions);
}

export async function getChapterCompletions(): Promise<Record<string, CompletionEntry>> {
  return getCompletionMap(KEYS.chapterCompletions);
}

export async function getSubjectCompletions(): Promise<Record<string, CompletionEntry>> {
  return getCompletionMap(KEYS.subjectCompletions);
}

export async function markTopicCompletion(
  subjectId: string,
  chapterId: string,
  topicId: string
): Promise<void> {
  if (!subjectId || !chapterId || !topicId) return;
  await markCompletion(KEYS.topicCompletions, getTopicCompletionStorageKey(subjectId, chapterId, topicId));
}

export async function markChapterCompletion(
  subjectId: string,
  chapterId: string
): Promise<void> {
  if (!subjectId || !chapterId) return;
  await markCompletion(KEYS.chapterCompletions, getChapterCompletionStorageKey(subjectId, chapterId));
}

export async function markSubjectCompletion(subjectId: string): Promise<void> {
  if (!subjectId) return;
  await markCompletion(KEYS.subjectCompletions, getSubjectCompletionStorageKey(subjectId));
}

export function buildTopicCompletionKey(subjectId: string, chapterId: string, topicId: string) {
  return getTopicCompletionStorageKey(subjectId, chapterId, topicId);
}

export function buildChapterCompletionKey(subjectId: string, chapterId: string) {
  return getChapterCompletionStorageKey(subjectId, chapterId);
}

export function buildSubjectCompletionKey(subjectId: string) {
  return getSubjectCompletionStorageKey(subjectId);
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
