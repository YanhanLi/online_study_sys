import { useState, useEffect, useRef } from "react";
import styles from "./index.module.less";
import { Row, Col, Empty } from "antd";
import { Link, useNavigate } from "react-router-dom";
import banner from "../../assets/images/dashboard/banner.svg";
import icon from "../../assets/images/dashboard/icon-more.png";
import iconN1 from "../../assets/images/dashboard/icon-n1.png";
import iconN2 from "../../assets/images/dashboard/icon-n2.png";
import iconN3 from "../../assets/images/dashboard/icon-n3.png";
import { Footer } from "../../compenents/footer";
import { dashboard } from "../../api/index";
import { timeFormat } from "../../utils/index";
import * as echarts from "echarts";

type BasicDataModel = {
  admin_user_total: number;
  course_total: number;
  department_total: number;
  resource_category_total: number;
  resource_image_total: number;
  resource_video_total: number;
  user_learn_today: number;
  user_learn_top10?: Top10Model[];
  user_learn_top10_users?: Top10UserModel;
  user_quiz_score_top10?: ScoreTopModel[];
  user_quiz_score_top10_users?: ScoreTopUserModel;
  user_learn_yesterday: number;
  user_today: number;
  user_total: number;
  user_yesterday: number;
  version: string;
};

type UserModel = {
  id: number;
  name: string;
  avatar?: string;
  email?: string;
};

type Top10Model = {
  created_date: string;
  duration: number;
  id: number;
  user_id: number;
};

type Top10UserModel = {
  [key: number]: UserModel;
};

type ScoreTopModel = {
  user_id: number;
  score: number;
  quiz_id: number;
  quiz_title?: string;
  created_at?: string;
};

type ScoreTopUserModel = {
  [key: number]: UserModel;
};

