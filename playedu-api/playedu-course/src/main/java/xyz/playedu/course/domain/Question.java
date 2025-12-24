package xyz.playedu.course.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("questions")
@Data
public class Question implements Serializable {
    @TableId(type = IdType.AUTO)
    private Integer id;

    private String type;

    private String content;

    @JsonIgnore private String options;

    @JsonIgnore private String answer;

    private Integer score;

    @JsonIgnore private Integer adminId;

    @JsonIgnore private Date createdAt;

    @JsonIgnore private Date updatedAt;

    private static final long serialVersionUID = 1L;
}
