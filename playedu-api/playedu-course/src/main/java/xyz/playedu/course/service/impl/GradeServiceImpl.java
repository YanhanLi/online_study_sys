package xyz.playedu.course.service.impl;

import com.alibaba.excel.EasyExcel;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.playedu.common.constant.BackendConstant;
import xyz.playedu.common.domain.User;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.common.service.UserService;
import xyz.playedu.course.domain.GradeStatistics;
import xyz.playedu.course.domain.Quiz;
import xyz.playedu.course.domain.UserQuizRecord;
import xyz.playedu.course.service.GradeService;
import xyz.playedu.course.service.GradeStatisticsService;
import xyz.playedu.course.service.QuizService;
import xyz.playedu.course.service.UserQuizRecordService;
import xyz.playedu.course.types.GradeAnalysisDTO;
import xyz.playedu.course.types.OfflineGradeExcelRow;
import xyz.playedu.course.types.OfflineGradeImportResult;
import xyz.playedu.course.types.UserGradeTrendPoint;

@Service
public class GradeServiceImpl implements GradeService {

    private static final String[] DISTRIBUTION_KEYS = {
        "0-60", "60-70", "70-80", "80-90", "90-100"
    };

    @Autowired private QuizService quizService;

    @Autowired private GradeStatisticsService gradeStatisticsService;

    @Autowired private UserQuizRecordService userQuizRecordService;

    @Autowired private UserService userService;

    @Autowired private ObjectMapper objectMapper;

    @Override
    public OfflineGradeImportResult importOfflineGrades(
            Integer quizId, InputStream inputStream, Integer operatorId) throws NotFoundException {
        Quiz quiz = quizService.findOrFail(quizId);
        if (!BackendConstant.QUIZ_CATEGORY_OFFLINE_MANUAL.equals(quiz.getCategory())) {
            throw new IllegalArgumentException("仅线下考试支持成绩导入");
        }

        List<OfflineGradeExcelRow> rows =
                EasyExcel.read(inputStream)
                        .head(OfflineGradeExcelRow.class)
                        .sheet()
                        .doReadSync();
        if (rows == null) {
            rows = new ArrayList<>();
        }

        int total = rows.size();
        int success = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            OfflineGradeExcelRow row = rows.get(i);
            int rowNumber = i + 2; // header + 1-based index
            if (row == null) {
                skipped++;
                continue;
            }
            String account = StringUtils.trimToEmpty(row.getAccount());
            if (StringUtils.isBlank(account)) {
                skipped++;
                continue;
            }
            Double rawScore = row.getScore();
            if (rawScore == null) {
                errors.add("第" + rowNumber + "行：缺少分数");
                continue;
            }
            int score = (int) Math.round(rawScore);
            if (score < 0) {
                errors.add("第" + rowNumber + "行：分数不能为负数");
                continue;
            }

            User user = findUserByAccount(account);
            if (user == null) {
                errors.add("第" + rowNumber + "行：未找到学员账号" + account);
                continue;
            }

            boolean passed = score >= quiz.getPassScore();
            userQuizRecordService.saveManualScore(
                    user.getId(), quizId, score, passed, row.getComment(), quiz.getExamDate());
            success++;
        }

        calculateStatistics(quizId, true);

