package xyz.playedu.course.service;

import com.baomidou.mybatisplus.extension.service.IService;
import java.util.Date;
import java.util.List;
import xyz.playedu.course.domain.UserQuizRecord;

public interface UserQuizRecordService extends IService<UserQuizRecord> {
    UserQuizRecord getLatest(Integer userId, Integer courseHourId);

    UserQuizRecord store(
            Integer userId,
            Integer quizId,
            Integer courseHourId,
            Integer score,
            boolean passed,
            String userAnswers);

        UserQuizRecord findLatestByUserAndQuiz(Integer userId, Integer quizId);

        UserQuizRecord saveManualScore(
            Integer userId,
            Integer quizId,
            Integer score,
            boolean passed,
            String comment,
            Date takenAt);

    List<UserQuizRecord> topScoreToday(int limit);

    List<UserQuizRecord> getTopUserScores(int limit);
}
