package xyz.playedu.course.service;

import com.baomidou.mybatisplus.extension.service.IService;
import java.util.Date;
import java.util.List;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.course.domain.Question;
import xyz.playedu.course.domain.Quiz;

public interface QuizService extends IService<Quiz> {
    Quiz findOrFail(Integer id) throws NotFoundException;

    Quiz create(
            String title,
            String category,
            Integer passScore,
            Integer totalScore,
            Date examDate,
            List<Integer> questionIds,
            Integer adminId)
            throws NotFoundException;

    void update(
            Quiz quiz,
            String title,
            String category,
            Integer passScore,
            Integer totalScore,
            Date examDate,
            List<Integer> questionIds)
            throws NotFoundException;

    List<Integer> getQuestionIdList(Quiz quiz);

    List<Question> getQuestions(Quiz quiz) throws NotFoundException;
}
