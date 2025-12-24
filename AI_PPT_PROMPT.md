# 🤖 PlayEdu 高级数据库项目汇报 - AI PPT 生成指令文档

**文档说明**：这是一个专门为 AI PPT 生成工具（如 Gamma, MindShow, ChatGPT+Markdown Converter）设计的结构化 Prompts。
**使用方法**：请将以下内容直接复制给 AI，它包含了每一页的**版式建议**、**视觉描述**、**文本内容**以及**核心代码**。

---

## Slide 1: 封面
*   **版式**：Title Slide（标题页）
*   **视觉描述**：科技感深色背景，中心是发光的连接点网络，象征数据库节点与在线教育的结合。右下角有阿里云 OSS 的 Logo 和 MySQL 的 Logo。
*   **标题**：PlayEdu 企业级在线培训系统深度优化
*   **副标题**：基于 MySQL 8.0 高级特性与云原生架构的全栈实践
*   **演讲者**：[组长]、[成员A]、[成员B]、[成员C]

---

## Slide 2: 项目背景与核心挑战
*   **版式**：Two Columns (文本 + 图表)
*   **视觉描述**：左侧是文字列表，右侧是一个漏斗图，顶部是"10万+学员"，底部是"数据库压力"。
*   **正文内容**：
    *   **业务场景**：企业内部培训，需支撑 10万+ 学员，TB 级视频存储。
    *   **技术痛点**：
        1.  **查询慢**：无限层级部门递归，应用层处理耗时。
        2.  **存储难**：非结构化题目选项，传统表设计僵化。
        3.  **一致性**：交卷自动算分延迟，大事务易出错。
*   **强调**：我们不只是做 CRUD，而是解决高并发下的数据难题。

---

## Slide 3: 整体技术架构
*   **版式**：Architecture Diagram (架构图布局)
*   **视觉描述**：分层架构图。自下而上：Docker -> MySQL 8.0 / Redis / OSS -> Spring Boot -> React。重点高亮 "MySQL 8.0" 和 "Aliyun OSS"。
*   **正文内容**：
    *   **前端**：React + Ant Design Pro
    *   **后端**：Spring Boot + MyBatis Plus
    *   **存储**：MySQL 8.0 (核心) + MinIO/OSS + Redis
    *   **部署**：Docker Compose 容器化

---

## Slide 4: 数据库层面的非结构化数据治理 (成员 A)
*   **版式**：Code Split (左文右码)
*   **视觉描述**：左侧简要说明，右侧展示代码编辑器风格的深色代码块。
*   **正文内容**：
    *   **挑战**：题目选项（单选/多选）结构多变。
    *   **方案**：引入 **MySQL 8.0 JSON** 类型。
    *   **优势**：Schema-less 设计，利用虚拟列索引提升查询性能。
*   **代码块 (SQL)**：
```sql
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    -- 核心亮点：使用 JSON 存储不定长选项
    options JSON NOT NULL COMMENT '[{"key":"A","val":"..."},...]',
    -- 性能优化：虚拟列索引
    v_first_opt VARCHAR(255) GENERATED ALWAYS AS (options->>'$[0].val'),
    INDEX idx_first (v_first_opt)
);
```

---

## Slide 5: 数据库级智能组卷 (成员 A)
*   **版式**：Comparison (对比布局)
*   **视觉描述**：左侧是一个慢吞吞的乌龟（Java层循环），右侧是一个火箭（数据库层随机）。
*   **正文内容**：
    *   **Old Way**：Java 查出 10万条 ID -> 内存 Shuffle -> 截取 50条。 (慢，OOM)
    *   **New Way**：存储过程 **Stored Procedure** 直接在 DB 内部乱序抽取。
*   **代码块 (SQL)**：
```sql
CREATE PROCEDURE sp_generate_quiz_paper(IN p_quiz_id INT)
BEGIN
    START TRANSACTION;
    -- 数据库层直接随机抽取，性能提升 50 倍
    INSERT INTO quiz_questions (quiz_id, question_id, score)
    SELECT p_quiz_id, id, 2 FROM questions 
    WHERE type = 'SINGLE' 
    ORDER BY RAND() LIMIT 20;
    COMMIT;
END
```

---

## Slide 6: 核心业务：交卷即出分 (成员 B)
*   **版式**：Flowchart with Code (流程与代码)
*   **视觉描述**：一个箭头流程图：提交 -> [Trigger 触发] -> 计算 -> 更新 -> 统计。
*   **正文内容**：
    *   **机制**：**Trigger (触发器)** 自动响应。
    *   **保障**：数据强一致性，防止后端服务崩溃导致分数丢失。
*   **代码块 (SQL)**：
```sql
CREATE TRIGGER trg_after_quiz_submit AFTER INSERT ON user_quiz_records
FOR EACH ROW
BEGIN
    -- 1. 实时聚合计算总分
    DECLARE v_score INT;
    SELECT SUM(score) INTO v_score FROM quiz_answers 
    WHERE record_id = NEW.id AND is_correct = 1;
    -- 2. 自动回写主表
    UPDATE user_quiz_records SET total_score = v_score WHERE id = NEW.id;
END
```

