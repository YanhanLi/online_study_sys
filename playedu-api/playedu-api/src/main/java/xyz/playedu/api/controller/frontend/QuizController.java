package xyz.playedu.api.controller.frontend;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.playedu.api.event.UserCourseHourFinishedEvent;
import xyz.playedu.api.request.frontend.QuizSubmitRequest;
import xyz.playedu.common.constant.BackendConstant;
import xyz.playedu.common.context.FCtx;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.common.types.JsonResponse;
import xyz.playedu.course.caches.UserCanSeeCourseCache;
import xyz.playedu.course.domain.CourseHour;
import xyz.playedu.course.domain.Question;
import xyz.playedu.course.domain.Quiz;
import xyz.playedu.course.domain.UserQuizRecord;
import xyz.playedu.course.service.CourseHourService;
import xyz.playedu.course.service.QuizService;
import xyz.playedu.course.service.UserCourseHourRecordService;
import xyz.playedu.course.service.UserQuizRecordService;

@RestController
@RequestMapping("/api/v1/course/{courseId}/hour/{hourId}/quiz")
public class QuizController {

    @Autowired private CourseHourService hourService;

    @Autowired private QuizService quizService;

    @Autowired private UserCanSeeCourseCache userCanSeeCourseCache;

    @Autowired private UserQuizRecordService userQuizRecordService;

    @Autowired private UserCourseHourRecordService userCourseHourRecordService;

    @Autowired private ObjectMapper objectMapper;

    @Autowired private ApplicationContext ctx;

    @GetMapping
    public JsonResponse detail(
            @PathVariable Integer courseId, @PathVariable Integer hourId)
            throws NotFoundException {
        userCanSeeCourseCache.check(FCtx.getId(), courseId, true);
        CourseHour hour = hourService.findOrFail(hourId, courseId);
        if (!BackendConstant.COURSE_HOUR_TYPE_QUIZ.equals(hour.getType())) {
            return JsonResponse.error("课时类型不支持");
        }

        Quiz quiz = quizService.findOrFail(hour.getQuizId());
        Map<String, Object> data = new HashMap<>();
        data.put("quiz", buildQuizForStudent(quiz));
        data.put("hour", hour);

        if (FCtx.getId() != null && FCtx.getId() > 0) {
            UserQuizRecord record = userQuizRecordService.getLatest(FCtx.getId(), hourId);
            if (record != null) {
                Map<String, Object> recordData = new HashMap<>();
                recordData.put("score", record.getScore());
                recordData.put(
                        "is_passed", record.getIsPassed() != null && record.getIsPassed() == 1);
                recordData.put("created_at", record.getCreatedAt());
                data.put("record", recordData);
            } else {
                data.put("record", null);
            }
        } else {
            data.put("record", null);
        }

        return JsonResponse.data(data);
    }

    @PostMapping
    public JsonResponse submit(
            @PathVariable Integer courseId,
            @PathVariable Integer hourId,
            @Validated @RequestBody QuizSubmitRequest req)
            throws NotFoundException {
        userCanSeeCourseCache.check(FCtx.getId(), courseId, true);
        CourseHour hour = hourService.findOrFail(hourId, courseId);
        if (!BackendConstant.COURSE_HOUR_TYPE_QUIZ.equals(hour.getType())) {
            return JsonResponse.error("课时类型不支持");
        }

        Quiz quiz = quizService.findOrFail(hour.getQuizId());
        List<Question> questions = quizService.getQuestions(quiz);

        Set<Integer> allowedQuestionIds = new HashSet<>();
        for (Question question : questions) {
            allowedQuestionIds.add(question.getId());
        }

        Map<Integer, List<String>> answers = normalizeAnswers(req.getAnswers(), allowedQuestionIds);

        int score = 0;
        for (Question question : questions) {
            List<String> userAnswer = answers.getOrDefault(question.getId(), List.of());
            if (isCorrect(question, userAnswer)) {
                score += question.getScore();
            }
        }
        boolean passed = score >= quiz.getPassScore();

        UserQuizRecord record =
                userQuizRecordService.store(
                        FCtx.getId(),
                        quiz.getId(),
                        hourId,
                        score,
                        passed,
                        writeUserAnswers(answers));

        if (passed) {
            userCourseHourRecordService.markFinished(FCtx.getId(), courseId, hourId);
            ctx.publishEvent(new UserCourseHourFinishedEvent(this, FCtx.getId(), courseId, hourId));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("score", record.getScore());
        data.put("is_passed", record.getIsPassed() != null && record.getIsPassed() == 1);
        return JsonResponse.data(data);
    }

    private Map<String, Object> buildQuizForStudent(Quiz quiz) throws NotFoundException {
        Map<String, Object> map = new HashMap<>();
        map.put("id", quiz.getId());
        map.put("title", quiz.getTitle());
        map.put("total_score", quiz.getTotalScore());
        map.put("pass_score", quiz.getPassScore());

        List<Question> questions = quizService.getQuestions(quiz);
        List<Map<String, Object>> questionItems = new ArrayList<>();
        for (Question question : questions) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", question.getId());
            item.put("type", question.getType());
            item.put("content", question.getContent());
            item.put("score", question.getScore());
            item.put("options", readOptions(question));
            questionItems.add(item);
        }
        map.put("questions", questionItems);
        return map;
    }

    private Map<Integer, List<String>> normalizeAnswers(
            Map<Integer, List<String>> answers, Set<Integer> allowedQuestionIds) {
        Map<Integer, List<String>> normalized = new HashMap<>();
        if (answers == null) {
            return normalized;
        }
        answers.forEach(
                (key, value) -> {
                    if (!allowedQuestionIds.contains(key)) {
                        return;
                    }
                    List<String> items = new ArrayList<>();
                    if (value != null) {
                        for (String val : value) {
                            if (StringUtils.hasText(val)) {
                                items.add(val.trim());
                            }
                        }
                    }
                    normalized.put(key, items);
                });
        return normalized;
    }

    private boolean isCorrect(Question question, List<String> userAnswer) {
        try {
            List<String> correct =
                    objectMapper.readValue(question.getAnswer(), new TypeReference<>() {});
            if (BackendConstant.QUESTION_TYPE_SINGLE.equals(question.getType())
                    || BackendConstant.QUESTION_TYPE_TRUE_FALSE.equals(question.getType())) {
                return correct.size() == 1
                        && userAnswer.size() == 1
                        && correct.get(0).equals(userAnswer.get(0));
            }
            Set<String> correctSet = new HashSet<>(correct);
            Set<String> userSet = new HashSet<>(userAnswer);
            return !correctSet.isEmpty() && correctSet.equals(userSet);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("题目答案解析失败", e);
        }
    }

    private List<Map<String, Object>> readOptions(Question question) {
        try {
            if (!StringUtils.hasText(question.getOptions())) {
                return new ArrayList<>();
            }
            return objectMapper.readValue(question.getOptions(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("题目选项解析失败", e);
        }
    }

    private String writeUserAnswers(Map<Integer, List<String>> answers) {
        try {
            return objectMapper.writeValueAsString(answers);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("作答内容写入失败", e);
        }
    }
}
