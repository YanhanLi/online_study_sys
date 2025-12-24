# 🎯 成员 B 任务书：成绩中心与数据分析师

## 📌 角色定位
你负责 PlayEdu 的 **“数据心脏”**——对应前端 **「成绩中心」** 菜单及所有报表页。
当学员在前端点击“提交试卷”的那一刻，你的工作才刚刚开始。你需要保证分数计算的准确性、排名的实时性，并通过数据库视图让复杂的数据分析变得简单。

---

## 🛠 数据库实战任务 (Database Deep Dive)

### 1. 自动算分触发器 (Trigger)
*   **业务现状**：学员提交试卷后，会在 `user_quiz_records` 插入一条记录。传统的做法是 Java 代码算出分再 update。
*   **数据库任务**：为了数据一致性，我们尝试用触发器实现“**一旦交卷，自动计算总分并级联更新统计表**”。
*   **挑战**：处理并发更新行锁竞争。

**💻 实战代码 (SQL)**：
```sql
DELIMITER $$
-- 创建“交卷后”触发器
CREATE TRIGGER trg_after_quiz_submit
AFTER INSERT ON user_quiz_records
FOR EACH ROW
BEGIN
    -- 1. 统计该次考试的所有题目得分（假设有 user_quiz_answers 详情表）
    DECLARE v_total_score INT DEFAULT 0;
    
    SELECT SUM(score) INTO v_total_score
    FROM user_quiz_answers
    WHERE record_id = NEW.id AND is_correct = 1;

    -- 2. 更新主记录的总分
    UPDATE user_quiz_records SET total_score = v_total_score WHERE id = NEW.id;
    
    -- 3. 级联更新 dashboard 的统计数据
    INSERT INTO user_learn_duration_stats (user_id, created_date, total_score)
    VALUES (NEW.user_id, CURDATE(), v_total_score)
    ON DUPLICATE KEY UPDATE total_score = total_score + v_total_score;
END$$
DELIMITER ;
```

### 2. 成绩单透视视图 (Pivot View)
*   **业务现状**：管理员在「成绩中心」想看一张宽表：显示学员姓名、部门、考试名称、**是否及格**、**耗时（分钟）**、**班级排名**。这涉及多表 JOIN 和计算。
*   **数据库任务**：创建一个视图 `v_student_transcript`，封装所有逻辑。

**💻 实战代码 (SQL)**：
```sql
CREATE OR REPLACE VIEW v_student_transcript AS
SELECT 
    u.id AS user_id,
    u.name AS student_name,
    d.name AS dept_name,
    q.title AS quiz_title,
    r.total_score,
    -- 逻辑字段：是否及格 (假设60分及格)
    CASE WHEN r.total_score >= 60 THEN '及格' ELSE '不及格' END AS pass_status,
    -- 计算字段：耗时（秒 -> 分钟）
    ROUND(r.use_time / 60, 1) AS duration_min,
    -- 窗口函数：计算该学员在本次考试中的排名
    DENSE_RANK() OVER (PARTITION BY q.id ORDER BY r.total_score DESC) AS class_rank
FROM user_quiz_records r
JOIN users u ON r.user_id = u.id
JOIN departments d ON u.dept_id = d.id
JOIN quizzes q ON r.quiz_id = q.id;
```

### 3. 错题分析 聚合查询
*   **业务场景**：分析哪些题目最容易通过，哪些是“杀手题”。
*   **数据库任务**：编写 SQL 查询某场考试的 **Top 5 错题**。

```sql
SELECT 
    q.content,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count,
    -- 计算错误率
    (SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100 as error_rate
FROM user_quiz_answers a
JOIN questions q ON a.question_id = q.id
GROUP BY question_id
ORDER BY error_rate DESC
LIMIT 5;
```

---

## 📡 后端开发任务 (Java Spring Boot)

### 1. 成绩导出 Excel (Apache POI)
*   **业务场景**：对应成绩中心页面右上角的 **“导出”** 按钮。
*   **开发任务**：
    *   调用上面的 `v_student_transcript` 视图。
    *   使用 EasyExcel 或 Apache POI 流式写入 Excel（避免 10 万条数据 OOM）。
    *   **OSS 集成**：生成的 Excel 文件先上传到阿里云 OSS 临时目录，返回 URL 给前端下载（而不是直接走服务器带宽）。

---

## 💻 前端开发任务 (React)

### 1. 成绩可视化图表
*   **对应菜单**：成绩中心 -> 成绩详情。
*   **任务描述**：
    *   使用 **Ant Design Charts (G2)**。
    *   **分数段分布图**（柱状图）：展示 0-60分, 60-80分, 80-100分的人数。
    *   **个人雷达图**：展示该学员在“Java基础”、“数据库”、“前端”等不同分类题目下的得分率。

### 2. 成绩列表的高级筛选
*   **任务描述**：为成绩表格添加复杂的组合筛选器：
    *   筛选“及格/不及格”。
    *   筛选“某部门”下的所有成绩（需要配合成员 D 的递归部门接口）。

---

## ✅ 你的交付成果
1.  **SQL 脚本**：`trg_calc_score.sql` (算分触发器), `v_transcript.sql` (成绩单视图)。
2.  **Java 代码**：`GradeExportService.java` (OSS 导出逻辑)。
3.  **前端截图**：成绩分布直方图、个人能力雷达图。
4.  **测试报告**：触发器算分与 Java 算分的一致性校验报告。
