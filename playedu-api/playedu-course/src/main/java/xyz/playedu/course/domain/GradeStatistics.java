package xyz.playedu.course.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@TableName("grade_statistics")
@Data
public class GradeStatistics implements Serializable {
    @TableId(type = IdType.AUTO)
    private Integer id;

    @JsonProperty("quiz_id")
    private Integer quizId;

    @JsonProperty("participant_count")
    private Integer participantCount;

    @JsonProperty("avg_score")
    private BigDecimal avgScore;

    @JsonProperty("max_score")
    private Integer maxScore;

    @JsonProperty("min_score")
    private Integer minScore;

    @JsonProperty("pass_rate")
    private BigDecimal passRate;

    private String distribution;

    @JsonProperty("updated_at")
    private Date updatedAt;

    private static final long serialVersionUID = 1L;
}
