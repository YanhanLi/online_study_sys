package xyz.playedu.course.service;

import java.io.InputStream;
import java.util.Date;
import java.util.List;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.course.types.GradeAnalysisDTO;
import xyz.playedu.course.types.OfflineGradeImportResult;
import xyz.playedu.course.types.UserGradeTrendPoint;

public interface GradeService {
    OfflineGradeImportResult importOfflineGrades(
            Integer quizId, InputStream inputStream, Integer operatorId) throws NotFoundException;

    GradeAnalysisDTO calculateStatistics(Integer quizId, boolean forceRefresh)
            throws NotFoundException;

    List<UserGradeTrendPoint> getUserTrend(
            Integer userId, Date startDate, Date endDate) throws NotFoundException;
}
