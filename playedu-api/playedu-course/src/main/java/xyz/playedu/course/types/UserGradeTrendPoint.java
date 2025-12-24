package xyz.playedu.course.types;

import java.util.Date;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserGradeTrendPoint {
    private Integer quizId;
    private String quizTitle;
    private String category;
    private Date examDate;
    private Date submittedAt;
    private Integer score;
    private boolean passed;
}
