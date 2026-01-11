import client from "./internal/httpClient";

export interface QuizPayload {
  title: string;
  pass_score: number;
  question_ids: number[];
  category?: string;
  total_score?: number;
  exam_date?: string | null;
}

export function quizList(page: number, size: number, keyword?: string) {
  return client.get("/backend/v1/quizzes", {
    page,
    size,
    keyword,
  });
}

export function quiz(id: number) {
  return client.get(`/backend/v1/quizzes/${id}`, {});
}

export function storeQuiz(payload: QuizPayload) {
  return client.post("/backend/v1/quizzes", payload);
}

export function updateQuiz(id: number, payload: QuizPayload) {
  return client.put(`/backend/v1/quizzes/${id}`, payload);
}

export function destroyQuiz(id: number) {
  return client.destroy(`/backend/v1/quizzes/${id}`);
}
