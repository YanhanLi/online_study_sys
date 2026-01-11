import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Table,
  Typography,
  message,
  Popconfirm,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import styles from "./index.module.less";
import { BackBartment } from "../../compenents";
import { quiz as quizApi } from "../../api";
import { QuizForm } from "./compenents/form";
import type { QuizDetailModel } from "./compenents/form";
import type { QuizPayload } from "../../api/quiz";
import { dateFormat } from "../../utils";
import { useNavigate, useLocation } from "react-router-dom";
import { OfflineImportModal } from "../../compenents/offline-grade-import";

interface QuizRecord {
  id: number;
  title: string;
  total_score: number;
  pass_score: number;
  question_count: number;
  updated_at?: string;
  category?: string;
  exam_date?: string;
  participant_count?: number;
  pass_rate?: number;
  avg_score?: number;
  max_score?: number;
  min_score?: number;
  statistics_updated_at?: string;
}

export default function QuizPage() {
  const [form] = Form.useForm();
  const [records, setRecords] = useState<QuizRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<QuizDetailModel | null>(null);
  const [keyword, setKeyword] = useState<string>();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<QuizRecord | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const totalQuestion = useMemo(
    () => records.reduce((sum, item) => sum + (item.question_count || 0), 0),
    [records]
  );

  useEffect(() => {
    load();
  }, [page, size, keyword]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const kw = params.get("keyword") || undefined;
    if (kw !== keyword) {
      setKeyword(kw);
      if (kw) {
        form.setFieldsValue({ keyword: kw });
      } else {
        form.resetFields();
      }
      setPage(1);
    }
  }, [location.search, keyword, form]);

  const normalizeRecord = (item: any): QuizRecord => ({
    ...item,
    pass_rate:
      item?.pass_rate !== null && item?.pass_rate !== undefined
        ? Number(item.pass_rate)
        : undefined,
    avg_score:
      item?.avg_score !== null && item?.avg_score !== undefined
        ? Number(item.avg_score)
        : undefined,
    participant_count:
      item?.participant_count !== null && item?.participant_count !== undefined
        ? Number(item.participant_count)
        : undefined,
    max_score:
      item?.max_score !== null && item?.max_score !== undefined
        ? Number(item.max_score)
        : undefined,
    min_score:
      item?.min_score !== null && item?.min_score !== undefined
        ? Number(item.min_score)
        : undefined,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await quizApi.quizList(page, size, keyword || undefined);
      const data = res.data;
      const list: QuizRecord[] = Array.isArray(data.data)
        ? (data.data as any[]).map(normalizeRecord)
        : [];
      setRecords(list);
      setTotal(data.total || 0);
    } catch (err: any) {
      message.error(err?.message || "练习列表加载失败");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setDialogOpen(true);
    setEditingId(null);
    setDetail(null);
  };

  const openEdit = async (id: number) => {
    setPending(true);
    try {
      const res: any = await quizApi.quiz(id);
      setDetail(res.data as QuizDetailModel);
      setEditingId(id);
      setDialogOpen(true);
    } catch (err: any) {
      message.error(err?.message || "获取练习详情失败");
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (payload: QuizPayload) => {
    setPending(true);
    try {
      if (editingId) {
        await quizApi.updateQuiz(editingId, payload);
        message.success("练习更新成功");
      } else {
        await quizApi.storeQuiz(payload);
        message.success("练习创建成功");
      }
      setDialogOpen(false);
      setEditingId(null);
      setDetail(null);
      load();
    } catch (err: any) {
      message.error(err?.message || "操作失败");
    } finally {
      setPending(false);
    }
  };

  const handleDestroy = async (id: number) => {
    setLoading(true);
    try {
      await quizApi.destroyQuiz(id);
      message.success("删除成功");
      load();
    } catch (err: any) {
      message.error(err?.message || "删除失败");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<QuizRecord> = [
    {
      title: "练习标题",
      dataIndex: "title",
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "分类",
      dataIndex: "category",
      width: 140,
      align: "center" as const,
      render: (value?: string) =>
        value === "OFFLINE_MANUAL" ? (
          <Tag color="blue" bordered={false} className={styles.categoryTag}>
            线下人工
          </Tag>
        ) : (
          <Tag color="green" bordered={false} className={styles.categoryTag}>
            线上自动
          </Tag>
        ),
    },
    {
      title: "题目数量",
      dataIndex: "question_count",
      width: 120,
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
      title: "考试时间",
      dataIndex: "exam_date",
      width: 180,
      render: (value?: string) => (value ? dateFormat(value) : "-"),
    },
    {
      title: "参与人数",
      dataIndex: "participant_count",
      width: 120,
      render: (value?: number) => (typeof value === "number" ? value : "-"),
    },
    {
      title: "及格率",
      dataIndex: "pass_rate",
      width: 120,
      render: (value?: number) =>
        typeof value === "number" ? `${Math.round(value * 1000) / 10}%` : "-",
    },
    {
      title: "平均分",
      dataIndex: "avg_score",
      width: 120,
      render: (value?: number) =>
        typeof value === "number" ? (Math.round(value * 10) / 10).toFixed(1) : "-",
    },
    {
      title: "最高/最低分",
      dataIndex: "max_score",
      width: 140,
      render: (_: number, record) => {
        if (
          typeof record?.max_score === "number" &&
          typeof record?.min_score === "number"
        ) {
          return `${record.max_score}/${record.min_score}`;
        }
        return "-";
      },
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      width: 180,
      render: (value?: string) => (value ? dateFormat(value) : "-"),
    },
    {
      title: "统计刷新时间",
      dataIndex: "statistics_updated_at",
      width: 200,
      render: (value?: string) => (value ? dateFormat(value) : "-"),
    },
    {
      title: "操作",
      key: "action",
      width: 220,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEdit(record.id)}>
            编辑
          </Button>
          <Button
            type="link"
            onClick={() => navigate(`/grade/analysis/${record.id}`)}
          >
            成绩分析
          </Button>
          {record.category === "OFFLINE_MANUAL" && (
            <Button
              type="link"
              onClick={() => {
                setImportTarget(record);
                setImportOpen(true);
              }}
            >
              录入成绩
            </Button>
          )}
          <Popconfirm
            title="删除确认"
            description="确认删除该练习吗？"
            onConfirm={() => handleDestroy(record.id)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="playedu-main-body">
      <Card bordered={false}>
        <BackBartment title="练习管理" />
        <div className="float-left" style={{ width: "100%" }}>
          <div className={styles.actionBar}>
            <div className={styles.filterBar}>
              <Form
                form={form}
                layout="inline"
                onFinish={(values) => {
                  setPage(1);
                  setKeyword(values.keyword || undefined);
                }}
              >
                <Form.Item label="关键词" name="keyword">
                  <Input placeholder="练习名称" allowClear style={{ width: 220 }} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      onClick={() => {
                        form.resetFields();
                        setKeyword(undefined);
                        setPage(1);
                      }}
                    >
                      重置
                    </Button>
                    <Button type="primary" htmlType="submit">
                      查询
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
            <Space>
              <Typography.Text type="secondary">
                当前页合计题目数：{totalQuestion}
              </Typography.Text>
              <Button onClick={() => navigate("/grade/overview")}>成绩中心</Button>
              <Button type="primary" onClick={openCreate}>
                新增练习
              </Button>
            </Space>
          </div>
          <Table<QuizRecord>
            rowKey="id"
            loading={loading}
            dataSource={records}
            columns={columns}
            scroll={{ x: 1500 }}
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
      </Card>
      <QuizForm
        open={dialogOpen}
        pending={pending}
        initialValue={detail || undefined}
        onCancel={() => {
          setDialogOpen(false);
          setDetail(null);
          setEditingId(null);
        }}
        onSubmit={handleSubmit}
      />
      <OfflineImportModal
        open={importOpen}
        quiz={importTarget || undefined}
        onCancel={() => {
          setImportOpen(false);
          setImportTarget(null);
        }}
        onImported={() => {
          setImportOpen(false);
          setImportTarget(null);
          load();
        }}
      />
    </div>
  );
}
