package xyz.playedu.course.service;

import com.baomidou.mybatisplus.extension.service.IService;
import xyz.playedu.course.domain.GradeStatistics;

public interface GradeStatisticsService extends IService<GradeStatistics> {
    GradeStatistics findByQuizId(Integer quizId);
}
