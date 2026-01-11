import type { QuestionType } from "../api/question";

export const QUESTION_TYPE_MAP: Record<QuestionType, string> = {
  SINGLE: "单选题",
  MULTIPLE: "多选题",
  TRUE_FALSE: "判断题",
};

export const QUESTION_TYPE_OPTIONS = Object.entries(QUESTION_TYPE_MAP).map(
  ([value, label]) => ({
    value,
    label,
  })
);
