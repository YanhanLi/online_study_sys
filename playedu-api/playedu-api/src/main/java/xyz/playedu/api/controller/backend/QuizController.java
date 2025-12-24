package xyz.playedu.api.controller.backend;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;
import xyz.playedu.api.request.backend.QuizRequest;
import xyz.playedu.common.annotation.BackendPermission;
import xyz.playedu.common.annotation.Log;
import xyz.playedu.common.constant.BPermissionConstant;
import xyz.playedu.common.constant.BackendConstant;
import xyz.playedu.common.constant.BusinessTypeConstant;
import xyz.playedu.common.context.BCtx;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.common.types.JsonResponse;
import xyz.playedu.course.domain.GradeStatistics;
import xyz.playedu.course.domain.Question;
import xyz.playedu.course.domain.Quiz;
import xyz.playedu.course.service.GradeStatisticsService;
import xyz.playedu.course.service.QuizService;

@RestController
@Slf4j
@RequestMapping("/backend/v1/quizzes")
public class QuizController {

    @Autowired private QuizService quizService;

    @Autowired private GradeStatisticsService gradeStatisticsService;

    @Autowired private ObjectMapper objectMapper;

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @GetMapping
    @Log(title = "练习-列表", businessType = BusinessTypeConstant.GET)
    public JsonResponse index(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        var query = quizService.lambdaQuery();
        if (StringUtils.hasText(keyword)) {
            query.like(Quiz::getTitle, keyword.trim());
        }
        Page<Quiz> pager = quizService.page(new Page<>(page, size), query.getWrapper());
        List<Quiz> quizzes = pager.getRecords();
        Map<Integer, GradeStatistics> statisticsMap = buildStatisticsMap(quizzes);

        List<Map<String, Object>> items = new ArrayList<>();
        for (Quiz quiz : quizzes) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", quiz.getId());
            map.put("title", quiz.getTitle());
            map.put("total_score", quiz.getTotalScore());
            map.put("pass_score", quiz.getPassScore());
            map.put("category", quiz.getCategory());
            map.put("exam_date", quiz.getExamDate());
            map.put("question_count", quizService.getQuestionIdList(quiz).size());
            GradeStatistics statistics = statisticsMap.get(quiz.getId());
            if (statistics != null) {
                map.put("participant_count", statistics.getParticipantCount());
                map.put(
                        "pass_rate",
                        statistics.getPassRate() == null
                                ? null
                                : statistics.getPassRate().doubleValue());
                map.put(
                        "avg_score",
                        statistics.getAvgScore() == null
                                ? null
                                : statistics.getAvgScore().doubleValue());
                map.put("max_score", statistics.getMaxScore());
                map.put("min_score", statistics.getMinScore());
                map.put("statistics_updated_at", statistics.getUpdatedAt());
            }
            items.add(map);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("data", items);
        data.put("total", pager.getTotal());
        return JsonResponse.data(data);
    }

