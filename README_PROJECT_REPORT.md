**Project Analysis Report**

**1) Project Overview**

- **What the app does:** A mobile quiz application (Arabic-first UI) that lets users browse subjects and chapters, run quizzes in two modes (paper & recitation), save bookmarks, view results/stats, and track completion per topic/chapter/subject.
- **Main features:**
  - **Quiz flows:** setup → play → result with session resume and hard-mode timing ([app/quiz/setup.tsx](app/quiz/setup.tsx), [app/quiz/play.tsx](app/quiz/play.tsx), [app/quiz/result.tsx](app/quiz/result.tsx)).
  - **Bookmarks:** save individual questions, view detail, remove, and clear all ([app/(tabs)/bookmarks.tsx](<app/(tabs)/bookmarks.tsx>), [app/bookmarks/[questionId].tsx](app/bookmarks/[questionId].tsx)).
  - **Stats / Results:** save quiz results locally and sync to Firestore; display/delete results ([app/(tabs)/stats.tsx](<app/(tabs)/stats.tsx>)).
  - **Completion tracking:** topic / chapter / subject completion recorded on perfect runs (100% of selected questions); visible on chapter/subject pages ([utils/storage.ts](utils/storage.ts), [app/chapter/[id].tsx](app/chapter/[id].tsx), [app/subject/[id].tsx](app/subject/[id].tsx)).
- **Technologies used:**
  - React Native with Expo + Expo Router (TSX files).
  - TypeScript/JSX (.tsx).
  - Local persistence: `@react-native-async-storage/async-storage` (via helpers in [utils/storage.ts](utils/storage.ts)).
  - Backend sync: Firebase Authentication + Firestore ([utils/firebase.ts](utils/firebase.ts)) for results & bookmarks sync.
  - UI helpers: `@expo/vector-icons`, Expo StatusBar.

**2) Project Structure**