const DashboardPage = () => {
  let chartRef = useRef(null);
  const navigate = useNavigate();
  const [basicData, setBasicData] = useState<BasicDataModel | null>(null);

  const getData = () => {
    dashboard.dashboardList().then((res: any) => {
      setBasicData(res.data);
      renderPieView({
        videos_count: res.data.resource_video_total,
        images_count: res.data.resource_image_total,
        courseware_count: res.data.resource_file_total,
      });
      return () => {
        window.onresize = null;
      };
    });
  };

  useEffect(() => {
    getData();
  }, []);

  const renderPieView = (params: any) => {
    let num =
      params.videos_count + params.images_count + params.courseware_count;
    let data = [
      {
        name: "视频数",
        value: params.videos_count,
      },
      {
        name: "图片数",
        value: params.images_count,
      },
      {
        name: "课件数",
        value: params.courseware_count,
      },
    ];
    let dom: any = chartRef.current;
    let myChart = echarts.init(dom);
    myChart.setOption({
      title: {
        textAlign: "center",
        x: "49.5%",
        y: "29%",
        text: num, //主标题
        subtext: "总资源数", //副标题
        textStyle: {
          //标题样式
          fontSize: 24,
          fontWeight: "bolder",
          color: "#333",
        },
        subtextStyle: {
          //副标题样式
          fontSize: 14,
          fontWeight: "bolder",
          color: "rgba(0, 0, 0, 0.45)",
          formatter: "",
        },
      },
      legend: [
        {
          selectedMode: true, // 图例选择的模式，控制是否可以通过点击图例改变系列的显示状态。默认开启图例选择，可以设成 false 关闭。
          bottom: "10%",
          left: "center",
          textStyle: {
            // 图例的公用文本样式。
            fontSize: 14,
            color: " #333333",
          },
          data: ["视频数", "图片数", "课件数"],
        },
      ],
      tooltip: {
        trigger: "item",
        formatter: " {b}: {c} ",
      },
      label: {
        formatter: " {b}: {c} ",
        rich: {
          per: {
            color: "#000",
          },
        },
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "60%"], // 环比 圈的大小
          center: ["50%", "40%"], // 图形在整个canvas中的位置
          color: ["#FE8650", "#FFB504", "#00cc66"], // item的取色盘
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#fff", // 白边
            borderWidth: 2,
          },
          emphasis: {
            // 高亮item的样式
            disabled: true,
          },
          label: {
            normal: {
              show: true,
              color: "#4c4a4a",
              formatter: "{active|{c}}\n\r{total| {b} }",
              rich: {
                total: {
                  fontSize: 15,
                  color: "#454c5c",
                },
                active: {
                  fontSize: 15,
                  color: "#6c7a89",
                  lineHeight: 30,
                },
              },
            },
          },
          data: data,
        },
      ],
    });
    window.onresize = () => {
      myChart.resize();
    };
  };

  const compareNum = (today: number, yesterday: number) => {
    let num = today - yesterday || 0;
    if (num < 0) {
      return (
        <span className="c-green">
          <i className={styles["down"]}>&#9660;</i>
          {Math.abs(num)}
        </span>
      );
    }
    return (
      <span className="c-red">
        <i className={styles["up"]}>&#9650;</i>
        {Math.abs(num)}
      </span>
    );
  };

  const TOP_ICONS = [iconN1, iconN2, iconN3];

  const renderRankBadge = (rankIndex: number) => {
    const rank = rankIndex + 1;
    if (rank <= 3) {
      return (
        <img
          className={styles["rank-icon"]}
          src={TOP_ICONS[rank - 1]}
          alt={`第${rank}名`}
        />
      );
    }
    return <div className={styles["rank-badge"]}>{rank}</div>;
  };

  const renderDurationRankItems = () => {
    if (!basicData?.user_learn_top10 || basicData.user_learn_top10.length === 0) {
      return null;
    }
    const users = basicData.user_learn_top10_users || {};
    return basicData.user_learn_top10.map((item, index) => {
      const user = users?.[item.user_id];
      const displayName = user?.name || "未命名学员";
      return (
        <div className={styles["rank-item"]} key={`duration-${item.user_id}-${index}`}>
          <div className={styles["rank-left"]}>
            {renderRankBadge(index)}
            <div className={styles["rank-info"]}>
              <div className={styles["rank-name"]}>{displayName}</div>
              <div className={styles["rank-meta"]}>累计学习时长</div>
            </div>
          </div>
          <div className={styles["rank-value"]}>
            {timeFormat(Number(item.duration) / 1000)}
          </div>
        </div>
      );
    });
  };

  const renderScoreRankItems = () => {
    if (!basicData?.user_quiz_score_top10 || basicData.user_quiz_score_top10.length === 0) {
      return null;
    }
    const users = basicData.user_quiz_score_top10_users || {};
    return basicData.user_quiz_score_top10.map((item, index) => {
      const user = users?.[item.user_id];
      const displayName = user?.name || "未命名学员";
      const quizTitle = item.quiz_title || "未关联练习";
      return (
        <div className={styles["rank-item"]} key={`score-${item.user_id}-${index}`}>
          <div className={styles["rank-left"]}>
            {renderRankBadge(index)}
            <div className={styles["rank-info"]}>
              <div className={styles["rank-name"]}>{displayName}</div>
              <div className={styles["rank-meta"]}>{quizTitle}</div>
            </div>
          </div>
          <div className={styles["rank-value"]}>
            {typeof item.score === "number" ? `${item.score} 分` : "-"}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <Row gutter={24}>
        <Col span={12}>
          <div className="playedu-main-top">
            <div className="j-b-flex">
              <div className={styles["label-item"]}>
                <div className={styles["label"]}>今日学习学员</div>
                <div className={styles["info"]}>
                  <div className={styles["num"]}>
                    {basicData?.user_learn_today}
                  </div>
                  {basicData && (
                    <div className={styles["compare"]}>
                      <span className="mr-5">较昨日</span>
                      {compareNum(
                        basicData.user_learn_today,
                        basicData.user_learn_yesterday
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles["label-item"]}>
                <div className={styles["label"]}>总学员数</div>
                <div className={styles["info"]}>
                  <div className={styles["num"]}>{basicData?.user_total}</div>
                  {basicData && (
                    <div className={styles["compare"]}>
                      <span className="mr-5">较昨日</span>
                      {compareNum(basicData.user_today, 0)}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles["label-item"]}>
                <div className={styles["label"]}>线上课数</div>
                <div className={styles["info"]}>
                  <div className={styles["num"]}>{basicData?.course_total}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="playedu-main-top mt-24">
            <div className={styles["large-title"]}>快捷操作</div>
            <div className={styles["mode-box"]}>
              <div
                className={styles["link-mode"]}
                onClick={() => {
                  navigate("/member/index");
                }}
              >
                <i
                  className="iconfont icon-adduser"
                  style={{ color: "#FF9F32", fontSize: 36 }}
                ></i>
                <span>添加学员</span>
              </div>
              <div
                className={styles["link-mode"]}
                onClick={() => {
                  navigate("/videos");
                }}
              >
                <i
                  className="iconfont icon-upvideo"
                  style={{ color: "#419FFF", fontSize: 36 }}
                ></i>
                <span>上传视频</span>
              </div>
              <div
                className={styles["link-mode"]}
                onClick={() => {
                  navigate("/course");
                }}
              >
                <i
                  className="iconfont icon-onlinelesson"
                  style={{ color: "#B284FF", fontSize: 36 }}
                ></i>
                <span>线上课</span>
              </div>
              <div
                className={styles["link-mode"]}
                onClick={() => {
                  navigate("/department");
                }}
              >
                <i
                  className="iconfont icon-department"
                  style={{ color: "#21C785", fontSize: 36 }}
                ></i>
                <span>新建部门</span>
              </div>
            </div>
          </div>
          <div className="playedu-main-top mt-24" style={{ minHeight: 376 }}>
            <div className={styles["large-title"]}>学习排行</div>
            <div className={styles["rank-grid"]}>
              <div className={styles["rank-card"]}>
                <div className={styles["rank-card-title"]}>学习时长 TOP10</div>
                {basicData?.user_learn_top10 && basicData.user_learn_top10.length > 0 ? (
                  <div className={styles["rank-list"]}>{renderDurationRankItems()}</div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无学习时长数据"
                  />
                )}
              </div>
              <div className={styles["rank-card"]}>
                <div className={styles["rank-card-title"]}>成绩最高 TOP10</div>
                {basicData?.user_quiz_score_top10 &&
                  basicData.user_quiz_score_top10.length > 0 ? (
                  <div className={styles["rank-list"]}>{renderScoreRankItems()}</div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无成绩数据"
                  />
                )}
              </div>
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div className="playedu-main-top">
            <div className="j-b-flex">
              <div className={styles["label-item"]}>
                <div className={styles["label"]}>部门数</div>
                <div className={styles["info"]}>
                  <div className={styles["num"]}>
                    {basicData?.department_total}
                  </div>
                </div>
              </div>
              <div className={styles["label-item"]}>
                <div className={styles["label"]}>分类数</div>
                <div className={styles["info"]}>
                  <div className={styles["num"]}>
                    {basicData?.resource_category_total}
                  </div>
                </div>
              </div>
              <div className={styles["label-item"]}>
                <div className={styles["label"]}>管理员</div>
                <div className={styles["info"]}>
                  <div className={styles["num"]}>
                    {basicData?.admin_user_total}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="playedu-main-top mt-24">
            <div className={styles["large-title"]}>资源统计</div>
            <div className={styles["charts"]}>
              <div
                ref={chartRef}
                style={{ width: "100%", height: 280, position: "relative" }}
              ></div>
            </div>
          </div>
        </Col>
        <Footer></Footer>
      </Row>
    </>
  );
};

export default DashboardPage;
