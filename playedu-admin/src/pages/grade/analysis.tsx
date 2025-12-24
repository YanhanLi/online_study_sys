import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { BackBartment } from "../../compenents";
import { grade as gradeApi } from "../../api";
import { dateFormat } from "../../utils";
import { OfflineImportModal } from "../../compenents/offline-grade-import";

interface GradeAnalysisData {
  quiz: {
    id: number;
    title: string;
    category: string;
    total_score: number;
    pass_score: number;
    exam_date?: string;
  };
  stats: {
    participant_count: number;
    average_score: number;
    max_score: number;
    min_score: number;
    median_score: number;
    pass_rate: number;
    distribution: Record<string, number>;
    updated_at?: string;
  };
}

export default function GradeAnalysisPage() {
  const { quizId } = useParams();
  const quizIdNum = Number(quizId);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GradeAnalysisData | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async (refresh = false) => {
    if (!quizIdNum) {
      return;
    }
    setLoading(true);
    try {
      const res: any = await gradeApi.gradeAnalysis(quizIdNum, refresh);
      setData(res?.data || null);
    } catch (err: any) {
      message.error(err?.message || "加载成绩分析失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [quizIdNum]);

  const distributionSource = useMemo(() => {
    if (!data?.stats?.distribution) {
      return [];
    }
    return Object.entries(data.stats.distribution).map(([range, count]) => ({
      range,
      count,
    }));
  }, [data]);

  const passRatePercent = useMemo(
    () => Math.round((data?.stats?.pass_rate || 0) * 1000) / 10,
    [data]
  );

  const quizInfo = data?.quiz;
  const stats = data?.stats;
  const formatScore = (value?: number) =>
    typeof value === "number" ? Math.round(value * 10) / 10 : "-";
  const formatRaw = (value?: number) =>
    typeof value === "number" ? value : "-";

  return (
    <div className="playedu-main-body">
      <Card bordered={false} loading={loading}>
        <BackBartment
          title={quizInfo ? `${quizInfo.title} - 成绩分析` : "成绩分析"}
        />
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={() => navigate("/grade/overview")}>返回成绩中心</Button>
          <Button onClick={() => navigate("/quiz")}>练习管理</Button>
        </Space>
        {!quizInfo || !stats ? (
          <Empty description="暂无成绩数据" />
        ) : (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Card bordered={false}>
              <Descriptions column={2} title="练习信息">
                <Descriptions.Item label="练习标题">
                  <Typography.Text strong>{quizInfo.title}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="分类">
                  {quizInfo.category === "OFFLINE_MANUAL" ? (
                    <Tag color="blue">线下人工</Tag>
                  ) : (
                    <Tag color="green">线上自动</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="考试时间">
                  {quizInfo.exam_date ? dateFormat(quizInfo.exam_date) : "未设置"}
                </Descriptions.Item>
                <Descriptions.Item label="及格分">
                  {quizInfo.pass_score}/{quizInfo.total_score}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Row gutter={24}>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic title="参与人数" value={stats.participant_count} />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic title="平均分" value={formatScore(stats.average_score)} />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="最高分 / 最低分"
                    value={`${formatRaw(stats.max_score)} / ${formatRaw(stats.min_score)}`}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic title="中位数" value={formatScore(stats.median_score)} />
                </Card>
              </Col>
            </Row>
            <Card bordered={false}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Text strong>及格率</Typography.Text>
                <Progress percent={passRatePercent} strokeColor="#52c41a" />
                <Typography.Text type="secondary">
                  统计时间：{stats.updated_at ? dateFormat(stats.updated_at) : "-"}
                </Typography.Text>
              </Space>
            </Card>
            <Card bordered={false} title="分数段分布">
              <Table
                size="small"
                bordered
                columns={[
                  { title: "分数段", dataIndex: "range", width: 160 },
                  { title: "人数", dataIndex: "count", width: 120 },
                ]}
                dataSource={distributionSource}
                pagination={false}
                rowKey={(row) => row.range}
                locale={{ emptyText: "暂无分布数据" }}
              />
            </Card>
            <Space>
              <Button type="primary" onClick={() => fetchData(true)}>
                刷新统计
              </Button>
              {quizInfo.category === "OFFLINE_MANUAL" && (
                <Button onClick={() => setImportOpen(true)}>导入线下成绩</Button>
              )}
            </Space>
          </Space>
        )}
      </Card>
      {quizInfo && (
        <OfflineImportModal
          open={importOpen}
          quiz={{ id: quizInfo.id, title: quizInfo.title }}
          onCancel={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            fetchData(true);
          }}
        />
      )}
    </div>
  );
}
