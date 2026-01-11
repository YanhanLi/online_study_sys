package xyz.playedu.course.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.playedu.common.constant.BackendConstant;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.course.domain.Question;
import xyz.playedu.course.domain.Quiz;
import xyz.playedu.course.mapper.QuizMapper;
import xyz.playedu.course.service.QuestionService;
import xyz.playedu.course.service.QuizService;

@Service
public class QuizServiceImpl extends ServiceImpl<QuizMapper, Quiz> implements QuizService {

    @Autowired private QuestionService questionService;

    @Autowired private ObjectMapper objectMapper;

    @Override
    public Quiz findOrFail(Integer id) throws NotFoundException {
        Quiz quiz = getById(id);
        if (quiz == null) {
            throw new NotFoundException("练习不存在");
        }
        return quiz;
    }

    @Override
    public Quiz create(
            String title,
            String category,
            Integer passScore,
            Integer totalScore,
            Date examDate,
            List<Integer> questionIds,
            Integer adminId)
            throws NotFoundException {
        QuizPayload payload = preparePayload(category, passScore, totalScore, questionIds);

        Quiz quiz = new Quiz();
        quiz.setTitle(title);
        quiz.setCategory(payload.category);
        quiz.setPassScore(passScore);
        quiz.setTotalScore(payload.totalScore);
        quiz.setQuestionIds(writeQuestionIds(payload.questionIds));
        quiz.setExamDate(examDate);
        quiz.setAdminId(adminId);
        quiz.setCreatedAt(new Date());
        quiz.setUpdatedAt(new Date());
        save(quiz);
        return quiz;
    }

    @Override
    public void update(
            Quiz quiz,
            String title,
            String category,
            Integer passScore,
            Integer totalScore,
            Date examDate,
            List<Integer> questionIds)
            throws NotFoundException {
        QuizPayload payload = preparePayload(category, passScore, totalScore, questionIds);

        Quiz updateQuiz = new Quiz();
        updateQuiz.setId(quiz.getId());
        updateQuiz.setTitle(title);
        updateQuiz.setCategory(payload.category);
        updateQuiz.setPassScore(passScore);
        updateQuiz.setTotalScore(payload.totalScore);
        updateQuiz.setQuestionIds(writeQuestionIds(payload.questionIds));
        updateQuiz.setExamDate(examDate);
        updateQuiz.setUpdatedAt(new Date());
        updateById(updateQuiz);
    }

    @Override
    public List<Integer> getQuestionIdList(Quiz quiz) {
        if (quiz == null || quiz.getQuestionIds() == null || quiz.getQuestionIds().isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(quiz.getQuestionIds(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("练习题目数据格式错误", e);
        }
    }

    @Override
    public List<Question> getQuestions(Quiz quiz) throws NotFoundException {
        List<Integer> questionIds = getQuestionIdList(quiz);
        if (questionIds.isEmpty()) {
            return new ArrayList<>();
        }
        return ensureQuestions(questionIds);
    }

    private QuizPayload preparePayload(
            String category, Integer passScore, Integer totalScore, List<Integer> questionIds)
            throws NotFoundException {
        String resolvedCategory = normalizeCategory(category);
        List<Integer> resolvedQuestionIds = deduplicateQuestionIds(questionIds);

        if (BackendConstant.QUIZ_CATEGORY_ONLINE_AUTO.equals(resolvedCategory)) {
            List<Question> questions = ensureQuestions(resolvedQuestionIds);
            int calcTotal = calculateTotalScore(questions);
            validatePassScore(passScore, calcTotal);
            return new QuizPayload(resolvedCategory, resolvedQuestionIds, calcTotal);
        }

        if (totalScore == null || totalScore <= 0) {
            throw new IllegalArgumentException("线下考试必须设置总分");
        }
        validatePassScore(passScore, totalScore);
        return new QuizPayload(resolvedCategory, resolvedQuestionIds, totalScore);
    }

    private List<Question> ensureQuestions(List<Integer> questionIds) throws NotFoundException {
        if (questionIds == null || questionIds.isEmpty()) {
            throw new NotFoundException("请选择至少一道题目");
        }
        List<Question> questions = questionService.listByIdsKeepOrder(questionIds);
        if (questions.size() != questionIds.size()) {
            throw new NotFoundException("部分题目不存在或已删除");
        }
        return questions;
    }

    private int calculateTotalScore(List<Question> questions) {
        return questions.stream().mapToInt(Question::getScore).sum();
    }

    private void validatePassScore(Integer passScore, int totalScore) {
        if (passScore == null || passScore < 0) {
            throw new IllegalArgumentException("及格分数不能小于0");
        }
        if (passScore > totalScore) {
            throw new IllegalArgumentException("及格分数不能大于总分");
        }
    }

    private String writeQuestionIds(List<Integer> questionIds) {
        try {
            if (questionIds == null) {
                return objectMapper.writeValueAsString(new ArrayList<>());
            }
            return objectMapper.writeValueAsString(questionIds);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("题目数据写入失败", e);
        }
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return BackendConstant.QUIZ_CATEGORY_ONLINE_AUTO;
        }
        if (BackendConstant.QUIZ_CATEGORY_OFFLINE_MANUAL.equals(category)) {
            return BackendConstant.QUIZ_CATEGORY_OFFLINE_MANUAL;
        }
        return BackendConstant.QUIZ_CATEGORY_ONLINE_AUTO;
    }

    private List<Integer> deduplicateQuestionIds(List<Integer> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return new ArrayList<>();
        }
        Set<Integer> ordered = new LinkedHashSet<>();
        List<Integer> result = new ArrayList<>();
        for (Integer id : questionIds) {
            if (id == null) {
                continue;
            }
            if (ordered.add(id)) {
                result.add(id);
            }
        }
        return result;
    }

    private record QuizPayload(String category, List<Integer> questionIds, Integer totalScore) {}
}
