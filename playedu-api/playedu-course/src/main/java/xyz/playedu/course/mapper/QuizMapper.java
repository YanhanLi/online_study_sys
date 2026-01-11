package xyz.playedu.course.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import xyz.playedu.course.domain.Quiz;

@Mapper
public interface QuizMapper extends BaseMapper<Quiz> {}
