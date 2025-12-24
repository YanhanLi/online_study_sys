package xyz.playedu.course.types;

import java.util.Date;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GradeAnalysisDTO {
    private Integer quizId;
    private String quizTitle;
    private String category;
    private Date examDate;
    private Integer totalScore;
    private Integer passScore;
    private int participantCount;
    private double averageScore;
    private int maxScore;
    private int minScore;
    private double medianScore;
    private double passRate;
    private Map<String, Integer> distribution;
    private Date statisticsUpdatedAt;
}
