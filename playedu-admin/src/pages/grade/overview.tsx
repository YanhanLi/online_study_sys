import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Segmented,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import { BackBartment } from "../../compenents";
import { quiz as quizApi } from "../../api";
import { dateFormat } from "../../utils";
import { OfflineImportModal } from "../../compenents/offline-grade-import";

interface QuizSummary {
  id: number;
  title: string;
  total_score: number;
  pass_score: number;
  question_count: number;
  updated_at?: string;
  exam_date?: string;
  participant_count?: number;
  pass_rate?: number;
  category?: string;
  avg_score?: number;
  max_score?: number;
  min_score?: number;
  statistics_updated_at?: string;
}

const CATEGORY_OPTIONS = [
  { label: "全部分类", value: "all" },
  { label: "线上自动", value: "ONLINE_AUTO" },
  { label: "线下人工", value: "OFFLINE_MANUAL" },
];

export default function GradeOverviewPage() {
  const [records, setRecords] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<QuizSummary | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res: any = await quizApi.quizList(1, 200);
        const data = res?.data || {};
        const list: QuizSummary[] = Array.isArray(data.data)
          ? (data.data as any[]).map((item) => ({
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
            }))
          : [];
        setRecords(list);
      } catch (err: any) {
        message.error(err?.message || "加载成绩数据失败");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (category === "all") {
      return records;
    }
    return records.filter((item) => item.category === category);
  }, [records, category]);

  const totalParticipants = useMemo(
    () => filtered.reduce((sum, item) => sum + (item.participant_count || 0), 0),
    [filtered]
  );

  const averagePassRate = useMemo(() => {
    if (filtered.length === 0) {
      return 0;
    }
    const totalRate = filtered.reduce(
      (sum, item) => sum + (item.pass_rate ?? 0),
      0
    );
    return Math.round((totalRate / filtered.length) * 1000) / 10;
  }, [filtered]);

  const openImport = (quiz: QuizSummary) => {
    setImportTarget(quiz);
    setImportOpen(true);
  };

  const refreshList = async () => {
    try {
      const res: any = await quizApi.quizList(1, 200);
      const data = res?.data || {};
      const list: QuizSummary[] = Array.isArray(data.data)
        ? (data.data as any[]).map((item) => ({
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
          }))
        : [];
      setRecords(list);
    } catch (err: any) {
      message.error(err?.message || "刷新失败");
    }
  };

  return (
    <div className="playedu-main-body">
      <Card bordered={false} loading={loading}>
        <BackBartment title="成绩中心" />
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Segmented
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(value) => setCategory(value as string)}
            />
            <Space>
              <Button onClick={() => navigate("/grade/student")}>
                学员画像
              </Button>
              <Button onClick={() => navigate("/quiz")}>练习管理</Button>
              <Button onClick={refreshList}>刷新</Button>
            </Space>
          </div>
          <Row gutter={24}>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic title="练习数量" value={filtered.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic title="参与人数" value={totalParticipants} />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic title="平均及格率" value={averagePassRate} suffix="%" />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false}>
                <Statistic
                  title="线下考试数量"
                  value={filtered.filter((item) => item.category === "OFFLINE_MANUAL").length}
                />
              </Card>
            </Col>
          </Row>
          {filtered.length === 0 ? (
            <Empty description="暂无练习数据" />
          ) : (
            <Row gutter={[16, 16]}>
              {filtered.map((item) => (
                <Col xs={24} sm={12} xl={8} key={item.id}>
                  <Card
                    title={item.title}
                    extra={
                      item.category === "OFFLINE_MANUAL" ? (
                        <Tag color="blue">线下人工</Tag>
                      ) : (
                        <Tag color="green">线上自动</Tag>
                      )
                    }
                  >
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Typography.Text type="secondary">
                        考试时间：{item.exam_date ? dateFormat(item.exam_date) : "未设置"}
                      </Typography.Text>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="参与人数"
                            value={item.participant_count || 0}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="及格率"
                            value={Math.round((item.pass_rate || 0) * 1000) / 10}
                            suffix="%"
                          />
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="平均分"
                            value={0}
                            valueRender={() => (
                              <Typography.Text>
                                {typeof item.avg_score === "number"
                                  ? (Math.round(item.avg_score * 10) / 10).toFixed(1)
                                  : "-"}
                              </Typography.Text>
                            )}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="最高/最低分"
                            value={0}
                            valueRender={() => (
                              <Typography.Text>
                                {typeof item.max_score === "number" &&
                                typeof item.min_score === "number"
                                  ? `${item.max_score}/${item.min_score}`
                                  : "-"}
                              </Typography.Text>
                            )}
                          />
                        </Col>
                      </Row>
                      <Typography.Text type="secondary">
                        数据刷新：
                        {item.statistics_updated_at
                          ? dateFormat(item.statistics_updated_at)
                          : "未生成"}
                      </Typography.Text>
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => navigate(`/grade/analysis/${item.id}`)}
                        >
                          查看分析
                        </Button>
                        {item.category === "OFFLINE_MANUAL" && (
                          <Button onClick={() => openImport(item)}>导入成绩</Button>
                        )}
                        <Button onClick={() => navigate(`/quiz?keyword=${item.title}`)}>
                          在练习中查看
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Space>
      </Card>
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
          refreshList();
        }}
      />
    </div>
  );
}