    private Map<Integer, GradeStatistics> buildStatisticsMap(List<Quiz> quizzes) {
        if (quizzes == null || quizzes.isEmpty()) {
            return Map.of();
        }
        List<Integer> quizIds =
                quizzes.stream().map(Quiz::getId).filter(id -> id != null).toList();
        if (quizIds.isEmpty()) {
            return Map.of();
        }
        return gradeStatisticsService.lambdaQuery()
                .in(GradeStatistics::getQuizId, quizIds)
                .list()
                .stream()
                .filter(stat -> stat.getQuizId() != null)
                .collect(Collectors.toMap(GradeStatistics::getQuizId, Function.identity()));
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @PostMapping
    @Log(title = "练习-新增", businessType = BusinessTypeConstant.INSERT)
    public JsonResponse store(@Validated @RequestBody QuizRequest req) {
        return saveQuiz(null, req);
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @GetMapping("/{id}")
    @Log(title = "练习-详情", businessType = BusinessTypeConstant.GET)
    public JsonResponse show(@PathVariable Integer id) throws NotFoundException {
        Quiz quiz = quizService.findOrFail(id);
        return JsonResponse.data(buildQuizDetail(quiz));
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @PutMapping("/{id}")
    @Log(title = "练习-更新", businessType = BusinessTypeConstant.UPDATE)
    public JsonResponse update(@PathVariable Integer id, @Validated @RequestBody QuizRequest req)
            throws NotFoundException {
        Quiz quiz = quizService.findOrFail(id);
        return saveQuiz(quiz, req);
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @DeleteMapping("/{id}")
    @Log(title = "练习-删除", businessType = BusinessTypeConstant.DELETE)
    public JsonResponse destroy(@PathVariable Integer id) throws NotFoundException {
        quizService.findOrFail(id);
        quizService.removeById(id);
        return JsonResponse.success();
    }

    private JsonResponse saveQuiz(Quiz quiz, QuizRequest req) {
        try {
            QuizPayload payload = buildPayload(req);
            Quiz target;
            if (quiz == null) {
                target =
                        quizService.create(
                                payload.title,
                                payload.category,
                                payload.passScore,
                                payload.totalScore,
                                payload.examDate,
                                payload.questionIds,
                                BCtx.getId());
            } else {
                quizService.update(
                        quiz,
                        payload.title,
                        payload.category,
                        payload.passScore,
                        payload.totalScore,
                        payload.examDate,
                        payload.questionIds);
                target = quizService.findOrFail(quiz.getId());
            }
            return JsonResponse.data(buildQuizDetail(target));
        } catch (NotFoundException | IllegalArgumentException e) {
            return JsonResponse.error(e.getMessage());
        }
    }

    private QuizPayload buildPayload(QuizRequest req) {
        String title = req.getTitle() == null ? "" : req.getTitle().trim();
        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("请输入练习标题");
        }
        Integer passScore = req.getPassScore() == null ? 0 : req.getPassScore();
        String category = normalizeCategory(req.getCategory());
        List<Integer> questionIds = deduplicate(req.getQuestionIds());
        if (BackendConstant.QUIZ_CATEGORY_ONLINE_AUTO.equals(category)
                && questionIds.isEmpty()) {
            throw new IllegalArgumentException("请至少选择一道题目");
        }
        Integer totalScore = req.getTotalScore();
        if (BackendConstant.QUIZ_CATEGORY_OFFLINE_MANUAL.equals(category)) {
            if (totalScore == null || totalScore <= 0) {
                throw new IllegalArgumentException("请填写线下考试总分");
            }
        }
        Date examDate = parseExamDate(req.getExamDate());
        return new QuizPayload(title, category, passScore, totalScore, questionIds, examDate);
    }

    private Map<String, Object> buildQuizDetail(Quiz quiz) {
        Map<String, Object> map = new HashMap<>();
        List<Integer> questionIds = quizService.getQuestionIdList(quiz);
        map.put("id", quiz.getId());
        map.put("title", quiz.getTitle());
        map.put("total_score", quiz.getTotalScore());
        map.put("pass_score", quiz.getPassScore());
        map.put("category", quiz.getCategory());
        map.put("exam_date", quiz.getExamDate());
        map.put("question_ids", questionIds);
        try {
            List<Question> questions = quizService.getQuestions(quiz);
            List<Map<String, Object>> questionItems = new ArrayList<>();
            for (Question question : questions) {
                questionItems.add(buildQuestionDetail(question));
            }
            map.put("questions", questionItems);
        } catch (NotFoundException e) {
            throw new RuntimeException("练习题目数据异常", e);
        }
        return map;
    }

    private Map<String, Object> buildQuestionDetail(Question question) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", question.getId());
        map.put("type", question.getType());
        map.put("content", question.getContent());
        map.put("score", question.getScore());
        map.put("options", readOptions(question.getOptions()));
        map.put("answer", readAnswer(question.getAnswer()));
        return map;
    }

    private List<Map<String, Object>> readOptions(String json) {
        if (!StringUtils.hasText(json)) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("练习题目选项解析失败", e);
        }
    }

    private List<String> readAnswer(String json) {
        if (!StringUtils.hasText(json)) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("练习题目答案解析失败", e);
        }
    }

    private String normalizeCategory(String category) {
        if (!StringUtils.hasText(category)) {
            return BackendConstant.QUIZ_CATEGORY_ONLINE_AUTO;
        }
        if (BackendConstant.QUIZ_CATEGORY_OFFLINE_MANUAL.equals(category)) {
            return BackendConstant.QUIZ_CATEGORY_OFFLINE_MANUAL;
        }
        return BackendConstant.QUIZ_CATEGORY_ONLINE_AUTO;
    }

    private List<Integer> deduplicate(List<Integer> source) {
        List<Integer> result = new ArrayList<>();
        if (source == null) {
            return result;
        }
        Set<Integer> unique = new LinkedHashSet<>();
        for (Integer id : source) {
            if (id == null) {
                continue;
            }
            if (unique.add(id)) {
                result.add(id);
            }
        }
        return result;
    }

    private Date parseExamDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        DateTimeFormatter[] dateTimeFormatters = {
            DateTimeFormatter.ISO_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        };
        for (DateTimeFormatter formatter : dateTimeFormatters) {
            try {
                LocalDateTime dateTime = LocalDateTime.parse(trimmed, formatter);
                return Date.from(dateTime.atZone(ZoneId.systemDefault()).toInstant());
            } catch (DateTimeParseException ignore) {
                // try next
            }
        }
        DateTimeFormatter[] dateFormatters = {
            DateTimeFormatter.ofPattern("yyyy-MM-dd")
        };
        for (DateTimeFormatter formatter : dateFormatters) {
            try {
                LocalDate date = LocalDate.parse(trimmed, formatter);
                return Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
            } catch (DateTimeParseException ignore) {
                // try next
            }
        }
        throw new IllegalArgumentException("考试时间格式不正确");
    }

    private record QuizPayload(
            String title,
            String category,
            Integer passScore,
            Integer totalScore,
            List<Integer> questionIds,
            Date examDate) {}
}