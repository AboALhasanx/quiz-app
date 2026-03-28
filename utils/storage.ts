import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  syncResultToFirestore,
  syncBookmarkToFirestore,
  deleteBookmarkFromFirestore,
} from "./firebase";

export type Language = "ar" | "en";
// questionId -> original option index from the source JSON, never the shuffled display position
export type AnswerMap = Record<string, number>;

export type QuizResult = {
  id: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  mode: string;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  percentage: number;
  date: string;
};

export type Bookmark = {
  questionId: string;
  subjectId: string;
  savedAt: string;
};

export type CompletionEntry = {
  completed: true;
  completedAt: string;
};

export type SyncQueueItem =
  | {
      type: "result";
      action: "save";
      payload: QuizResult;
      timestamp: number;
    }
  | {
      type: "result";
      action: "delete";
      payload: { id: string };
      timestamp: number;
    }
  | {
      type: "bookmark";
      action: "save";
      payload: Bookmark;
      timestamp: number;
    }
  | {
      type: "bookmark";
      action: "delete";
      payload: { questionId: string };
      timestamp: number;
    };

export type QuizSession = {
  subjectId: string;
  chapterId: string;
  topicId: string;
  mode: string;
  hardMode: string;
  order: string;
  percentage: number;
  lang: Language;
  questionIds: string[];
  answers: AnswerMap;
  current: number;
  timeLeft: number | null;
  savedAt: string;
};

const KEYS = {
  results: "quiz_results",
  bookmarks: "quiz_bookmarks",
  topicCompletions: "topicCompletions",
  chapterCompletions: "chapterCompletions",
  subjectCompletions: "subjectCompletions",
  syncQueue: "sync_queue",
} as const;

const SESSION_KEY = "quiz_session";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`readJson error for ${key}:`, error);
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`writeJson error for ${key}:`, error);
  }
}

export async function saveResult(result: Omit<QuizResult, "id" | "date">): Promise<void> {
  try {
    const existing = await getResults();
    const newResult: QuizResult = {
      ...result,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    const updated = [newResult, ...existing].slice(0, 200);
    await writeJson(KEYS.results, updated);
    await syncResultToFirestore(newResult);
  } catch (error) {
    console.error("saveResult error:", error);
  }
}

export async function getResults(): Promise<QuizResult[]> {
  return readJson<QuizResult[]>(KEYS.results, []);
}

function sortResultsDescending(results: QuizResult[]): QuizResult[] {
  return [...results].sort((first, second) => second.date.localeCompare(first.date));
}

async function getPendingDeleteIds(type: SyncQueueItem["type"]): Promise<Set<string>> {
  const queue = await getSyncQueue();
  const deleteOperations = queue.filter(
    (item) => item.type === type && item.action === "delete"
  );
  const ids =
    type === "result"
      ? deleteOperations.map((item) => (item.payload as { id: string }).id)
      : deleteOperations.map((item) => (item.payload as { questionId: string }).questionId);

  return new Set(ids);
}

export async function mergeResultsFromRemote(remoteResults: QuizResult[]): Promise<QuizResult[]> {
  const localResults = await getResults();
  const pendingDeleted = await getPendingDeleteIds("result");
  const mergedMap = new Map<string, QuizResult>();

  remoteResults.forEach((result) => {
    if (!pendingDeleted.has(result.id)) {
      mergedMap.set(result.id, result);
    }
  });

  localResults.forEach((result) => {
    if (!pendingDeleted.has(result.id)) {
      mergedMap.set(result.id, result);
    }
  });

  const merged = sortResultsDescending(Array.from(mergedMap.values())).slice(0, 200);
  await writeJson(KEYS.results, merged);
  return merged;
}

export async function clearResults(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.results);
  } catch (error) {
    console.error("clearResults error:", error);
  }
}

export async function removeResult(resultId: string): Promise<void> {
  try {
    const existing = await getResults();
    const updated = existing.filter((result) => result.id !== resultId);
    await writeJson(KEYS.results, updated);
  } catch (error) {
    console.error("removeResult error:", error);
  }
}

export async function getBookmarks(): Promise<Bookmark[]> {
  return readJson<Bookmark[]>(KEYS.bookmarks, []);
}

export async function mergeBookmarksFromRemote(remoteBookmarks: Bookmark[]): Promise<Bookmark[]> {
  const localBookmarks = await getBookmarks();
  const pendingDeleted = await getPendingDeleteIds("bookmark");
  const merged = [...localBookmarks];
  const seen = new Set(localBookmarks.map((bookmark) => bookmark.questionId));

  remoteBookmarks.forEach((bookmark) => {
    if (!seen.has(bookmark.questionId) && !pendingDeleted.has(bookmark.questionId)) {
      merged.push(bookmark);
    }
  });

  await writeJson(KEYS.bookmarks, merged);
  return merged;
}

export async function saveBookmark(questionId: string, subjectId: string): Promise<void> {
  try {
    const existing = await getBookmarks();
    if (existing.some((bookmark) => bookmark.questionId === questionId)) return;

    const newBookmark: Bookmark = {
      questionId,
      subjectId,
      savedAt: new Date().toISOString(),
    };

    const updated = [...existing, newBookmark];
    await writeJson(KEYS.bookmarks, updated);
    await syncBookmarkToFirestore(newBookmark);
  } catch (error) {
    console.error("saveBookmark error:", error);
  }
}

export async function removeBookmark(questionId: string): Promise<void> {
  try {
    const existing = await getBookmarks();
    const updated = existing.filter((bookmark) => bookmark.questionId !== questionId);
    await writeJson(KEYS.bookmarks, updated);
    await deleteBookmarkFromFirestore(questionId);
  } catch (error) {
    console.error("removeBookmark error:", error);
  }
}

export async function isBookmarked(questionId: string): Promise<boolean> {
  try {
    const existing = await getBookmarks();
    return existing.some((bookmark) => bookmark.questionId === questionId);
  } catch {
    return false;
  }
}

export async function clearBookmarks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.bookmarks);
  } catch (error) {
    console.error("clearBookmarks error:", error);
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
  return readJson<Record<string, CompletionEntry>>(storageKey, {});
}

async function saveCompletionMap(
  storageKey: string,
  value: Record<string, CompletionEntry>
): Promise<void> {
  await writeJson(storageKey, value);
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
  await markCompletion(
    KEYS.topicCompletions,
    getTopicCompletionStorageKey(subjectId, chapterId, topicId)
  );
}

export async function markChapterCompletion(
  subjectId: string,
  chapterId: string
): Promise<void> {
  if (!subjectId || !chapterId) return;
  await markCompletion(
    KEYS.chapterCompletions,
    getChapterCompletionStorageKey(subjectId, chapterId)
  );
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

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return readJson<SyncQueueItem[]>(KEYS.syncQueue, []);
}

export async function setSyncQueue(queue: SyncQueueItem[]): Promise<void> {
  await writeJson(KEYS.syncQueue, queue);
}

export async function enqueueSyncOperation(item: SyncQueueItem): Promise<void> {
  const queue = await getSyncQueue();
  queue.push(item);
  await setSyncQueue(queue);
}

export async function saveSession(session: QuizSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("saveSession error:", error);
  }
}

export async function getSession(): Promise<QuizSession | null> {
  return readJson<QuizSession | null>(SESSION_KEY, null);
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("clearSession error:", error);
  }
}