- **app/** — main navigation and screens
  - `[... routing ]` managed in [app/\_layout.tsx](app/_layout.tsx) and tab layout [app/(tabs)/\_layout.tsx](<app/(tabs)/_layout.tsx>).
  - Key screens:
    - Home / subjects: [app/(tabs)/index.tsx](<app/(tabs)/index.tsx>)
    - Auth: [app/login.tsx](app/login.tsx)
    - Subject detail: [app/subject/[id].tsx](app/subject/[id].tsx)
    - Chapter: [app/chapter/[id].tsx](app/chapter/[id].tsx)
    - Quiz: setup/play/result: [app/quiz/setup.tsx](app/quiz/setup.tsx), [app/quiz/play.tsx](app/quiz/play.tsx), [app/quiz/result.tsx](app/quiz/result.tsx)
    - Bookmarks: [app/(tabs)/bookmarks.tsx](<app/(tabs)/bookmarks.tsx>) and detail [app/bookmarks/[questionId].tsx](app/bookmarks/[questionId].tsx)
    - Stats: [app/(tabs)/stats.tsx](<app/(tabs)/stats.tsx>)
- **utils/** — shared logic
  - [utils/storage.ts](utils/storage.ts): AsyncStorage keys and helpers for results, bookmarks, session, completion maps; includes local types and small key builders.
  - [utils/firebase.ts](utils/firebase.ts): Firebase init and wrappers for auth + Firestore sync (syncResultToFirestore, fetchResultsFromFirestore, syncBookmarkToFirestore, deleteBookmarkFromFirestore).
- **data/subjects/** — static content (question bank)
  - [data/subjects/index.json](data/subjects/index.json) lists subject metadata and maps to per-subject JSON files (e.g., [data/subjects/oop_data.json](data/subjects/oop_data.json)).
  - Each subject file contains chapters → topics → questions.

**3) Quiz Flow (Important)**

- **Flow overview:** `setup` → `play` → `result`.
  - `app/quiz/setup.tsx` builds a query string with: `scope`, `subjectId`, `chapterId`, `topicId`, `mode` (`paper|recitation`), `order` (`random|sequential`), `hardMode` (`0|1`), `percentage`, then navigates to `/quiz/play`.
  - `app/quiz/play.tsx` reads params via `useLocalSearchParams`, loads the matching subject data from the `SUBJECTS` map (built from `data/subjects/index.json` and per-file imports), collects questions from selected chapter/topic/scope, computes `selectedQuestionCount` (helper `getSelectedQuestionCount`), applies `order` and `shuffleOptions()`, and sets the `questions` state.
  - Answering & navigation:
    - `handleAnswer()` records the answer into an `answersRef`/`answers` state, and in `recitation` mode sets `revealed = true` to show immediate feedback.
    - `nextQuestion()` advances or calls `finishQuiz()`.
    - `finishQuiz()` clears session storage and navigates to `/quiz/result` with `answers` and `questionIds` encoded in URL params.
  - `app/quiz/result.tsx` reconstructs the question list from `questionIds`, compares stored answers against the authoritative `getQuestionOptions(q)[q.answer]`, counts correct/wrong/skipped, computes percentage and displays review info.
- **Session handling:** `app/quiz/play.tsx` uses `saveSession/getSession/clearSession` from [utils/storage.ts](utils/storage.ts) to persist quiz progress so users can resume.

**4) Question System**

- **Typical question object fields (from data):**
  - `id`: string (unique)
  - `text`: string (Arabic primary)
  - `text_en`: string (English fallback)
  - `options`: string[] (Arabic)
  - `options_en`: string[] (English)
  - `answer`: number (index into options)
  - `explanation`: string (Arabic)
  - `explanation_en`: string (English)
  - Example: see [data/subjects/oop_data.json](data/subjects/oop_data.json)
- **Which field is used at runtime:**
  - Helpers like `getQuestionText()` and `getQuestionOptions()` choose `question.text ?? question.text_en` and `question.options ?? question.options_en` respectively. These helpers appear in multiple files: [app/quiz/play.tsx](app/quiz/play.tsx), [app/quiz/result.tsx](app/quiz/result.tsx), [app/bookmarks/[questionId].tsx](app/bookmarks/[questionId].tsx), and [app/(tabs)/bookmarks.tsx](<app/(tabs)/bookmarks.tsx>).
  - `shuffleOptions()` in `play.tsx` builds a shuffled `options` array and attaches `correctText` (the correct option text after shuffling) to the question object used for runtime comparison in recitation mode.

**5) Recitation vs Paper Mode**

- **Recitation mode (immediate feedback):**
  - `mode === "recitation"` passed from setup becomes `mode` in `play.tsx`.
  - `handleAnswer()` sets the answer, then `if (mode === "recitation") setRevealed(true)`.
  - When `revealed` is true, the UI renders a feedback block (see the `mode === "recitation" && revealed` JSX in [app/quiz/play.tsx](app/quiz/play.tsx)) that shows a correctness message and a Next button.
  - Option styling uses `q.correctText` and compares the chosen option text to `correctText` via `getOptionStyle()` / `getOptionTextStyle()` to color correct/incorrect choices.
- **Paper mode (end-of-quiz scoring):**
  - Users select answers freely; answers are stored in `answersRef` and styling indicates selected option but not correctness. After finishing the quiz, `result.tsx` does the correctness comparison and shows review details.
- **Where answer checking happens:**
  - Recitation: in `play.tsx` via `q.correctText` set in `shuffleOptions()` and checked in `getOptionStyle`/`getOptionTextStyle`.
  - Paper: in `result.tsx` where `correctText = getQuestionOptions(q)[q.answer]` and `ans === correctText` decides correctness.

**6) Result System**

- **How results are calculated:**
  - `result.tsx` reconstructs `questions` from the passed `questionIds`, iterates them, and compares `answers[q.id]` to `getQuestionOptions(q)[q.answer]`.
  - Counters: `correctCount`, `wrongCount`, `skippedCount`; `percentage = Math.round((correctCount/total)*100)`.
- **How stats are stored:**
  - `saveResult()` in [utils/storage.ts](utils/storage.ts) creates a `QuizResult` (id = timestamp string, date ISO) and saves an array under key `quiz_results`. It keeps at most 200 recent results.
  - `saveResult()` also calls `syncResultToFirestore(newResult)` to push the result to Firestore for the authenticated user.
- **Where saving happens:**
  - Local: AsyncStorage (`quiz_results`), via [utils/storage.ts](utils/storage.ts).
  - Remote: Firestore via [utils/firebase.ts](utils/firebase.ts) (functions: `syncResultToFirestore`, `fetchResultsFromFirestore`, `deleteResultFromFirestore`).

**7) Completion System (Important)**

- **When a topic/chapter/subject is marked complete:**
  - In [app/quiz/result.tsx](app/quiz/result.tsx) `useEffect` persists the result and then checks `isCompletion = selectedPercentage === 100 && total > 0 && correctCount === total`.
  - If `isCompletion` true, it marks the corresponding level depending on `scope`:
    - Topic scope: `markTopicCompletion(subjectId, chapterId, topicId)`
    - Chapter scope: `markChapterCompletion(subjectId, chapterId)`
    - Subject scope: `markSubjectCompletion(subjectId)`
- **Where completion data is stored:**
  - In AsyncStorage as maps under keys `topicCompletions`, `chapterCompletions`, `subjectCompletions` — see [utils/storage.ts](utils/storage.ts).
  - Each map stores entries keyed by `subjectId:chapterId:topicId` (topic), `subjectId:chapterId` (chapter), or `subjectId` (subject) with value `{ completed: true, completedAt: ISODate }`.
- **How progress is calculated in UI:**
  - `app/chapter/[id].tsx` calls `getTopicCompletions()` and counts completed topics per chapter using `buildTopicCompletionKey()`.
  - `app/subject/[id].tsx` calls `getChapterCompletions()` and counts completed chapters per subject using `buildChapterCompletionKey()`.

**8) Bookmarks System**

- **How questions are saved:**
  - `saveBookmark(questionId, subjectId)` in [utils/storage.ts](utils/storage.ts) appends a `Bookmark` entry to AsyncStorage under `quiz_bookmarks` and calls `syncBookmarkToFirestore(bookmark)`.
- **How they are retrieved:**
  - The bookmarks tab currently calls `fetchBookmarksFromFirestore()` (from [utils/firebase.ts](utils/firebase.ts)) to show bookmarks for an authenticated user. The local AsyncStorage copy is maintained but the UI relies on Firestore for the canonical list.
- **Details screen:**
  - [app/bookmarks/[questionId].tsx](app/bookmarks/[questionId].tsx) finds the question by iterating `SUBJECTS` to locate the `question` object, then displays text/options/correct answer and `explanation`.
- **Removing bookmarks:**
  - `removeBookmark(questionId)` removes the local copy and `deleteBookmarkFromFirestore(questionId)` removes the Firestore doc.

**9) Stats System**

- **What data is stored per result:** see `QuizResult` type in [utils/storage.ts](utils/storage.ts): `id, subjectId, chapterId, topicId, mode, correct, wrong, skipped, total, percentage, date`.
- **How results are displayed:**
  - [app/(tabs)/stats.tsx](<app/(tabs)/stats.tsx>) fetches from Firestore (`fetchResultsFromFirestore`) and shows totals, average percentage, best score, total questions, and a list of result cards.
- **How delete works:**
  - Single: `removeResult(resultId)` (local) + `deleteResultFromFirestore(resultId)` (remote).
  - All: `clearResults()` removes local key; the screen also enumerates Firestore docs and deletes them (using Firestore SDK calls).

**10) Key Extension Points (VERY IMPORTANT)**

- I list exact files and a minimal-change approach for each requested extension.

A) Show explanation immediately after answering (recitation mode)

- **Edit file:** [app/quiz/play.tsx](app/quiz/play.tsx)
- **Where to edit:**
  - Add a small helper near other helpers: `function getQuestionExplanation(question:any){ return question.explanation ?? question.explanation_en ?? ""; }`.
  - Locate the JSX block that renders recitation feedback (search for `mode === "recitation" && revealed` inside the render return). Insert a line to render the explanation text inside that block, e.g. `<Text style={s.explanationText}>{getQuestionExplanation(q) || "لا يوجد شرح."}</Text>`.
  - Add a style `explanationText` in the stylesheet at the bottom.
- **Minimal change:** 3–6 lines of JS + 1 style; no data model change. Safe because it only displays existing `explanation` fields.

B) Add expandable explanation in review screen

- **Edit file:** [app/quiz/result.tsx](app/quiz/result.tsx)
- **Where to edit:**
  - Add `function getQuestionExplanation(question:any){ return question.explanation ?? question.explanation_en ?? ""; }`.
  - Inside the `showReview && questions.map(...)` area, either:
    - Replace the inline mapping with a small internal component `ReviewItem` that uses `useState` to toggle `expanded` and renders the explanation when open, OR
    - Add a `TouchableOpacity`/button per review card that toggles a small `expanded` state kept in a `Map` in the parent (less ideal but minimal).
  - Add styling for the explanation block.
- **Minimal change:** Add <20–30 lines defining `ReviewItem` + replace the mapping call. No backend changes.

C) Add language toggle (text vs text_en)

- **Edit files (minimal to cover quiz flow):**
  - UI toggle: [app/quiz/setup.tsx](app/quiz/setup.tsx) — add `lang` state ("ar"|"en") and include it in the `router.push` search params.
  - Consumption: [app/quiz/play.tsx](app/quiz/play.tsx) and [app/quiz/result.tsx](app/quiz/result.tsx) — update `getQuestionText(question)` and `getQuestionOptions(question)` helpers to accept an optional `lang` parameter and prefer `text_en/options_en` when `lang === 'en'`.
  - Optionally propagate to bookmarks & review screens later: [app/bookmarks/[questionId].tsx](app/bookmarks/[questionId].tsx) and [app/(tabs)/bookmarks.tsx](<app/(tabs)/bookmarks.tsx>).
- **Minimal change:** Add `lang` param to the quiz navigation and change helper signatures to `getQuestionText(q, params.lang)`; this is localized to the quiz flow and avoids global refactors.

**11) Constraints**

- I avoided suggesting large refactors; all recommendations are small, localized edits.
- The analysis is based on the actual implementation (file-level reading) and uses the existing persistence and sync code paths.

---

File created: [README_PROJECT_REPORT.md](README_PROJECT_REPORT.md)

If you want, I can now apply any of the three minimal patches (A: recitation explanation, B: expandable review explanation, C: quiz language toggle). Which one should I implement first?
