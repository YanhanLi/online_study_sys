import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Radio,
  Checkbox,
  Button,
  Space,
  message,
} from "antd";
import styles from "./form.module.less";
import type { QuestionPayload, QuestionType } from "../../../api/question";
import { QUESTION_TYPE_OPTIONS } from "../../../constants/question";

const TRUE_FALSE_OPTIONS = [
  { value: "TRUE", label: "正确" },
  { value: "FALSE", label: "错误" },
];

type QuestionOption = {
  value: string;
  label: string;
};

export interface QuestionDetailModel {
  id: number;
  type: QuestionType;
  content: string;
  score: number;
  options: QuestionOption[];
  answer: string[];
}

interface QuestionFormProps {
  open: boolean;
  pending: boolean;
  initialValue?: QuestionDetailModel | null;
  onSubmit: (payload: QuestionPayload) => Promise<void> | void;
  onCancel: () => void;
}

const DEFAULT_OPTION_VALUES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function buildOption(value: string, label = ""): QuestionOption {
  return { value, label };
}

function getDefaultOptions(count: number): QuestionOption[] {
  const items: QuestionOption[] = [];
  for (let i = 0; i < count; i++) {
    const value =
      DEFAULT_OPTION_VALUES[i] ?? `OPTION_${(i + 1).toString().padStart(2, "0")}`;
    items.push(buildOption(value));
  }
  return items;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  open,
  pending,
  initialValue,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE");
  const [options, setOptions] = useState<QuestionOption[]>(getDefaultOptions(2));
  const [answer, setAnswer] = useState<string[]>([]);

  const isSingle = questionType === "SINGLE";
  const isMultiple = questionType === "MULTIPLE";
  const isTrueFalse = questionType === "TRUE_FALSE";

  const answerOptions = useMemo(() => {
    if (isTrueFalse) {
      return TRUE_FALSE_OPTIONS;
    }
    return options.map((item) => ({ value: item.value, label: item.value }));
  }, [isTrueFalse, options]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialValue) {
      form.setFieldsValue({
        type: initialValue.type,
        content: initialValue.content,
        score: initialValue.score,
      });
      setQuestionType(initialValue.type);
      if (initialValue.type === "TRUE_FALSE") {
        setOptions([]);
      } else {
        setOptions(
          initialValue.options.map((item, index) =>
            buildOption(
              item.value ??
                DEFAULT_OPTION_VALUES[index] ??
                  `OPTION_${(index + 1).toString().padStart(2, "0")}`,
              item.label ?? ""
            )
          )
        );
      }
      setAnswer(initialValue.answer ?? []);
    } else {
      form.resetFields();
      setQuestionType("SINGLE");
      setOptions(getDefaultOptions(2));
      setAnswer([]);
    }
  }, [form, initialValue, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isTrueFalse) {
      setAnswer((prev) => {
        if (prev.length === 1 && (prev[0] === "TRUE" || prev[0] === "FALSE")) {
          return prev;
        }
        return ["TRUE"];
      });
    } else if (isSingle) {
      setAnswer((prev) => {
        if (prev.length === 1 && options.some((item) => item.value === prev[0])) {
          return prev;
        }
        const first = options[0]?.value;
        return first ? [first] : [];
      });
    } else if (isMultiple) {
      setAnswer((prev) => prev.filter((item) => options.some((opt) => opt.value === item)));
    }
  }, [isMultiple, isSingle, isTrueFalse, open, options]);

  const changeOptionLabel = (index: number, label: string) => {
    setOptions((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], label };
      return clone;
    });
  };

  const addOption = () => {
    setOptions((prev) => {
      const nextIndex = prev.length;
      const nextValue =
        DEFAULT_OPTION_VALUES[nextIndex] ?? `OPTION_${(nextIndex + 1).toString().padStart(2, "0")}`;
      return [...prev, buildOption(nextValue)];
    });
  };

  const removeOption = (value: string) => {
    setOptions((prev) => prev.filter((item) => item.value !== value));
    setAnswer((prev) => prev.filter((item) => item !== value));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payloadType = questionType;
      const content = (values.content || "").trim();
      if (!content) {
        message.error("请输入题干");
        return;
      }

      const score = Number(values.score || 0);
      if (!score || score <= 0) {
        message.error("题目分值必须大于0");
        return;
      }

      if ((isSingle || isTrueFalse) && answer.length !== 1) {
        message.error("请选择正确答案");
        return;
      }
      if (isMultiple && answer.length === 0) {
        message.error("请至少选择一个正确答案");
        return;
      }

      let normalizedOptions: QuestionOption[] | undefined;
      if (!isTrueFalse) {
        if (options.length < 2) {
          message.error("请至少设置两个选项");
          return;
        }
        const refined = options.map((item) => ({
          value: item.value.trim(),
          label: (item.label || "").trim(),
        }));
        if (refined.some((item) => !item.value || !item.label)) {
          message.error("选项内容不能为空");
          return;
        }
        const distinct = new Set(refined.map((item) => item.value));
        if (distinct.size !== refined.length) {
          message.error("选项值不能重复");
          return;
        }
        if (!answer.every((val) => refined.some((item) => item.value === val))) {
          message.error("答案中包含未定义的选项");
          return;
        }
        normalizedOptions = refined;
      }

      await onSubmit({
        type: payloadType,
        content,
        score,
        options: normalizedOptions,
        answer,
      });
    } catch (err) {
      // Form validation errors already surfaced; swallow here.
    }
  };

  return (
    <Modal
      open={open}
      title={initialValue ? "编辑题目" : "新增题目"}
      width={720}
      onCancel={onCancel}
      destroyOnClose
      confirmLoading={pending}
      onOk={handleSubmit}
      okText={initialValue ? "保 存" : "新 建"}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="题目类型"
          name="type"
          initialValue={questionType}
          rules={[{ required: true, message: "请选择题目类型" }]}
        >
          <Select
            options={QUESTION_TYPE_OPTIONS as { label: string; value: QuestionType }[]}
            value={questionType}
            onChange={(value: QuestionType) => {
              setQuestionType(value);
              form.setFieldsValue({ type: value });
              if (value === "TRUE_FALSE") {
                setOptions([]);
              } else {
                setOptions((prev) => {
                  if (prev.length === 0) {
                    return getDefaultOptions(2);
                  }
                  return prev;
                });
              }
            }}
          />
        </Form.Item>
        <Form.Item
          label="题干"
          name="content"
          rules={[{ required: true, message: "请输入题干" }]}
        >
          <Input.TextArea rows={4} placeholder="请输入题干" allowClear />
        </Form.Item>
        <Form.Item
          label="题目分值"
          name="score"
          rules={[{ required: true, message: "请输入题目分值" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} placeholder="请输入题目分值" />
        </Form.Item>
        {isTrueFalse ? (
          <Form.Item label="正确答案">
            <Radio.Group
              options={TRUE_FALSE_OPTIONS}
              value={answer[0]}
              onChange={(e) => setAnswer([e.target.value])}
            />
            <div className={styles.answerHint}>判断题默认附带“正确/错误”两个选项。</div>
          </Form.Item>
        ) : (
          <>
            <Form.Item label="选项设置">
              <Space direction="vertical" className={styles.optionList} style={{ width: "100%" }}>
                {options.map((item, index) => (
                  <div className={styles.optionItem} key={item.value}>
                    <div className={styles.optionValue}>{item.value}</div>
                    <Input
                      className={styles.optionInput}
                      value={item.label}
                      placeholder={`请输入选项${item.value}内容`}
                      allowClear
                      onChange={(e) => changeOptionLabel(index, e.target.value)}
                    />
                    {options.length > 2 && (
                      <Button danger type="link" onClick={() => removeOption(item.value)}>
                        删除
                      </Button>
                    )}
                  </div>
                ))}
              </Space>
              <div className={styles.actions}>
                <Button type="link" onClick={addOption}>
                  新增选项
                </Button>
              </div>
            </Form.Item>
            <Form.Item label="正确答案">
              {isSingle ? (
                <Radio.Group
                  options={answerOptions}
                  value={answer[0]}
                  onChange={(e) => setAnswer([e.target.value])}
                />
              ) : (
                <Checkbox.Group
                  options={answerOptions}
                  value={answer}
                  onChange={(values) => setAnswer(values as string[])}
                />
              )}
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};
