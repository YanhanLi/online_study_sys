package xyz.playedu.api.request.frontend;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class QuizSubmitRequest {
    @NotEmpty(message = "请提交作答内容")
    @JsonProperty("answers")
    private Map<Integer, List<String>> answers;
}
