package xyz.playedu.api.controller.backend;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import xyz.playedu.common.annotation.BackendPermission;
import xyz.playedu.common.annotation.Log;
import xyz.playedu.common.constant.BPermissionConstant;
import xyz.playedu.common.constant.BusinessTypeConstant;
import xyz.playedu.common.context.BCtx;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.common.types.JsonResponse;
import xyz.playedu.course.service.DashboardService;
import xyz.playedu.course.service.GradeService;
import xyz.playedu.course.types.GradeAnalysisDTO;
import xyz.playedu.course.types.OfflineGradeImportResult;
import xyz.playedu.course.types.UserGradeTrendPoint;

@RestController
@RequestMapping("/backend/v1/grade")
@Validated
public class GradeController {

    @Autowired private GradeService gradeService;

    @Autowired private DashboardService dashboardService;

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @GetMapping("/analysis/{quizId}")
    @Log(title = "成绩分析-详情", businessType = BusinessTypeConstant.GET)
    public JsonResponse analysis(
            @PathVariable Integer quizId,
            @RequestParam(value = "refresh", defaultValue = "false") boolean refresh)
            throws NotFoundException {
        try {
            GradeAnalysisDTO dto = gradeService.calculateStatistics(quizId, refresh);
            Map<String, Object> data = new HashMap<>();
            Map<String, Object> quiz = new HashMap<>();
            quiz.put("id", dto.getQuizId());
            quiz.put("title", dto.getQuizTitle());
            quiz.put("category", dto.getCategory());
            quiz.put("total_score", dto.getTotalScore());
            quiz.put("pass_score", dto.getPassScore());
            quiz.put("exam_date", dto.getExamDate());
            data.put("quiz", quiz);

            Map<String, Object> stats = new HashMap<>();
            stats.put("participant_count", dto.getParticipantCount());
            stats.put("average_score", dto.getAverageScore());
            stats.put("max_score", dto.getMaxScore());
            stats.put("min_score", dto.getMinScore());
            stats.put("median_score", dto.getMedianScore());
            stats.put("pass_rate", dto.getPassRate());
            stats.put("distribution", dto.getDistribution());
            stats.put("updated_at", dto.getStatisticsUpdatedAt());
            data.put("stats", stats);
            return JsonResponse.data(data);
        } catch (IllegalArgumentException e) {
            return JsonResponse.error(e.getMessage());
        }
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @PostMapping("/import")
    @Log(title = "成绩分析-线下成绩导入", businessType = BusinessTypeConstant.INSERT)
    public JsonResponse importOffline(
            @RequestParam("quiz_id") Integer quizId,
            @RequestParam("file") MultipartFile file)
            throws NotFoundException, IOException {
        if (file.isEmpty()) {
            return JsonResponse.error("请上传Excel文件");
        }
        try (InputStream inputStream = file.getInputStream()) {
            OfflineGradeImportResult result =
                    gradeService.importOfflineGrades(quizId, inputStream, BCtx.getId());
            Map<String, Object> data = new HashMap<>();
            data.put("total_rows", result.getTotalRows());
            data.put("success_count", result.getSuccessCount());
            data.put("skipped_count", result.getSkippedCount());
            data.put("errors", result.getErrors());
            return JsonResponse.data(data);
        } catch (IllegalArgumentException e) {
            return JsonResponse.error(e.getMessage());
        }
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @GetMapping("/student/{userId}/trend")
    @Log(title = "成绩分析-学员成绩趋势", businessType = BusinessTypeConstant.GET)
    public JsonResponse trend(
            @PathVariable Integer userId,
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "end", required = false) String end)
            throws NotFoundException {
        try {
            Date startDate = parseDate(start);
            Date endDate = parseDate(end);
                List<UserGradeTrendPoint> points =
                    dashboardService.getUserTrend(userId, startDate, endDate);
            List<Map<String, Object>> rows = new ArrayList<>();
            for (UserGradeTrendPoint point : points) {
                Map<String, Object> item = new HashMap<>();
                item.put("quiz_id", point.getQuizId());
                item.put("quiz_title", point.getQuizTitle());
                item.put("category", point.getCategory());
                item.put("exam_date", point.getExamDate());
                item.put("submitted_at", point.getSubmittedAt());
                item.put("score", point.getScore());
                item.put("passed", point.isPassed());
                rows.add(item);
            }
            return JsonResponse.data(rows);
        } catch (IllegalArgumentException e) {
            return JsonResponse.error(e.getMessage());
        }
    }

    private Date parseDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        DateTimeFormatter[] dateTimeFormatters = {
            DateTimeFormatter.ISO_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        };
        for (DateTimeFormatter formatter : dateTimeFormatters) {
            try {
                LocalDateTime dateTime = LocalDateTime.parse(trimmed, formatter);
                return Date.from(dateTime.atZone(ZoneId.systemDefault()).toInstant());
            } catch (DateTimeParseException ignore) {
                // try next pattern
            }
        }
        DateTimeFormatter[] dateFormatters = {DateTimeFormatter.ofPattern("yyyy-MM-dd")};
        for (DateTimeFormatter formatter : dateFormatters) {
            try {
                LocalDate date = LocalDate.parse(trimmed, formatter);
                return Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
            } catch (DateTimeParseException ignore) {
                // try next pattern
            }
        }
        throw new IllegalArgumentException("日期格式不正确");
    }
}
