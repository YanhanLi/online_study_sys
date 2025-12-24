# 🎯 成员 A 任务书：题目与练习管理专家

## 📌 角色定位
你负责 PlayEdu 系统中**最核心的知识考核模块**，对应前端菜单中的 **「题目管理」** 和 **「练习管理」**。
你的工作直接决定了考试系统的稳定性和灵活性。你不仅要在数据库层面解决复杂题型的存储（如 JSON 选项），还要利用数据库的高级特性实现“智能组卷”功能。

---

## 🛠 数据库实战任务 (Database Deep Dive)

### 1. 题目选项的 JSON 存储与查询 (MySQL 8.0 JSON)
*   **业务现状**：PlayEdu 的题目（`questions` 表）支持单选、多选、判断。选项内容（Options）结构多变，适合使用 JSON 类型存储，而不是传统的关联表。
*   **数据库任务**：
    *   **表结构设计**：分析 `questions` 表，将 `options` 字段定义为 `JSON` 类型。
    *   **高级查询**：编写 SQL 查询“所有包含特定关键词选项的题目”。
    *   **数据完整性**：使用 MySQL 8.0 的 `CHECK` 约束，确保 JSON 格式符合预定义的 Schema（例如必须包含 A, B, C, D 四个 Key）。

**💻 实战代码 (SQL)**：
```sql
-- 1. 创建题目表，使用 JSON 存储选项
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL COMMENT 'SINGLE, MULTI, JUDGE',
    content TEXT NOT NULL COMMENT '题干',
    options JSON NOT NULL COMMENT '选项，形如 [{"key":"A","val":"..."},...]',
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 查询：找出所有选项 A 中包含 "Java" 单词的单选题
-- 利用 ->> 运算符提取 JSON 字段
SELECT id, content 
FROM questions 
WHERE type = 'SINGLE' 
AND options->>'$[0].val' LIKE '%Java%';

-- 3. 虚拟列优化索引 (Advanced)：
-- 为 JSON 中的 answer 字段创建虚拟列并建立索引，加速查询
ALTER TABLE questions ADD COLUMN v_first_option VARCHAR(255) 
GENERATED ALWAYS AS (options->>'$[0].val');
CREATE INDEX idx_first_option ON questions(v_first_option);
```

### 2. 智能随机组卷存储过程 (Stored Procedure)
*   **业务现状**：在「练习管理」中，管理员需要从题库中抽取 50 道题组成一套试卷。如果用 Java代码查出来再 shuffle，包含大量网络 IO。
*   **数据库任务**：编写存储过程 `sp_generate_quiz_paper`，在数据库内部完成随机抽取和插入。

**💻 实战代码 (SQL)**：
```sql
DELIMITER $$
CREATE PROCEDURE sp_generate_quiz_paper(
    IN p_quiz_id INT, 
    IN p_single_count INT, 
    IN p_multi_count INT
)
BEGIN
    -- 开启事务，保证试卷生成的完整性
    START TRANSACTION;
    
    -- 1. 随机抽取单选题插入关联表
    INSERT INTO quiz_questions (quiz_id, question_id, score)
    SELECT p_quiz_id, id, 2
    FROM questions 
    WHERE type = 'SINGLE'
    ORDER BY RAND() -- 数据库层面的随机排序
    LIMIT p_single_count;
    
    -- 2. 随机抽取多选题
    INSERT INTO quiz_questions (quiz_id, question_id, score)
    SELECT p_quiz_id, id, 5
    FROM questions 
    WHERE type = 'MULTI'
    ORDER BY RAND()
    LIMIT p_multi_count;
    
    COMMIT;
END$$
DELIMITER ;
```

---

## ☁️ 阿里云 OSS 集成开发 (Backend & Cloud)

### 1. 题目富文本中的图片处理
*   **业务场景**：在「题目管理」添加题目时，题干中可能包含图片（数学公式、物理图示）。这些图片必须存储在阿里云 OSS。
*   **后端开发 (Java)**：
    *   实现 `RichTextUploadController`。
    *   前端编辑器粘贴图片 -> 后端接收 -> 这里的**关键点**是生成**带签名的 OSS 访问 URL** (Presigned URL) 返回给前端，确保资源安全，链接有时效性。

**💻 实战代码 (Java)**：
```java
@Service
public class QuestionService {
    @Autowired
    private OSSClient ossClient; // 阿里云 SDK
    
    // 解析题干中的临时图片链接，转存为永久 OSS 路径
    public String processContentImages(String content) {
        // ... 正则提取 <img src="...">
        // ... stream流上传到 oss-lyh bucket/questions/ 目录
        // ... 替换 content 中的 URL
        return processedContent;
    }
}
```

---

## 📡 前端开发任务 (React / Ant Design)

### 1. 动态题目表单
*   **对应菜单**：题目管理 -> 新增题目。
*   **任务描述**：使用 Ant Design 的 `Form.List` 实现动态增减选项（A/B/C/D...）。如果是“判断题”，自动切换为“正确/错误”两个固定选项。

### 2. 练习与题目的穿梭框
*   **对应菜单**：练习管理 -> 选题。
*   **任务描述**：配合存储过程，展示选题界面。开发一个高级穿梭框 (`Transfer` 组件)，左侧是海量题库（支持分页搜索），右侧是已选题目，实时计算总分。

---

## ✅ 你的交付成果
1.  **SQL 脚本**：`questions_ddl.sql` (含 JSON 校验), `sp_generate_quiz.sql` (随机组卷存储过程)。
2.  **Java 代码**：`QuestionController.java` (含 OSS 图片上传逻辑)。
3.  **前端截图**：题目编辑器界面、智能组卷界面。
4.  **性能分析**：对比 Java 内存随机抽题 vs 数据库 `ORDER BY RAND()` 的性能差异报告。
