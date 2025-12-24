package xyz.playedu.course.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import xyz.playedu.course.domain.GradeStatistics;
import xyz.playedu.course.mapper.GradeStatisticsMapper;
import xyz.playedu.course.service.GradeStatisticsService;

@Service
public class GradeStatisticsServiceImpl
        extends ServiceImpl<GradeStatisticsMapper, GradeStatistics>
        implements GradeStatisticsService {

    @Override
    public GradeStatistics findByQuizId(Integer quizId) {
        return getOne(query().getWrapper().eq("quiz_id", quizId));
    }
}
