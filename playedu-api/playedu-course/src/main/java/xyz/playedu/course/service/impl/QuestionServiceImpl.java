package xyz.playedu.course.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.course.domain.Question;
import xyz.playedu.course.mapper.QuestionMapper;
import xyz.playedu.course.service.QuestionService;

@Service
public class QuestionServiceImpl extends ServiceImpl<QuestionMapper, Question>
        implements QuestionService {

    @Override
    public Question findOrFail(Integer id) throws NotFoundException {
        Question question = getById(id);
        if (question == null) {
            throw new NotFoundException("题目不存在");
        }
        return question;
    }

    @Override
    public Question create(
            String type,
            String content,
            String options,
            String answer,
            Integer score,
            Integer adminId) {
        Question question = new Question();
        question.setType(type);
        question.setContent(content);
        question.setOptions(options);
        question.setAnswer(answer);
        question.setScore(score);
        question.setAdminId(adminId);
        question.setCreatedAt(new Date());
        question.setUpdatedAt(new Date());
        save(question);
        return question;
    }

    @Override
    public void update(
            Question question,
            String type,
            String content,
            String options,
            String answer,
            Integer score) {
        Question updateQuestion = new Question();
        updateQuestion.setId(question.getId());
        updateQuestion.setType(type);
        updateQuestion.setContent(content);
        updateQuestion.setOptions(options);
        updateQuestion.setAnswer(answer);
        updateQuestion.setScore(score);
        updateQuestion.setUpdatedAt(new Date());
        updateById(updateQuestion);
    }

    @Override
    public List<Question> listByIdsKeepOrder(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }
        List<Question> questions = list(query().getWrapper().in("id", ids));
        Map<Integer, Question> questionMap = new HashMap<>();
        for (Question item : questions) {
            questionMap.put(item.getId(), item);
        }
        List<Question> ordered = new ArrayList<>();
        for (Integer id : ids) {
            Question q = questionMap.get(id);
            if (q != null) {
                ordered.add(q);
            }
        }
        return ordered;
    }
}
