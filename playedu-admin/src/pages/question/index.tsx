import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import styles from "./index.module.less";
import { BackBartment } from "../../compenents";
import { question as questionApi } from "../../api";
import { QuestionForm } from "./compenents/form";
import type { QuestionDetailModel } from "./compenents/form";
import type { QuestionPayload, QuestionType } from "../../api/question";
import { dateFormat } from "../../utils";
import {
  QUESTION_TYPE_MAP,
  QUESTION_TYPE_OPTIONS,
} from "../../constants/question";

interface QuestionRecord {
  id: number;
  type: QuestionType;
  content: string;
  score: number;
  options: Array<{ value: string; label: string }>;
  answer: string[];
  created_at?: string;
  updated_at?: string;
}

export default function QuestionPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<QuestionRecord[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [keyword, setKeyword] = useState<string>();
  const [type, setType] = useState<QuestionType | undefined>();
  const [detail, setDetail] = useState<QuestionDetailModel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const totalScore = useMemo(
    () => records.reduce((sum, item) => sum + (item.score || 0), 0),
    [records]
  );

  useEffect(() => {
    load();
  }, [page, size, type, keyword]);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await questionApi.questionList(page, size, type, keyword);
      const data = res.data;
      setTotal(data.total || 0);
      setRecords(data.data || []);
    } catch (err: any) {
      message.error(err?.message || "题库列表加载失败");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setDetail(null);
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    setPending(true);
    try {
      const res: any = await questionApi.question(id);
      setDetail(res.data as QuestionDetailModel);
      setEditingId(id);
      setDialogOpen(true);
    } catch (err: any) {
      message.error(err?.message || "获取题目详情失败");
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (payload: QuestionPayload) => {
    setPending(true);
    try {
      if (editingId) {
        await questionApi.updateQuestion(editingId, payload);
        message.success("题目更新成功");
      } else {
        await questionApi.storeQuestion(payload);
        message.success("题目创建成功");
      }
      setDialogOpen(false);
      setDetail(null);
      setEditingId(null);
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
      await questionApi.destroyQuestion(id);
      message.success("删除成功");
      load();
    } catch (err: any) {
      message.error(err?.message || "删除失败");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<QuestionRecord> = [
    {
      title: "题目",
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ maxWidth: 520 }}>
          <Space>
            <Tag color="red">{QUESTION_TYPE_MAP[record.type]}</Tag>
            <Typography.Text strong>{record.content}</Typography.Text>
          </Space>
          {record.options?.length > 0 && (
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {record.options.map((item, index) => (
                <span key={item.value}>
                  <Typography.Text strong>{item.value}.</Typography.Text>
                  <span style={{ marginLeft: 4 }}>{item.label}</span>
                  {index !== record.options.length - 1 && <span style={{ margin: "0 6px" }}>|</span>}
                </span>
              ))}
            </Typography.Paragraph>
          )}
          <Typography.Text type="secondary">
            正确答案：{record.answer?.length ? record.answer.join("、") : "-"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "分值",
      dataIndex: "score",
      width: 80,
      render: (value: number) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      width: 180,
      render: (value?: string) => (value ? dateFormat(value) : "-"),
    },
    {
      title: "操作",
      key: "action",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEdit(record.id)}>
            编辑
          </Button>
          <Popconfirm
            title="删除确认"
            description="确定删除该题目吗？"
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
        <BackBartment title="题目管理" />
        <div className="float-left" style={{ width: "100%" }}>
          <div className={styles.actionBar}>
            <div className={styles.filterBar}>
              <Form
                layout="inline"
                form={form}
                onFinish={(values) => {
                  setPage(1);
                  setType(values.type || undefined);
                  setKeyword(values.keyword || undefined);
                }}
              >
                <Form.Item label="题目类型" name="type">
                  <Select
                    placeholder="全部类型"
                    allowClear
                    style={{ width: 160 }}
                    options={QUESTION_TYPE_OPTIONS}
                  />
                </Form.Item>
                <Form.Item label="关键词" name="keyword">
                  <Input placeholder="题干关键字" allowClear style={{ width: 200 }} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      onClick={() => {
                        form.resetFields();
                        setPage(1);
                        setType(undefined);
                        setKeyword(undefined);
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
                当前页题目总分：
                <span className={styles.totalScore}>{totalScore}</span>
              </Typography.Text>
              <Button type="primary" onClick={openCreate}>
                新增题目
              </Button>
            </Space>
          </div>
          <Table<QuestionRecord>
            rowKey="id"
            loading={loading}
            dataSource={records}
            columns={columns}
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
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
          />
        </div>
      </Card>
      <QuestionForm
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
    </div>
  );
}
