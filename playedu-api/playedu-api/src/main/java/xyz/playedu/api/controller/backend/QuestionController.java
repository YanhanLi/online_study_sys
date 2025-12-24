package xyz.playedu.api.controller.backend;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;
import xyz.playedu.api.request.backend.QuestionRequest;
import xyz.playedu.common.annotation.BackendPermission;
import xyz.playedu.common.annotation.Log;
import xyz.playedu.common.constant.BPermissionConstant;
import xyz.playedu.common.constant.BackendConstant;
import xyz.playedu.common.constant.BusinessTypeConstant;
import xyz.playedu.common.context.BCtx;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.common.types.JsonResponse;
import xyz.playedu.course.domain.Question;
import xyz.playedu.course.service.QuestionService;

@RestController
@Slf4j
@RequestMapping("/backend/v1/questions")
public class QuestionController {

    @Autowired private QuestionService questionService;

    @Autowired private ObjectMapper objectMapper;

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @GetMapping
    @Log(title = "题库-列表", businessType = BusinessTypeConstant.GET)
    public JsonResponse index(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String keyword) {
        var query = questionService.lambdaQuery();
        if (StringUtils.hasText(type)) {
            query.eq(Question::getType, normalizeType(type));
        }
        if (StringUtils.hasText(keyword)) {
            query.like(Question::getContent, keyword.trim());
        }

        Page<Question> pager = questionService.page(new Page<>(page, size), query.getWrapper());
        List<Map<String, Object>> items = new ArrayList<>();
        for (Question q : pager.getRecords()) {
            items.add(buildQuestionDetail(q));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("data", items);
        data.put("total", pager.getTotal());
        return JsonResponse.data(data);
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @PostMapping
    @Log(title = "题库-新增", businessType = BusinessTypeConstant.INSERT)
    public JsonResponse store(@Validated @RequestBody QuestionRequest req) {
        try {
            QuestionPayload payload = buildPayload(req);
            Question question =
                    questionService.create(
                            payload.type,
                            payload.content,
                            payload.optionsJson,
                            payload.answerJson,
                            payload.score,
                            BCtx.getId());
            return JsonResponse.data(buildQuestionDetail(question));
        } catch (IllegalArgumentException e) {
            return JsonResponse.error(e.getMessage());
        }
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @GetMapping("/{id}")
    @Log(title = "题库-详情", businessType = BusinessTypeConstant.GET)
    public JsonResponse show(@PathVariable Integer id) throws NotFoundException {
        Question question = questionService.findOrFail(id);
        return JsonResponse.data(buildQuestionDetail(question));
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @PutMapping("/{id}")
    @Log(title = "题库-更新", businessType = BusinessTypeConstant.UPDATE)
    public JsonResponse update(
            @PathVariable Integer id, @Validated @RequestBody QuestionRequest req)
            throws NotFoundException {
        Question question = questionService.findOrFail(id);
        try {
            QuestionPayload payload = buildPayload(req);
            questionService.update(
                    question,
                    payload.type,
                    payload.content,
                    payload.optionsJson,
                    payload.answerJson,
                    payload.score);
            return JsonResponse.success();
        } catch (IllegalArgumentException e) {
            return JsonResponse.error(e.getMessage());
        }
    }

    @BackendPermission(slug = BPermissionConstant.COURSE)
    @DeleteMapping("/{id}")
    @Log(title = "题库-删除", businessType = BusinessTypeConstant.DELETE)
    public JsonResponse destroy(@PathVariable Integer id) throws NotFoundException {
        questionService.findOrFail(id);
        questionService.removeById(id);
        return JsonResponse.success();
    }

    private Map<String, Object> buildQuestionDetail(Question question) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", question.getId());
        map.put("type", question.getType());
        map.put("content", question.getContent());
        map.put("score", question.getScore());
        map.put("options", readOptions(question.getOptions()));
        map.put("answer", readAnswer(question.getAnswer()));
        return map;
    }

    private List<Map<String, Object>> readOptions(String json) {
        if (!StringUtils.hasText(json)) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("题目选项解析失败", e);
        }
    }

    private List<String> readAnswer(String json) {
        if (!StringUtils.hasText(json)) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("题目答案解析失败", e);
        }
    }

    private QuestionPayload buildPayload(QuestionRequest req) {
        String type = normalizeType(req.getType());
        ensureTypeSupported(type);

        List<QuestionRequest.OptionItem> options = normalizeOptions(req.getOptions());
        if (BackendConstant.QUESTION_TYPE_TRUE_FALSE.equals(type)) {
            options = ensureTrueFalseOptions(options);
        }

        if (!BackendConstant.QUESTION_TYPE_TRUE_FALSE.equals(type)) {
            if (options == null || options.size() < 2) {
                throw new IllegalArgumentException("请至少添加两个选项");
            }
        }

        if (options != null) {
            ensureOptionValuesUnique(options);
        }

        List<String> answer = req.getAnswer().stream().map(String::trim).toList();
        if (BackendConstant.QUESTION_TYPE_SINGLE.equals(type)
                || BackendConstant.QUESTION_TYPE_TRUE_FALSE.equals(type)) {
            if (answer.size() != 1) {
                throw new IllegalArgumentException("该题型仅允许单选答案");
            }
        }

        ensureAnswerInOptions(options, answer);

        if (req.getScore() == null || req.getScore() <= 0) {
            throw new IllegalArgumentException("题目分值必须大于0");
        }

        return new QuestionPayload(
                type,
                req.getContent().trim(),
                writeOptions(options),
                writeAnswer(answer),
                req.getScore());
    }

    private void ensureTypeSupported(String type) {
        if (!Arrays.asList(BackendConstant.QUESTION_TYPE_WHITELIST).contains(type)) {
            throw new IllegalArgumentException("题目类型不支持");
        }
    }

    private List<QuestionRequest.OptionItem> ensureTrueFalseOptions(
            List<QuestionRequest.OptionItem> options) {
        List<QuestionRequest.OptionItem> result = new ArrayList<>();
        if (options != null && options.size() >= 2) {
            return options;
        }
        QuestionRequest.OptionItem trueItem = new QuestionRequest.OptionItem();
        trueItem.setValue("TRUE");
        trueItem.setLabel("正确");
        QuestionRequest.OptionItem falseItem = new QuestionRequest.OptionItem();
        falseItem.setValue("FALSE");
        falseItem.setLabel("错误");
        result.add(trueItem);
        result.add(falseItem);
        return result;
    }

    private List<QuestionRequest.OptionItem> normalizeOptions(
            List<QuestionRequest.OptionItem> options) {
        if (options == null) {
            return null;
        }
        List<QuestionRequest.OptionItem> normalized = new ArrayList<>();
        for (QuestionRequest.OptionItem option : options) {
            QuestionRequest.OptionItem item = new QuestionRequest.OptionItem();
            item.setValue(option.getValue() == null ? null : option.getValue().trim());
            item.setLabel(option.getLabel() == null ? null : option.getLabel().trim());
            normalized.add(item);
        }
        return normalized;
    }

    private void ensureOptionValuesUnique(List<QuestionRequest.OptionItem> options) {
        if (options == null) {
            return;
        }
        List<String> seen = new ArrayList<>();
        for (QuestionRequest.OptionItem item : options) {
            String value = item.getValue();
            if (seen.contains(value)) {
                throw new IllegalArgumentException("选项值不能重复");
            }
            seen.add(value);
        }
    }

    private void ensureAnswerInOptions(
            List<QuestionRequest.OptionItem> options, List<String> answer) {
        if (options == null || options.isEmpty()) {
            return;
        }
        List<String> allowed = new ArrayList<>();
        for (QuestionRequest.OptionItem option : options) {
            allowed.add(option.getValue());
        }
        for (String ans : answer) {
            if (!allowed.contains(ans)) {
                throw new IllegalArgumentException("答案中包含未定义的选项");
            }
        }
    }

    private String writeOptions(List<QuestionRequest.OptionItem> options) {
        try {
            return objectMapper.writeValueAsString(options);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("题目选项写入失败", e);
        }
    }

    private String writeAnswer(List<String> answer) {
        try {
            return objectMapper.writeValueAsString(answer);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("题目答案写入失败", e);
        }
    }

    private String normalizeType(String type) {
        return type == null ? null : type.trim().toUpperCase();
    }

    private record QuestionPayload(
            String type, String content, String optionsJson, String answerJson, Integer score) {}
}
