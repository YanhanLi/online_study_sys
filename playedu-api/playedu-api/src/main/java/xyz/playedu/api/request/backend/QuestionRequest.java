package xyz.playedu.api.request.backend;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Data;

@Data
public class QuestionRequest {
    @NotBlank(message = "请选择题目类型")
    private String type;

    @NotBlank(message = "请输入题干")
    private String content;

    @Valid private List<OptionItem> options;

    @NotEmpty(message = "请设置正确答案")
    private List<String> answer;

    @NotNull(message = "请设置题目分值")
    @Min(value = 1, message = "题目分值不能小于1")
    private Integer score;

    @Data
    public static class OptionItem {
        @NotBlank(message = "选项值不能为空")
        private String value;

        @NotBlank(message = "选项内容不能为空")
        private String label;
    }
}
