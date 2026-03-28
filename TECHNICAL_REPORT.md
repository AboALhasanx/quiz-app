**Project Overview**

- **What the app does**: A bilingual (Arabic/English) mobile quiz app built with Expo Router that presents static question banks, supports timed quizzes, bookmarking, session resume, and syncing results/bookmarks to Firebase.
- **Main features**:
  - **Auth & user data**: login/register and per-user sync of results/bookmarks via Firebase ([utils/firebase.ts](utils/firebase.ts)).
  - **Static question banks**: local JSON under data/subjects (index.json + per-subject files like ai_data.json).
  - **Quiz modes**: paper (submit at end) and recitation (immediate feedback), hard mode timer, random/ordered question selection.
  - **Resume & persistence**: local session save/restore and completion tracking via AsyncStorage ([utils/storage.ts](utils/storage.ts)).
- **Tech stack**: Expo (React Native), TypeScript, Expo Router, Firebase (Auth + Firestore), AsyncStorage.

**Folder & File Structure (key items)**

- **app/**: route-driven screens.
  - **app/\_layout.tsx**: root layout + auth redirect and Stack screen definitions.
  - **app/(tabs)/\_layout.tsx**: tab navigator wrapper.
  - **app/(tabs)/index.tsx**: home / subject list.
  - **app/(tabs)/bookmarks.tsx** & **app/bookmarks/[questionId].tsx**: bookmarks UI and detail view.
  - **app/(tabs)/stats.tsx**: results / stats view.
  - **app/quiz/setup.tsx**, **app/quiz/play.tsx**, **app/quiz/result.tsx**: quiz configuration, runtime, and result/review.
  - **app/subject/[id].tsx**, **app/chapter/[id].tsx**: subject/chapter/topic browsing and start-quiz triggers.
- **data/subjects/**: static JSON subjects (see [data/subjects/index.json](data/subjects/index.json) and example [data/subjects/ai_data.json](data/subjects/ai_data.json)).
- **utils/**: helpers.
  - **utils/storage.ts**: authoritative local persistence keys, session handling, completion marking, and wrapper functions.
  - **utils/firebase.ts**: Firebase initialization and Firestore sync helpers.
  - **utils/ThemeContext.tsx**, **utils/theme.ts**, **utils/sounds.ts**: theme and audio utilities.

**Navigation & App Flow**

- **Auth gating**: root layout ([app/\_layout.tsx](app/_layout.tsx)) listens for auth and routes to either the app tabs or /login.
- **Primary flow**: Home -> Subject -> Chapter/Topic -> Quiz Setup -> Quiz Play -> Quiz Result; each step is a file-based route under app/ and navigated with Expo Router (screens push/replace with query params).
- **Screens that build & parse params**: setup constructs query params for /quiz/play (mode, order, percentage, hardMode, subjectId, chapterId, topicId); play and result parse those params to rehydrate state.

**Data Model & Source Files**

- **Question shape** (per-subject JSON): each question object includes the following fields: id, text, text_en, options (array), options_en (array), answer (index), explanation, explanation_en. See example: [data/subjects/ai_data.json](data/subjects/ai_data.json).
- **Subject index**: [data/subjects/index.json](data/subjects/index.json) maps subject ids to filenames used by the home screen.

**Quiz Mechanics**

- **Modes**: `paper` (collect answers → evaluate at finish) and `recite` (immediate correctness feedback and optional explanation display) — configured in [app/quiz/setup.tsx](app/quiz/setup.tsx).
- **Ordering**: random shuffle or sequential; `shuffleOptions` is used to randomize choices per question in [app/quiz/play.tsx](app/quiz/play.tsx).
- **Hard mode**: a global timer (minutes-per-question) computed when enabled; timeLeft is saved in session state and restored on resume.
- **Finish flow**: at the end of play the router navigates to /quiz/result with `answers`, `questionIds`, and other metadata; result screen computes correct/wrong/skipped, saves the result and may mark completions.

**Session Save & Resume**

- **Session key**: stored under `quiz_session` (SESSION_KEY) in AsyncStorage. See [utils/storage.ts](utils/storage.ts).
- **Saved data**: subjectId, chapterId, topicId, mode, hardMode, order, percentage, questionIds (array), answers (map questionId -> optionText), current index, timeLeft, savedAt.
- **Resume behavior**: play screen compares saved session params to current params and offers resume if compatible; session cleared on successful finish.

**Local Persistence (keys & behavior)**

- **Primary storage keys** (in utils/storage.ts):
  - **results**: `quiz_results` — array of QuizResult objects (trimmed to latest 200 entries).
  - **bookmarks**: `quiz_bookmarks` — array of Bookmark objects.
  - **topicCompletions**: `topicCompletions` — map of completed topics.
  - **chapterCompletions**: `chapterCompletions` — map of completed chapters.
  - **subjectCompletions**: `subjectCompletions` — map of completed subjects.
  - **session**: `quiz_session` — active session object.
- **APIs**: saveResult, getResults, saveBookmark, getBookmarks, markTopicCompletion, markChapterCompletion, markSubjectCompletion, saveSession, getSession, clearSession (all in [utils/storage.ts](utils/storage.ts)).

**Remote Sync (Firebase)**

- **Firebase entry point**: [utils/firebase.ts](utils/firebase.ts) — app initialization and wrappers.
- **Sync functions used by storage**: syncResultToFirestore, fetchResultsFromFirestore, deleteResultFromFirestore, syncBookmarkToFirestore, fetchBookmarksFromFirestore, deleteBookmarkFromFirestore. Storage calls syncResult and syncBookmark after local writes.
- **Auth requirement**: remote operations call ensureAuth (throws if not logged in) — the UI handles auth flows in [app/login.tsx](app/login.tsx).
- **Notes**: completion maps and session state are local-only and not synced to Firestore.

**Bookmarks**

- **Local + remote**: saving a bookmark updates AsyncStorage via saveBookmark and attempts to sync to Firestore via syncBookmarkToFirestore.
- **Bookmarks screen**: the tab view ([app/(tabs)/bookmarks.tsx](<app/(tabs)/bookmarks.tsx>)) fetches bookmarks from Firestore and displays them; individual bookmark detail is at [app/bookmarks/[questionId].tsx](app/bookmarks/[questionId].tsx).

**Results & Stats**

- **Result save**: result objects are created in [app/quiz/result.tsx](app/quiz/result.tsx) and persisted locally via `saveResult`; `saveResult` also calls syncResultToFirestore.
- **Stats tab**: [app/(tabs)/stats.tsx](<app/(tabs)/stats.tsx>) fetches results from Firestore for display and supports deleting single results or clearing all (local removal + remote deletes where applicable).

**Completion Tracking**

- **When a completion is marked**: completion marking occurs in result handling and uses the rules implemented in the app: a topic/chapter/subject is marked completed only when the selected percentage equals 100 and all selected questions are answered correctly. The completion functions are in [utils/storage.ts](utils/storage.ts): markTopicCompletion, markChapterCompletion, markSubjectCompletion.
- **Progress UI**: subject/chapter screens compute progress by reading the completion maps (getTopicCompletions/getChapterCompletions/getSubjectCompletions).

**Language Support**

- **Bilingual fields**: each question provides Arabic-first fields (text, options, explanation) and English fallbacks (text_en, options_en, explanation_en). Helper getters in play/result/bookmarks choose the display text based on `lang` with fallback order.
- **Important detail**: `shuffleOptions` attaches the option texts and also sets the `correctText` based on the Arabic options; saved answers and recitation correctness comparisons use option text (Arabic) as the canonical identity. This means toggling UI language does not change which string is used as the canonical saved answer unless explicit language-aware storage is added.

**UI, Theme & Audio**

- **Theme**: theme and ThemeContext are implemented in utils/ThemeContext.tsx and utils/theme.ts and applied across layouts.
- **Audio**: simple sound helpers are in utils/sounds.ts and are used for feedback on answers.

**Security & Configuration**

- **Firebase config**: initialized in utils/firebase.ts. There is no secrets-management abstraction in the repo (the config is in code). Expo config files live at app.json and android resources.

**Known Limitations & Risks (based on current code)**

- **Inconsistent language controls**: language toggle exists in quiz play/result contexts but not globally; saved answers use Arabic text as canonical, which can cause confusion if UI language differs.
- **Offline sync edge cases**: sync functions are called after local writes but there is no retry/queue mechanism for failed remote syncs; this can cause divergence between local and Firestore copies if network/auth issues occur.
- **Session vs. dataset drift**: saved sessions refer to questionIds from static JSON; if the question bank changes (ids removed/renamed), resuming a session may fail to rehydrate questions.
- **No automated tests / CI**: the repo has no unit tests or CI configuration; changes are not validated by automated runs.
- **Large bundled data**: shipping many large subject JSON files increases app bundle size; consider lazy-loading or remote data sources for large banks.

**Suggested Next Steps (prioritized)**

1. **Make language handling consistent**: store `lang` in session and use language-aware saved answers or use stable `questionId+optionIndex` pairing instead of option text to compare answers.
2. **Add offline sync queue**: retry failed Firebase writes (results/bookmarks) and surface sync status in the UI.
3. **Add validation on resume**: detect missing questionIds when resuming and offer to restart the quiz when data drift is detected.
4. **Introduce basic tests and CI**: unit tests around utils/storage and quiz scoring logic; a GitHub Action to run a typecheck and lint.
5. **Consider remoteizing large subject payloads**: fetch subject JSON lazily or use code-splitting to reduce initial bundle size.

If you'd like, I can implement one small targeted change now (examples):

- Add a global language toggle and persist it to sessions.
- Implement a simple retry queue for bookmark/result sync failures.
- Replace answer-text comparison with questionId+optionIndex to make storage language-agnostic.

File created: [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md)
