package xyz.playedu.course.service.impl;

import java.util.Date;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.course.service.DashboardService;
import xyz.playedu.course.service.GradeService;
import xyz.playedu.course.types.UserGradeTrendPoint;

@Service
public class DashboardServiceImpl implements DashboardService {

    @Autowired private GradeService gradeService;

    @Override
    public List<UserGradeTrendPoint> getUserTrend(Integer userId, Date startDate, Date endDate)
            throws NotFoundException {
        return gradeService.getUserTrend(userId, startDate, endDate);
    }
}
