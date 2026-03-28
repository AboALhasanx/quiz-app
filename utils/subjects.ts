import manifest from "../data/subjects/index.json";

export type Language = "ar" | "en";

export type SubjectQuestion = {
  id: string;
  text?: string;
  text_en?: string;
  options: string[];
  options_en?: string[];
  answer: number;
  explanation?: string;
  explanation_en?: string;
};

export type SubjectTopic = {
  id: string;
  title: string;
  questions: SubjectQuestion[];
};

export type SubjectChapter = {
  id: string;
  title: string;
  topics: SubjectTopic[];
};

export type SubjectData = {
  id: string;
  title: string;
  chapters: SubjectChapter[];
};

export type SubjectManifestItem = {
  id: string;
  title: string;
  file: string;
};

const SUBJECT_DATA_LOADERS: Record<string, () => SubjectData> = {
  "ai_data.json": () => require("../data/subjects/ai_data.json") as SubjectData,
  "cn_data.json": () => require("../data/subjects/cn_data.json") as SubjectData,
  "ds_data.json": () => require("../data/subjects/ds_data.json") as SubjectData,
  "oop_data.json": () => require("../data/subjects/oop_data.json") as SubjectData,
  "os_data.json": () => require("../data/subjects/os_data.json") as SubjectData,
  "se_data.json": () => require("../data/subjects/se_data.json") as SubjectData,
};

export const SUBJECT_MANIFEST = manifest.subjects as SubjectManifestItem[];

export function loadSubjectDataByFile(file: string): SubjectData | null {
  const loader = SUBJECT_DATA_LOADERS[file];
  return loader ? loader() : null;
}

export function getSubjectManifestItem(subjectId: string): SubjectManifestItem | null {
  return SUBJECT_MANIFEST.find((subject) => subject.id === subjectId) ?? null;
}

export function loadSubjectDataById(subjectId: string): SubjectData | null {
  const subject = getSubjectManifestItem(subjectId);
  return subject ? loadSubjectDataByFile(subject.file) : null;
}

export function getSubjectMetaByFile(file: string) {
  const subject = loadSubjectDataByFile(file);
  const chaptersCount = subject?.chapters.length ?? 0;
  const questionsCount =
    subject?.chapters.reduce(
      (chapterSum, chapter) =>
        chapterSum +
        chapter.topics.reduce(
          (topicSum, topic) => topicSum + topic.questions.length,
          0
        ),
      0
    ) ?? 0;

  return { chaptersCount, questionsCount };
}

export function getScopedQuestions(
  subject: SubjectData | null,
  chapterId?: string,
  topicId?: string
): SubjectQuestion[] {
  if (!subject) return [];

  const chapters = chapterId
    ? subject.chapters.filter((chapter) => chapter.id === chapterId)
    : subject.chapters;

  const questions: SubjectQuestion[] = [];

  chapters.forEach((chapter) => {
    const topics = topicId
      ? chapter.topics.filter((topic) => topic.id === topicId)
      : chapter.topics;

    topics.forEach((topic) => questions.push(...topic.questions));
  });

  return questions;
}

export function getQuestionText(question: SubjectQuestion, lang: Language = "ar"): string {
  return lang === "en"
    ? question.text_en ?? question.text ?? ""
    : question.text ?? question.text_en ?? "";
}

export function getQuestionOptions(question: SubjectQuestion, lang: Language = "ar"): string[] {
  return lang === "en"
    ? question.options_en ?? question.options ?? []
    : question.options ?? question.options_en ?? [];
}

export function getQuestionExplanation(
  question: SubjectQuestion,
  lang: Language = "ar"
): string {
  return lang === "en"
    ? question.explanation_en ?? question.explanation ?? ""
    : question.explanation ?? question.explanation_en ?? "";
}
