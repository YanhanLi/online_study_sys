package xyz.playedu.course.service;

import java.util.Date;
import java.util.List;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.course.types.UserGradeTrendPoint;

public interface DashboardService {
    List<UserGradeTrendPoint> getUserTrend(Integer userId, Date startDate, Date endDate)
            throws NotFoundException;
}
