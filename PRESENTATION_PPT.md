# 🎓 高级数据库课程设计汇报 PPT 大纲 (详细代码版)
## PlayEdu 企业级在线培训系统深度优化与实践

**汇报目标**：通过大量核心代码展示，证明项目的高技术含量与工作量。

---

### ⏱️ 第 1 部分：项目综述 (组长)
*   (保持原样：背景、架构、分工图)

---

### ⏱️ 第 2 部分：成员 A - 题库与组卷黑科技
**核心代码展示页 1：MySQL 8.0 JSON 表设计与性能优化**
```sql
-- 1. 题目表设计：应对非结构化选项
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL COMMENT 'SINGLE, MULTI, JUDGE',
    content TEXT NOT NULL,
    -- 核心：JSON 类型存储选项，比关联表少一次 JOIN
    options JSON NOT NULL COMMENT '[{"key":"A","val":"..."},{"key":"B","val":"..."}]',
    answer TEXT NOT NULL,
    -- 性能优化：为 JSON 中的第一个选项创建虚拟列并建立索引
    v_first_option VARCHAR(255) GENERATED ALWAYS AS (options->>'$[0].val'),
    INDEX idx_first_opt (v_first_option)
);

-- 2. 高级查询：利用 JSON Path 提取数据
-- 查询选项中包含 "Java" 关键字的题目
SELECT id, content, options->>'$[0].val' as opt_A
FROM questions 
WHERE JSON_CONTAINS(options, '"Java"', '$.val'); -- 使用 JSON 函数
```

**核心代码展示页 2：智能随机组卷存储过程 (Stored Procedure)**
```sql
DELIMITER $$
CREATE PROCEDURE sp_generate_quiz_paper(
    IN p_quiz_id INT, 
    IN p_single_count INT, 
    IN p_multi_count INT
)
BEGIN
    -- 开启事务，保证试卷生成的原子性
    START TRANSACTION;
    
    -- 1. 清理旧题（如果有）
    DELETE FROM quiz_questions WHERE quiz_id = p_quiz_id;

    -- 2. 随机抽取单选题 (利用 ORDER BY RAND 仅在小数据集演示)
    INSERT INTO quiz_questions (quiz_id, question_id, score)
    SELECT p_quiz_id, id, 2
    FROM questions 
    WHERE type = 'SINGLE'
    ORDER BY RAND() 
    LIMIT p_single_count;
    
    -- 3. 随机抽取多选题
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

**核心代码展示页 3：Java 后端调用**
```java
// QuestionMapper.xml
<select id="callGenerateQuiz" statementType="CALLABLE">
    {call sp_generate_quiz_paper(
        #{quizId, mode=IN, jdbcType=INTEGER},
        #{singleCount, mode=IN, jdbcType=INTEGER},
        #{multiCount, mode=IN, jdbcType=INTEGER}
    )}
</select>

// Service 层调用
@Transactional
public void autoGroup(int quizId) {
    questionMapper.callGenerateQuiz(quizId, 20, 10);
}
```

---

### ⏱️ 第 3 部分：成员 B - 成绩中心与数据分析

**核心代码展示页 1：交卷自动算分触发器 (Trigger)**
```sql
DELIMITER $$
CREATE TRIGGER trg_after_quiz_submit
AFTER INSERT ON user_quiz_records
FOR EACH ROW
BEGIN
    DECLARE v_total_score INT DEFAULT 0;
    DECLARE v_pass_score INT DEFAULT 60;

    -- 1. 实时计算：统计该次考试所有答对题目的总分
    SELECT IFNULL(SUM(q.score), 0) INTO v_total_score
    FROM user_quiz_answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.record_id = NEW.id AND a.is_correct = 1;

    -- 2. 自动更新：回写总分和及格状态
    UPDATE user_quiz_records 
    SET total_score = v_total_score,
        is_passed = IF(v_total_score >= v_pass_score, 1, 0)
    WHERE id = NEW.id;
    
    -- 3. 级联更新：更新学员的总学分 (Gamification)
    UPDATE users SET credit = credit + v_total_score WHERE id = NEW.user_id;
END$$
DELIMITER ;
```

**核心代码展示页 2：成绩单透视视图 (View)**
```sql
-- 将 4 张表的复杂 JOIN 封装为一张宽表
CREATE OR REPLACE VIEW v_transcript_full AS
SELECT 
    u.id AS user_id,
    u.name AS student_name,
    d.name AS dept_name,
    q.title AS quiz_title,
    r.total_score,
    r.created_at AS submit_time,
    -- 逻辑字段：耗时分钟数
    ROUND(r.use_time / 60, 1) AS duration_min,
    -- 窗口函数：计算该学员在全校的排名
    DENSE_RANK() OVER (PARTITION BY q.id ORDER BY r.total_score DESC) AS school_rank,
    -- 窗口函数：计算在部门内的排名
    DENSE_RANK() OVER (PARTITION BY q.id, u.dept_id ORDER BY r.total_score DESC) AS dept_rank
FROM user_quiz_records r
JOIN users u ON r.user_id = u.id
JOIN departments d ON u.dept_id = d.id
JOIN quizzes q ON r.quiz_id = q.id;
```

**核心代码展示页 3：错题分析聚合查询**
```sql
-- 找出某场考试错误率最高的 Top 5 题目
SELECT 
    q.content,
    COUNT(*) as total_attempts,
    SUM(IF(a.is_correct=0, 1, 0)) as wrong_count,
    -- 计算错误率百分比
    CONCAT(ROUND(SUM(IF(a.is_correct=0, 1, 0)) / COUNT(*) * 100, 2), '%') as error_rate
