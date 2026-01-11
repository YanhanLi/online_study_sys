import client from "./internal/httpClient";

export type QuestionType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE";

export interface QuestionPayload {
  type: QuestionType;
  content: string;
  options?: Array<{
    value: string;
    label: string;
  }>;
  answer: string[];
  score: number;
}

export function questionList(
  page: number,
  size: number,
  type?: string,
  keyword?: string
) {
  return client.get("/backend/v1/questions", {
    page,
    size,
    type,
    keyword,
  });
}

export function question(id: number) {
  return client.get(`/backend/v1/questions/${id}`, {});
}

export function storeQuestion(payload: QuestionPayload) {
  return client.post("/backend/v1/questions", payload);
}

export function updateQuestion(id: number, payload: QuestionPayload) {
  return client.put(`/backend/v1/questions/${id}`, payload);
}

export function destroyQuestion(id: number) {
  return client.destroy(`/backend/v1/questions/${id}`);
}
