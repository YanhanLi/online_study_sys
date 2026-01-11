import client from "./internal/httpClient";

export function gradeAnalysis(quizId: number, refresh = false) {
  return client.get(`/backend/v1/grade/analysis/${quizId}`, {
    refresh: refresh ? 1 : 0,
  });
}

export function importOfflineGrade(quizId: number, file: File) {
  const formData = new FormData();
  formData.append("quiz_id", String(quizId));
  formData.append("file", file);
  return client.post("/backend/v1/grade/import", formData);
}

export function studentTrend(
  userId: number,
  params?: { start?: string; end?: string }
) {
  return client.get(`/backend/v1/grade/student/${userId}/trend`, params || {});
}
