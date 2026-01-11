import { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Button,
  Space,
  message,
  Select,
  DatePicker,
} from "antd";
import type { QuestionDetailModel } from "../../question/compenents/form";
import { QuestionPicker } from "./question-picker";
import { SelectedQuestionList } from "./selected-question-list";
import type { QuizPayload } from "../../../api/quiz";
import dayjs from "dayjs";

export interface QuizDetailModel {
  id: number;
  title: string;
  pass_score: number;
  total_score: number;
  category: string;
  exam_date?: string;
  question_ids: number[];
  questions: QuestionDetailModel[];
}

interface QuizFormProps {
  open: boolean;
  pending: boolean;
  initialValue?: QuizDetailModel | null;
  onSubmit: (payload: QuizPayload) => Promise<void> | void;
  onCancel: () => void;
}

export const QuizForm: React.FC<QuizFormProps> = ({
  open,
  pending,
  initialValue,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [category, setCategory] = useState<string>("ONLINE_AUTO");
  const [selectedQuestions, setSelectedQuestions] = useState<
    QuestionDetailModel[]
  >([]);

  const manualTotalScore = Form.useWatch("total_score", form);

  const totalScore = useMemo(
    () => selectedQuestions.reduce((sum, item) => sum + (item.score || 0), 0),
    [selectedQuestions]
  );

  const isOffline = category === "OFFLINE_MANUAL";

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialValue) {
      form.setFieldsValue({
        title: initialValue.title,
        pass_score: initialValue.pass_score,
        category: initialValue.category || "ONLINE_AUTO",
        exam_date: initialValue.exam_date
          ? dayjs(initialValue.exam_date)
          : undefined,
        total_score: initialValue.total_score,
      });
      setCategory(initialValue.category || "ONLINE_AUTO");
      setSelectedQuestions(initialValue.questions || []);
    } else {
      form.resetFields();
      form.setFieldsValue({ category: "ONLINE_AUTO", pass_score: 0 });
      setSelectedQuestions([]);
      setCategory("ONLINE_AUTO");
    }
  }, [open, initialValue, form]);

  useEffect(() => {
    if (!open || isOffline) {
      return;
    }
    if (selectedQuestions.length === 0) {
      form.setFieldsValue({ pass_score: 0 });
      return;
    }
    const current = form.getFieldValue("pass_score");
    if (current === undefined || current === null) {
      form.setFieldsValue({ pass_score: totalScore });
      return;
    }
    if (current > totalScore) {
      form.setFieldsValue({ pass_score: totalScore });
    }
  }, [open, selectedQuestions, totalScore, form, isOffline]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const title = (values.title || "").trim();
      if (!title) {
        message.error("请输入练习标题");
        return;
      }
      const currentCategory = values.category || "ONLINE_AUTO";
      let questionIds = selectedQuestions.map((item) => item.id);
      if (currentCategory === "ONLINE_AUTO" && questionIds.length === 0) {
        message.error("请至少选择一道题目");
        return;
      }

      const passScore = Number(values.pass_score ?? 0);
      if (passScore < 0) {
        message.error("及格分不能小于0");
        return;
      }
      let submitTotalScore = totalScore;
      if (currentCategory === "OFFLINE_MANUAL") {
        questionIds = [];
        submitTotalScore = Number(values.total_score ?? 0);
        if (!submitTotalScore || submitTotalScore <= 0) {
          message.error("请填写线下考试总分");
          return;
        }
        if (passScore > submitTotalScore) {
          message.error("及格分不能超过总分");
          return;
        }
      } else if (passScore > totalScore) {
        message.error("及格分不能超过总分");
        return;
      }

      await onSubmit({
        title,
        pass_score: passScore,
        question_ids: questionIds,
        category: currentCategory,
        total_score:
          currentCategory === "OFFLINE_MANUAL" ? submitTotalScore : undefined,
        exam_date: values.exam_date
          ? values.exam_date.format("YYYY-MM-DD HH:mm:ss")
          : null,
      });
    } catch (err) {
      // handled by form validation or message above
    }
  };

  const removeQuestion = (id: number) => {
    setSelectedQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  const moveUp = (index: number) => {
    if (index === 0) {
      return;
    }
    setSelectedQuestions((prev) => {
      const clone = [...prev];
      [clone[index - 1], clone[index]] = [clone[index], clone[index - 1]];
      return clone;
    });
  };

  const moveDown = (index: number) => {
    setSelectedQuestions((prev) => {
      if (index >= prev.length - 1) {
        return prev;
      }
      const clone = [...prev];
      [clone[index + 1], clone[index]] = [clone[index], clone[index + 1]];
      return clone;
    });
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        onOk={handleSubmit}
        okText={initialValue ? "保 存" : "新 建"}
        title={initialValue ? "编辑练习" : "新增练习"}
        width={900}
        confirmLoading={pending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="练习标题"
            name="title"
            rules={[{ required: true, message: "请输入练习标题" }]}
          >
            <Input placeholder="请输入练习标题" allowClear />
          </Form.Item>
          <Form.Item
            label="练习分类"
            name="category"
            initialValue="ONLINE_AUTO"
            rules={[{ required: true, message: "请选择练习分类" }]}
          >
            <Select
              options={[
                { label: "线上自动", value: "ONLINE_AUTO" },
                { label: "线下人工", value: "OFFLINE_MANUAL" },
              ]}
              onChange={(value) => {
                setCategory(value);
                if (value === "OFFLINE_MANUAL") {
                  form.setFieldsValue({ pass_score: 0, total_score: undefined });
                  setSelectedQuestions([]);
                } else {
                  form.setFieldsValue({ total_score: undefined });
                }
              }}
            />
          </Form.Item>
          <Form.Item label="考试时间" name="exam_date">
            <DatePicker
              style={{ width: "100%" }}
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择考试时间"
            />
          </Form.Item>
          {category === "ONLINE_AUTO" && (
            <Form.Item label="题目列表">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button type="primary" onClick={() => setPickerOpen(true)}>
                  选择题目
                </Button>
                <SelectedQuestionList
                  items={selectedQuestions}
                  onRemove={removeQuestion}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                />
              </Space>
            </Form.Item>
          )}
          {category === "OFFLINE_MANUAL" && (
            <Form.Item
              label="考试总分"
              name="total_score"
              rules={[{ required: true, message: "请填写考试总分" }]}
            >
              <InputNumber
                min={1}
                style={{ width: "100%" }}
                placeholder="请输入考试总分"
              />
            </Form.Item>
          )}
          <Form.Item
            label="及格分"
            name="pass_score"
            rules={[{ required: true, message: "请设置及格分" }]}
          >
            <InputNumber
              min={0}
              max={
                isOffline
                  ? manualTotalScore && manualTotalScore > 0
                    ? manualTotalScore
                    : undefined
                  : totalScore
              }
              style={{ width: "100%" }}
              placeholder="请输入及格分"
            />
          </Form.Item>
          {category === "ONLINE_AUTO" && <div>当前总分：{totalScore}</div>}
        </Form>
      </Modal>
      <QuestionPicker
        open={pickerOpen}
        defaultSelectedIds={selectedQuestions.map((item) => item.id)}
        presetQuestions={selectedQuestions}
        onCancel={() => setPickerOpen(false)}
        onSubmit={(questions) => {
          setSelectedQuestions(questions);
          setPickerOpen(false);
        }}
      />
    </>
  );
};
