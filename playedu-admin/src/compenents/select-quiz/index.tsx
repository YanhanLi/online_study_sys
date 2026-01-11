import { useEffect, useMemo, useState } from "react";
import { Modal, Table, Input, Button, Space, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import styles from "./index.module.less";
import { quiz as quizApi } from "../../api";
import { dateFormat } from "../../utils";

interface QuizListItem {
  id: number;
  title: string;
  total_score: number;
  pass_score: number;
  question_count: number;
  updated_at?: string;
}

export interface SelectedQuizPayload {
  quiz_id: number;
  type: string;
  name: string;
  duration: number;
}

interface PropsInterface {
  defaultKeys: number[];
  open: boolean;
  onSelected: (keys: number[], quizzes: SelectedQuizPayload[]) => void;
  onCancel: () => void;
}

export const SelectQuiz: React.FC<PropsInterface> = ({
  defaultKeys,
  open,
  onSelected,
  onCancel,
}) => {
  const [list, setList] = useState<QuizListItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<number, QuizListItem>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (open) {
      setPage(1);
      setSize(10);
      setKeyword("");
      setSelectedRowKeys(defaultKeys);
      setSelectedMap({});
      setRefresh((prev) => !prev);
    }
  }, [open, defaultKeys]);

  useEffect(() => {
    if (!open) {
      return;
    }
    loadData();
  }, [open, page, size, refresh]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await quizApi.quizList(page, size, keyword || undefined);
      const data = res.data;
      setList(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      message.error(err?.message || "练习列表加载失败");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<QuizListItem> = useMemo(
    () => [
      {
        title: "练习标题",
        dataIndex: "title",
        render: (value: string) => <span>{value}</span>,
      },
      {
        title: "题目数量",
        dataIndex: "question_count",
        width: 100,
      },
      {
        title: "总分",
        dataIndex: "total_score",
        width: 100,
      },
      {
        title: "及格分",
        dataIndex: "pass_score",
        width: 100,
      },
      {
        title: "更新时间",
        dataIndex: "updated_at",
        width: 180,
        render: (value?: string) => (value ? dateFormat(value) : "-"),
      },
    ],
    []
  );

  const handleOk = () => {
    const quizIds = selectedRowKeys.map(Number);
    const quizzes = quizIds
      .map((id) => selectedMap[id] || list.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({
        quiz_id: item!.id,
        type: "QUIZ",
        name: item!.title,
        duration: 0,
      }));
    onSelected(quizIds, quizzes);
    onCancel();
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: QuizListItem[]) => {
      const keyNumbers = keys.map(Number);
      const nextMap: Record<number, QuizListItem> = {};
      keyNumbers.forEach((key) => {
        if (selectedMap[key]) {
          nextMap[key] = selectedMap[key];
        }
      });
      rows.forEach((row) => {
        nextMap[row.id] = row;
      });
      setSelectedMap(nextMap);
      setSelectedRowKeys(keys);
    },
    getCheckboxProps: (record: QuizListItem) => ({
      disabled: defaultKeys.includes(record.id),
    }),
  };

  return (
    <>
      {open ? (
        <Modal
          title="练习库"
          centered
          open={open}
          width={900}
          okText="确 认"
          cancelText="取 消"
          destroyOnClose
          confirmLoading={loading}
          onOk={handleOk}
          onCancel={onCancel}
        >
          <div className={styles.toolbar}>
            <Input
              value={keyword}
              allowClear
              style={{ width: 220 }}
              placeholder="请输入练习名称"
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Space>
              <Button
                onClick={() => {
                  setKeyword("");
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
          </div>
          <div className={styles.tableWrap}>
            <Table<QuizListItem>
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
          </div>
        </Modal>
      ) : null}
    </>
  );
};