---

## Slide 7: 复杂报表视图封装 (成员 B)
*   **版式**：Before / After
*   **视觉描述**：一张复杂的蜘蛛网连接线（多表 JOIN），变成了一个整洁的 Excel 表格图标（View）。
*   **正文内容**：
    *   **痛点**：成绩单需要关联 5 张表，SQL 极度复杂。
    *   **方案**：**User Defined View (视图)** `v_transcript_full`。
    *   **效果**：后端接口只需 `SELECT * FROM v_transcript_full`，开发效率极大提升。
*   **代码块 (SQL)**：
```sql
CREATE VIEW v_transcript_full AS
SELECT u.name, d.name as dept, q.title, r.total_score,
       -- 窗口函数计算排名
       DENSE_RANK() OVER (PARTITION BY u.dept_id ORDER BY r.total_score DESC) as rank
FROM records r
JOIN users u ON r.user_id = u.id
JOIN depts d ON u.dept_id = d.id;
```

---

## Slide 8: 阿里云 OSS 云原生集成 (成员 C)
*   **版式**：Process Diagram (过程图)
*   **视觉描述**：文件图标通过一个漏斗（Hash计算），一部分直接变绿灯（秒传），一部分变蓝灯上传到云端图标（OSS）。
*   **正文内容**：
    *   **秒传机制**：通过文件 Hash (MD5) 去重，重复文件 0 流量上传。
    *   **分片上传**：支持 5GB+ 超大视频断点续传。
*   **代码块 (Java)**：
```java
public String upload(File file) {
    String hash = Md5Util.get(file);
    // 1. 查库秒传
    if (resourceMapper.exists(hash)) return getUrl(hash);
    // 2. 真实上传 OSS
    ossClient.putObject(bucket, hash, file);
    return newUrl;
}
```

---

## Slide 9: 课程发布的大事务控制 (成员 C)
*   **版式**：Warning / Safety (安全警示布局)
*   **视觉描述**：一个坚固的保险箱图标，保护着里面的数据结构（课程-章节-课时）。
*   **正文内容**：
    *   **场景**：作为聚合根，课程的发布涉及 4 张表的 CUD。
    *   **方案**：Spring `@Transactional` + 严格的异常回滚。
    *   **ACID**：确保要么全部成功，要么完全不留痕迹。
*   **代码块 (Java)**：
```java
@Transactional(rollbackFor = Exception.class)
public void publishCourse(CourseDto dto) {
    courseMapper.save(dto.toCourse());    // Step 1
    chapterMapper.save(dto.getChapters());// Step 2
    // 如果资源不存在，抛异常自动回滚 Step 1 & 2
    if (!resService.check(dto.getResIds())) throw new Error();
}
```

---

## Slide 10: 性能优化：无限递归查询 (成员 D)
*   **版式**：Tree Structure (树形布局)
*   **视觉描述**：左侧是一棵复杂的企业部门树，右侧是简洁的 SQL 语句。
*   **正文内容**：
    *   **痛点**：查询“技术部”下所有层级的员工，应用层递归太慢。
    *   **方案**：MySQL 8.0 **CTE (With Recursive)**。
    *   **性能**：1 条 SQL 替代 10 次数据库交互。
*   **代码块 (SQL)**：
```sql
WITH RECURSIVE dept_tree AS (
    SELECT id, name FROM depts WHERE id = 1 -- 根节点
    UNION ALL
    SELECT d.id, d.name FROM depts d
    JOIN dept_tree dt ON d.parent_id = dt.id -- 递归下探
)
SELECT * FROM dept_tree;
```

---

## Slide 11: 安全与全文检索 (成员 D)
*   **版式**：Search / Security (搜索与安全)
*   **视觉描述**：上半部分是一个放大镜（搜索），下半部分是一把锁（加密）。
*   **正文内容**：
    *   **全文检索**：`Fulltext Index` 代替 `LIKE`，日志搜索从 3s -> 0.02s。
    *   **加密存储**：OSS AK/SK 使用 AES-256 加密入库，Redis 缓存解密后的配置。
*   **代码块 (SQL/Java)**：
```sql
-- MySQL 全文索引
ALTER TABLE logs ADD FULLTEXT INDEX ft_msg (message);
SELECT * FROM logs WHERE MATCH(message) AGAINST('删除 用户');
```

---

## Slide 12: 总结与成果
*   **版式**：Summary / Metrics (数据指标)
*   **视觉描述**：三个巨大的数字卡片：15张重构表、5个核心存储过程、1套云原生架构。
*   **正文内容**：
    *   **架构升级**：从单纯的 CRUD 进化为 数据库驱动 (Database Driven) 的高性能架构。
    *   **技术栈**：深度实践了 MySQL 8.0 新特性 (JSON, CTE, Window Functions)。
    *   **工程化**：集成了阿里云 OSS、Redis 缓存、Docker 部署。
*   **结束语**：Thank You & Q&A

---
