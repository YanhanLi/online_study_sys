package xyz.playedu.course.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import xyz.playedu.course.domain.Question;

@Mapper
public interface QuestionMapper extends BaseMapper<Question> {}
