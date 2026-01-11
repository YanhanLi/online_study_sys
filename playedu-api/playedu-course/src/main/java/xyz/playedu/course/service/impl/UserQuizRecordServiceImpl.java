package xyz.playedu.course.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import xyz.playedu.course.domain.UserQuizRecord;
import xyz.playedu.course.mapper.UserQuizRecordMapper;
import xyz.playedu.course.service.UserQuizRecordService;

@Service
public class UserQuizRecordServiceImpl
        extends ServiceImpl<UserQuizRecordMapper, UserQuizRecord>
        implements UserQuizRecordService {

    @Override
    public UserQuizRecord getLatest(Integer userId, Integer courseHourId) {
        return getOne(
                query().getWrapper()
                        .eq("user_id", userId)
                        .eq("course_hour_id", courseHourId)
                        .orderByDesc("id")
                        .last("limit 1"));
    }

    @Override
    public UserQuizRecord store(
            Integer userId,
            Integer quizId,
            Integer courseHourId,
            Integer score,
            boolean passed,
            String userAnswers) {
        UserQuizRecord record = new UserQuizRecord();
        record.setUserId(userId);
        record.setQuizId(quizId);
        record.setCourseHourId(courseHourId);
        record.setScore(score);
        record.setIsPassed(passed ? 1 : 0);
        record.setUserAnswers(userAnswers);
        record.setComment("");
        record.setCreatedAt(new Date());
        save(record);
        return record;
    }

    @Override
    public UserQuizRecord findLatestByUserAndQuiz(Integer userId, Integer quizId) {
        return getOne(
                query().getWrapper()
                        .eq("user_id", userId)
                        .eq("quiz_id", quizId)
                        .orderByDesc("id")
                        .last("limit 1"));
    }

    @Override
    public UserQuizRecord saveManualScore(
            Integer userId,
            Integer quizId,
            Integer score,
            boolean passed,
            String comment,
            Date takenAt) {
        UserQuizRecord record = findLatestByUserAndQuiz(userId, quizId);
        if (record == null) {
            record = new UserQuizRecord();
            record.setUserId(userId);
            record.setQuizId(quizId);
            record.setCourseHourId(0);
            record.setUserAnswers("{}");
        }
        record.setScore(score);
        record.setIsPassed(passed ? 1 : 0);
        record.setComment(comment == null ? "" : comment.trim());
        record.setCreatedAt(takenAt == null ? new Date() : takenAt);
        if (record.getId() == null) {
            save(record);
        } else {
            updateById(record);
        }
        return record;
    }

    @Override
    public List<UserQuizRecord> topScoreToday(int limit) {
        int safeLimit = limit <= 0 ? 10 : limit;
        LocalDate today = LocalDate.now();
        Date start = Date.from(today.atStartOfDay(ZoneId.systemDefault()).toInstant());
        Date end = Date.from(today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant());

        List<UserQuizRecord> candidates =
                lambdaQuery()
                        .ge(UserQuizRecord::getCreatedAt, start)
                        .lt(UserQuizRecord::getCreatedAt, end)
                        .isNotNull(UserQuizRecord::getScore)
                        .list();
        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<Integer, UserQuizRecord> bestByUser = new HashMap<>();
        for (UserQuizRecord record : candidates) {
            Integer userId = record.getUserId();
            if (userId == null) {
                continue;
            }
            UserQuizRecord existing = bestByUser.get(userId);
            if (existing == null) {
                bestByUser.put(userId, record);
                continue;
            }
            Integer currentScore = record.getScore();
            Integer bestScore = existing.getScore();
            if (currentScore != null && bestScore != null) {
                if (currentScore > bestScore) {
                    bestByUser.put(userId, record);
                    continue;
                }
                if (currentScore.equals(bestScore)) {
                    Date currentTime = record.getCreatedAt();
                    Date bestTime = existing.getCreatedAt();
                    if (currentTime != null
                            && bestTime != null
                            && currentTime.before(bestTime)) {
                        bestByUser.put(userId, record);
                    }
                }
                continue;
            }
            if (currentScore != null && bestScore == null) {
                bestByUser.put(userId, record);
            }
        }

        List<UserQuizRecord> ranked = new ArrayList<>(bestByUser.values());
        ranked.sort(
                Comparator.comparing(
                                UserQuizRecord::getScore,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(UserQuizRecord::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        if (ranked.size() <= safeLimit) {
            return ranked;
        }
        return ranked.subList(0, safeLimit);
    }

    @Override
    public List<UserQuizRecord> getTopUserScores(int limit) {
        return baseMapper.getTopScoreRecords(limit);
    }
}