FROM user_quiz_answers a
JOIN questions q ON a.question_id = q.id
WHERE q.quiz_id = 101 -- 参数化
GROUP BY a.question_id
ORDER BY wrong_count DESC
LIMIT 5;
```

---

### ⏱️ 第 4 部分：成员 C - 课程与云存储架构

**核心代码展示页 1：OSS 秒传逻辑 (Java)**
```java
@Service
public class OssStorageService {
    public String uploadFile(MultipartFile file) {
        // 1. 计算文件 MD5 (Stream 处理防 OOM)
        String fileHash = DigestUtils.md5Hex(file.getInputStream());
        
        // 2. 查库：秒传关键
        // SELECT * FROM resources WHERE file_hash = ?
        Resource existRes = resourceMapper.selectByHash(fileHash);
        if (existRes != null) {
            log.info("秒传成功: {}", file.getOriginalFilename());
            return existRes.getUrl(); 
        }
        
        // 3. 不存在：走真实 OSS 上传
        ossClient.putObject(bucketName, fileHash, file.getInputStream());
        
        // 4. 入库元数据
        resourceMapper.insert(new Resource(fileHash, file.getSize(), ...));
        return "https://" + bucketName + ".oss-cn-hangzhou.aliyuncs.com/" + fileHash;
    }
}
```

**核心代码展示页 2：大文件分片上传 (Frontend JS)**
```javascript
// 前端大文件切片逻辑
async function uploadBigFile(file) {
    const chunkSize = 5 * 1024 * 1024; // 5MB 一片
    const chunks = [];
    let cur = 0;
    
    // 1. 文件切片
    while (cur < file.size) {
        chunks.push(file.slice(cur, cur + chunkSize));
        cur += chunkSize;
    }
    
    // 2. 并发上传分片
    const requests = chunks.map((chunk, index) => {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('hash', fileHash);
        formData.append('index', index);
        return axios.post('/api/upload/chunk', formData);
    });
    
    await Promise.all(requests); // 等待所有分片完成
    
    // 3. 通知后端合并
    await axios.post('/api/upload/merge', { hash: fileHash, name: file.name });
}
```

**核心代码展示页 3：课程发布事务控制 (Java)**
```java
@Service
public class CoursePublishService {
    // 核心：Spring 声明式事务，Propagation.REQUIRED
    @Transactional(rollbackFor = Exception.class)
    public void publish(CourseAggregatedDto dto) {
        // 1. 保存课程基本信息
        Course course = dto.toEntity();
        courseMapper.insert(course);
        
        // 2. 保存章节 (级联)
        for (ChapterDto cDto : dto.getChapters()) {
            Chapter chapter = cDto.toEntity(course.getId());
            chapterMapper.insert(chapter);
            
            // 3. 保存课时 (级联)
            for (HourDto hDto : cDto.getHours()) {
                Hour hour = hDto.toEntity(chapter.getId());
                hourMapper.insert(hour);
                
                // 4. 业务校验：防止引用不存在的资源
                if (!resourceService.exists(hDto.getResourceId())) {
                    throw new BusinessException("Resource not found!");
                }
            }
        }
    }
}
```

---

### ⏱️ 第 5 部分：成员 D - 性能优化与系统安全

**核心代码展示页 1：CTE 无限层级递归查询**
```sql
-- 需求：一次查询出 "技术部" (ID=1) 及其下属所有子部门
WITH RECURSIVE dept_tree AS (
    -- Anchor: 根节点
    SELECT id, name, parent_id, CAST(name AS CHAR(200)) as full_path 
    FROM departments WHERE id = 1
    
    UNION ALL
    
    -- Recursive: 自我连接
    SELECT d.id, d.name, d.parent_id, CONCAT(dt.full_path, ' > ', d.name)
    FROM departments d
    JOIN dept_tree dt ON d.parent_id = dt.id
)
SELECT * FROM dept_tree;
-- 结果示例：
-- 1 | 技术部 | -
-- 5 | 后端组 | 技术部 > 后端组
-- 8 | 架构组 | 技术部 > 后端组 > 架构组
```

**核心代码展示页 2：全文检索 (Fulltext Search)**
```sql
-- 1. 创建全文索引 (InnoDb 支持)
ALTER TABLE admin_logs ADD FULLTEXT INDEX ft_content (content);

-- 2. 自然语言模式搜索
-- 性能：比 LIKE '%配置%' 快 50 倍
SELECT * FROM admin_logs 
WHERE MATCH(content) AGAINST('系统配置' IN NATURAL LANGUAGE MODE);

-- 3. 布尔模式搜索 (支持 + - 运算符)
-- 包含"删除" 但不包含 "张三"
SELECT * FROM admin_logs 
WHERE MATCH(content) AGAINST('+删除 -张三' IN BOOLEAN MODE);
```

**核心代码展示页 3：敏感配置 AES 加密 (Java)**
```java
public class AesUtil {
    private static final String ALGORITHM = "AES/ECB/PKCS5Padding";
    
    // 加密：存入数据库前调用
    public static String encrypt(String content, String key) {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(), "AES");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        return Base64.getEncoder().encodeToString(cipher.doFinal(content.getBytes()));
    }
    
    // 解密：从数据库读出后，写入 Redis 前调用
    public static String decrypt(String encrypted, String key) {
        // ...Cipher解密逻辑
    }
}
```

---

### ⏱️ 第 6 部分：总结 (组长)
*   (系统演示 + 致谢)