        return OfflineGradeImportResult.builder()
                .totalRows(total)
                .successCount(success)
                .skippedCount(skipped)
                .errors(errors)
                .build();
    }

    @Override
    public GradeAnalysisDTO calculateStatistics(Integer quizId, boolean forceRefresh)
            throws NotFoundException {
        Quiz quiz = quizService.findOrFail(quizId);
        List<UserQuizRecord> records =
            userQuizRecordService
                .lambdaQuery()
                .eq(UserQuizRecord::getQuizId, quizId)
                .list();

        GradeSummary summary = buildSummary(quiz, records);

        if (forceRefresh || records.size() > 0) {
            persistSummary(summary);
        }

        GradeAnalysisDTO.GradeAnalysisDTOBuilder builder =
                GradeAnalysisDTO.builder()
                        .quizId(quiz.getId())
                        .quizTitle(quiz.getTitle())
                        .category(quiz.getCategory())
                        .examDate(quiz.getExamDate())
                        .totalScore(quiz.getTotalScore())
                        .passScore(quiz.getPassScore())
                .participantCount(summary.total)
                        .averageScore(summary.average)
                        .maxScore(summary.max)
                        .minScore(summary.min)
                        .medianScore(summary.median)
                        .passRate(summary.passRate)
                        .distribution(summary.distribution);

        GradeStatistics cached = gradeStatisticsService.findByQuizId(quizId);
        if (cached != null) {
            builder.statisticsUpdatedAt(cached.getUpdatedAt());
        }

        return builder.build();
    }

    @Override
    public List<UserGradeTrendPoint> getUserTrend(Integer userId, Date startDate, Date endDate)
            throws NotFoundException {
        userService.findOrFail(userId);
        var query =
                userQuizRecordService
                        .lambdaQuery()
                        .eq(UserQuizRecord::getUserId, userId)
                        .orderByAsc(UserQuizRecord::getCreatedAt);
        if (startDate != null) {
            query.ge(UserQuizRecord::getCreatedAt, startDate);
        }
        if (endDate != null) {
            query.le(UserQuizRecord::getCreatedAt, endDate);
        }
        List<UserQuizRecord> records = query.list();
        if (records.isEmpty()) {
            return List.of();
        }

        Map<Integer, Quiz> quizMap =
                quizService.listByIds(
                                records.stream().map(UserQuizRecord::getQuizId).distinct().toList())
                        .stream()
                        .collect(Collectors.toMap(Quiz::getId, q -> q));

        List<UserGradeTrendPoint> result = new ArrayList<>();
        for (UserQuizRecord record : records) {
            Quiz quiz = quizMap.get(record.getQuizId());
            if (quiz == null) {
                continue;
            }
            result.add(
                    UserGradeTrendPoint.builder()
                            .quizId(quiz.getId())
                            .quizTitle(quiz.getTitle())
                            .category(quiz.getCategory())
                            .examDate(quiz.getExamDate())
                            .submittedAt(record.getCreatedAt())
                            .score(record.getScore())
                            .passed(record.getIsPassed() != null && record.getIsPassed() == 1)
                            .build());
        }
        return result;
    }

    private void persistSummary(GradeSummary summary) {
        GradeStatistics statistics = gradeStatisticsService.findByQuizId(summary.quizId);
        if (statistics == null) {
            statistics = new GradeStatistics();
            statistics.setQuizId(summary.quizId);
        }
        statistics.setParticipantCount(summary.total);
        statistics.setAvgScore(BigDecimal.valueOf(summary.average).setScale(2, RoundingMode.HALF_UP));
        statistics.setMaxScore(summary.max);
        statistics.setMinScore(summary.min);
        statistics.setPassRate(
            BigDecimal.valueOf(summary.passRate).setScale(2, RoundingMode.HALF_UP));
        try {
            statistics.setDistribution(objectMapper.writeValueAsString(summary.distribution));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("成绩分布写入失败", e);
        }
        if (statistics.getId() == null) {
            gradeStatisticsService.save(statistics);
        } else {
            gradeStatisticsService.updateById(statistics);
        }
    }

    private GradeSummary buildSummary(Quiz quiz, List<UserQuizRecord> records) {
        Map<Integer, UserQuizRecord> latestByUser = new LinkedHashMap<>();
        for (UserQuizRecord record : records) {
            if (record == null || record.getUserId() == null) {
                continue;
            }
            UserQuizRecord existing = latestByUser.get(record.getUserId());
            if (existing == null) {
                latestByUser.put(record.getUserId(), record);
                continue;
            }
            Date existingTime = existing.getCreatedAt();
            Date currentTime = record.getCreatedAt();
            if (existingTime == null || (currentTime != null && currentTime.after(existingTime))) {
                latestByUser.put(record.getUserId(), record);
            }
        }

        List<UserQuizRecord> normalized = new ArrayList<>(latestByUser.values());

        int total = normalized.size();
        Map<String, Integer> distribution = initDistribution();
        if (total == 0) {
            return new GradeSummary(quiz.getId(), 0, 0, 0, 0, 0d, 0d, 0d, distribution);
        }

        int max = Integer.MIN_VALUE;
        int min = Integer.MAX_VALUE;
        int sum = 0;
        int passCount = 0;
        List<Integer> scoreList = new ArrayList<>();

        for (UserQuizRecord record : normalized) {
            int score = record.getScore() == null ? 0 : record.getScore();
            sum += score;
            max = Math.max(max, score);
            min = Math.min(min, score);
            if (record.getIsPassed() != null && record.getIsPassed() == 1) {
                passCount++;
            }
            scoreList.add(score);
            putScoreIntoDistribution(distribution, score);
        }

        double average = (double) sum / total;
        double passRate = total == 0 ? 0d : (double) passCount / total;
        scoreList.sort(Integer::compareTo);
        double median;
        if (total % 2 == 0) {
            median = (scoreList.get(total / 2 - 1) + scoreList.get(total / 2)) / 2.0;
        } else {
            median = scoreList.get(total / 2);
        }

        return new GradeSummary(
            quiz.getId(),
            total,
            max,
            min,
            sum,
            average,
            passRate,
            median,
            distribution);
    }

    private Map<String, Integer> initDistribution() {
        Map<String, Integer> map = new LinkedHashMap<>();
        for (String key : DISTRIBUTION_KEYS) {
            map.put(key, 0);
        }
        return map;
    }

    private void putScoreIntoDistribution(Map<String, Integer> distribution, int score) {
        String key;
        if (score < 60) {
            key = "0-60";
        } else if (score < 70) {
            key = "60-70";
        } else if (score < 80) {
            key = "70-80";
        } else if (score < 90) {
            key = "80-90";
        } else {
            key = "90-100";
        }
        distribution.compute(key, (k, v) -> v == null ? 1 : v + 1);
    }

    private User findUserByAccount(String account) {
        if (StringUtils.isBlank(account)) {
            return null;
        }
        User user = userService.lambdaQuery().eq(User::getEmail, account).one();
        if (user != null) {
            return user;
        }
        return userService.lambdaQuery().eq(User::getIdCard, account).one();
    }

    private record GradeSummary(
            Integer quizId,
            int total,
            int max,
            int min,
            int sum,
            double average,
            double passRate,
            double median,
            Map<String, Integer> distribution) {}
}
