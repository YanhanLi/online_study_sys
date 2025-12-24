package xyz.playedu.api.request.backend;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Data;

@Data
public class QuizRequest {
    @NotBlank(message = "请输入练习标题")
    private String title;

    @JsonProperty("pass_score")
    @Min(value = 0, message = "及格分数不能小于0")
    private Integer passScore;

    @JsonProperty("question_ids")
    private List<Integer> questionIds;

    private String category;

    @JsonProperty("total_score")
    private Integer totalScore;

    @JsonProperty("exam_date")
    private String examDate;
}
