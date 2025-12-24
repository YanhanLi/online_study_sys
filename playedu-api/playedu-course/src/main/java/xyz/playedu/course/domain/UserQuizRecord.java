package xyz.playedu.course.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("user_quiz_records")
@Data
public class UserQuizRecord implements Serializable {
    @TableId(type = IdType.AUTO)
    private Integer id;

    @JsonProperty("user_id")
    private Integer userId;

    @JsonProperty("quiz_id")
    private Integer quizId;

    @JsonProperty("course_hour_id")
    private Integer courseHourId;

    private Integer score;

    @JsonProperty("is_passed")
    private Integer isPassed;

    @JsonIgnore private String userAnswers;

    private String comment;

    @JsonProperty("created_at")
    private Date createdAt;

    private static final long serialVersionUID = 1L;
}
