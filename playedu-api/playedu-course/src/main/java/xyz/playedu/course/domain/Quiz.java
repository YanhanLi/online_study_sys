package xyz.playedu.course.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("quizzes")
@Data
public class Quiz implements Serializable {
    @TableId(type = IdType.AUTO)
    private Integer id;

    private String title;

    private String category;

    @JsonProperty("total_score")
    private Integer totalScore;

    @JsonProperty("pass_score")
    private Integer passScore;

    @JsonProperty("exam_date")
    private Date examDate;

    @JsonIgnore private String questionIds;

    @JsonIgnore private Integer adminId;

    @JsonIgnore private Date createdAt;

    @JsonIgnore private Date updatedAt;

    private static final long serialVersionUID = 1L;
}
