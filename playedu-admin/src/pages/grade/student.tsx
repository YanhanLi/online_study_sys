import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import * as echarts from "echarts";
import { BackBartment } from "../../compenents";
import { grade as gradeApi, user as userApi } from "../../api";
import { dateFormat } from "../../utils";

interface TrendPoint {
  quiz_id: number;
  quiz_title: string;
  category: string;
  exam_date?: string;
  submitted_at?: string;
  score: number;
  passed: boolean;
}

interface UserOption {
  id: number;
  name: string;
  dep?: string;
}

const { RangePicker } = DatePicker;

export default function GradeStudentPage() {
  const [userKeyword, setUserKeyword] = useState<string>("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.EChartsType | null>(null);

  const fetchUserOptions = async (keyword: string) => {
    setSearching(true);
    try {
      const res: any = await userApi.userList(1, 10, {
        name: keyword,
      });
      const rows = res?.data?.data || [];
      setUserOptions(
        rows.map((item: any) => ({
          id: item.id,
          name: item.name,
          dep: item.dep_name,
        }))
      );
    } catch (err: any) {
      message.error(err?.message || "学员搜索失败");
    } finally {
      setSearching(false);
    }
  };

  const handleUserSearch = (value: string) => {
    setUserKeyword(value);
    if (value && value.trim().length >= 2) {
      fetchUserOptions(value.trim());
    } else {
      setUserOptions([]);
    }
  };

  const loadTrend = async (userId: number, rangeValue?: [Dayjs | null, Dayjs | null]) => {
    setLoading(true);
    try {
      const params: { start?: string; end?: string } = {};
      if (rangeValue && rangeValue[0] && rangeValue[1]) {
        params.start = rangeValue[0].startOf("day").format("YYYY-MM-DD");
        params.end = rangeValue[1].endOf("day").format("YYYY-MM-DD");
      }
      const res: any = await gradeApi.studentTrend(userId, params);
      setTrend(res?.data || []);
    } catch (err: any) {
      message.error(err?.message || "加载成绩趋势失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (values: any) => {
    const nextRange: [Dayjs | null, Dayjs | null] | null = values;
    setRange(nextRange);
    if (selectedUser) {
      loadTrend(selectedUser.id, nextRange || undefined);
    }
  };

  const trendColumns = [
    {
      title: "考试 / 练习",
      dataIndex: "quiz_title",
    },
    {
      title: "分类",
      dataIndex: "category",
      width: 120,
      render: (value: string) =>
        value === "OFFLINE_MANUAL" ? (
          <Tag color="blue">线下人工</Tag>
        ) : (
          <Tag color="green">线上自动</Tag>
        ),
    },
    {
      title: "考试时间",
      dataIndex: "exam_date",
      width: 180,
      render: (value?: string) => (value ? dateFormat(value) : "-") ,
    },
    {
      title: "提交时间",
      dataIndex: "submitted_at",
      width: 180,
      render: (value?: string) => (value ? dateFormat(value) : "-"),
    },
    {
      title: "分数",
      dataIndex: "score",
      width: 100,
    },
    {
      title: "是否及格",
      dataIndex: "passed",
      width: 120,
      render: (value: boolean) => (value ? <Tag color="green">及格</Tag> : <Tag color="red">未及格</Tag>),
    },
  ];

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }
    let instance = chartInstanceRef.current;
    if (!instance) {
      instance = echarts.init(chartRef.current);
      chartInstanceRef.current = instance;
    }
    if (!trend.length) {
      instance.clear();
    } else {
      const labels = trend.map((item, index) => {
        const raw = item.exam_date || item.submitted_at;
        if (!raw) {
          return `记录${index + 1}`;
        }
        return dateFormat(raw);
      });
      instance.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 40, right: 20, top: 30, bottom: 40 },
        xAxis: {
          type: "category",
          data: labels,
          boundaryGap: false,
        },
        yAxis: {
          type: "value",
          name: "分数",
        },
        series: [
          {
            name: "分数",
            type: "line",
            smooth: true,
            data: trend.map((item) => item.score),
            areaStyle: {
              opacity: 0.15,
            },
            symbolSize: 10,
          },
        ],
      });
    }
    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [trend]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  const chartTitle = useMemo(() => {
    if (!selectedUser) {
      return "成绩趋势";
    }
    return `${selectedUser.name} 的成绩趋势`;
  }, [selectedUser]);

  return (
    <div className="playedu-main-body">
      <Card bordered={false}>
        <BackBartment title="学员成绩画像" />
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space wrap>
            <Select
              style={{ width: 260 }}
              showSearch
              allowClear
              placeholder="搜索学员（至少输入2个字）"
              value={selectedUser ? String(selectedUser.id) : undefined}
              onSearch={handleUserSearch}
              onChange={(value) => {
                if (!value) {
                  setSelectedUser(null);
                  setTrend([]);
                  setUserKeyword("");
                  return;
                }
                const user = userOptions.find((item) => String(item.id) === String(value));
                if (user) {
                  setSelectedUser(user);
                  setRange(null);
                  loadTrend(user.id);
                }
              }}
              notFoundContent={userKeyword.length >= 2 ? (searching ? "搜索中..." : "未找到学员") : "请输入关键词"}
              filterOption={false}
              loading={searching}
              options={userOptions.map((item) => ({
                value: String(item.id),
                label: `${item.name}${item.dep ? `（${item.dep}）` : ""}`,
              }))}
            />
            <RangePicker
              value={range || undefined}
              onChange={handleRangeChange}
              disabled={!selectedUser}
            />
            {selectedUser && (
              <Button onClick={() => selectedUser && loadTrend(selectedUser.id)}>刷新</Button>
            )}
          </Space>
          <Card bordered={false} title={chartTitle} loading={loading}>
            {trend.length === 0 ? (
              <Empty description={selectedUser ? "暂无成绩记录" : "请选择学员"} />
            ) : (
              <div style={{ height: 360 }} ref={chartRef} />
            )}
          </Card>
          <Card bordered={false} title="成绩明细">
            <Table
              rowKey={(row, index) =>
                `${row.quiz_id}-${row.submitted_at || row.exam_date || index}`
              }
              dataSource={trend}
              columns={trendColumns}
              loading={loading}
              pagination={{ pageSize: 8 }}
            />
          </Card>
        </Space>
      </Card>
    </div>
  );
}
