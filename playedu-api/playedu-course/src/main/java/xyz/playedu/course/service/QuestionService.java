package xyz.playedu.course.service;

import com.baomidou.mybatisplus.extension.service.IService;
import java.util.List;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.course.domain.Question;

public interface QuestionService extends IService<Question> {
    Question findOrFail(Integer id) throws NotFoundException;

    Question create(
            String type,
            String content,
            String options,
            String answer,
            Integer score,
            Integer adminId);

    void update(
            Question question,
            String type,
            String content,
            String options,
            String answer,
            Integer score);

    List<Question> listByIdsKeepOrder(List<Integer> ids);
}
