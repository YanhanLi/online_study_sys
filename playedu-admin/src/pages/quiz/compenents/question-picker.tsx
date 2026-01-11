import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Table,
  Select,
  Input,
  Space,
  Button,
  message,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { question as questionApi } from "../../../api";
import type { QuestionType } from "../../../api/question";
import type { QuestionDetailModel } from "../../question/compenents/form";
import {
  QUESTION_TYPE_MAP,
  QUESTION_TYPE_OPTIONS,
} from "../../../constants/question";
import { dateFormat } from "../../../utils";

interface QuestionListItem extends QuestionDetailModel {
  created_at?: string;
  updated_at?: string;
}

interface QuestionPickerProps {
  open: boolean;
  defaultSelectedIds: number[];
  presetQuestions: QuestionDetailModel[];
  onSubmit: (selected: QuestionDetailModel[]) => void;
  onCancel: () => void;
}

export const QuestionPicker: React.FC<QuestionPickerProps> = ({
  open,
  defaultSelectedIds,
  presetQuestions,
  onSubmit,
  onCancel,
}) => {
  const [list, setList] = useState<QuestionListItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<number, QuestionDetailModel>>({});
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState<string | undefined>();
  const [type, setType] = useState<QuestionType | undefined>();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (open) {
      setPage(1);
      setSize(10);
      setType(undefined);
      setKeyword(undefined);
      setSelectedRowKeys(defaultSelectedIds);
      const map: Record<number, QuestionDetailModel> = {};
      presetQuestions.forEach((item) => {
        map[item.id] = item;
      });
      setSelectedMap(map);
      setRefresh((prev) => !prev);
    }
  }, [open, defaultSelectedIds, presetQuestions]);

  useEffect(() => {
    if (!open) {
      return;
    }
    loadData();
  }, [open, page, size, keyword, type, refresh]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await questionApi.questionList(
        page,
        size,
        type,
        keyword || undefined
      );
      const data = res.data;
      setList(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      message.error(err?.message || "题目列表加载失败");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<QuestionListItem> = useMemo(
    () => [
      {
        title: "题目类型",
        dataIndex: "type",
        width: 100,
        render: (value: QuestionType) => QUESTION_TYPE_MAP[value],
      },
      {
        title: "题干",
        dataIndex: "content",
        render: (value: string) => (
          <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
            {value}
          </Typography.Paragraph>
        ),
      },
      {
        title: "分值",
        dataIndex: "score",
        width: 80,
      },
      {
        title: "更新时间",
        dataIndex: "updated_at",
        width: 170,
        render: (value?: string) => (value ? dateFormat(value) : "-"),
      },
    ],
    []
  );

  const handleSubmit = () => {
    const result = selectedRowKeys
      .map((key) => Number(key))
      .map((id) => selectedMap[id] || list.find((item) => item.id === id))
      .filter(Boolean) as QuestionDetailModel[];
    onSubmit(result);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: QuestionListItem[]) => {
      const map: Record<number, QuestionDetailModel> = {};
      keys.map(Number).forEach((key) => {
        if (selectedMap[key]) {
          map[key] = selectedMap[key];
        }
      });
      rows.forEach((row) => {
        map[row.id] = {
          id: row.id,
          type: row.type,
          content: row.content,
          score: row.score,
          options: row.options,
          answer: row.answer,
        };
      });
      setSelectedMap(map);
      setSelectedRowKeys(keys);
    },
  };

  return (
    <Modal
      open={open}
      width={960}
      title="选择题目"
      okText="确 认"
      cancelText="取 消"
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnClose
      confirmLoading={loading}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder="题目类型"
          value={type}
          options={QUESTION_TYPE_OPTIONS}
          onChange={(val) => {
            setType(val as QuestionType | undefined);
            setPage(1);
          }}
        />
        <Input
          style={{ width: 220 }}
          placeholder="请输入题干关键字"
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value || undefined)}
        />
        <Button
          onClick={() => {
            setType(undefined);
            setKeyword(undefined);
            setPage(1);
            setRefresh((prev) => !prev);
          }}
        >
          重 置
        </Button>
        <Button
          type="primary"
          onClick={() => {
            setPage(1);
            setRefresh((prev) => !prev);
          }}
        >
          查 询
        </Button>
      </Space>
      <Table<QuestionListItem>
        rowSelection={{
          type: "checkbox",
          ...rowSelection,
        }}
        columns={columns}
        dataSource={list}
        loading={loading}
        rowKey={(record) => record.id}
        pagination={{
          current: page,
          pageSize: size,
          total,
          showSizeChanger: true,
          onChange: (current, pageSize) => {
            setPage(current);
            setSize(pageSize);
          },
        }}
      />
    </Modal>
  );
};
