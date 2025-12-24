# 🎯 成员 C 任务书：课程与云存储架构师

## 📌 角色定位
你负责 **「课程中心 -> 线上课」** 和资源的底层存储。
你是项目中与 **阿里云 OSS** 交互最深的成员。你需要设计一套机制，既能让 2GB 的大视频顺畅上传，又能保证数据库中的课程结构（Course -> Chapter -> Hour）在复杂的编辑操作中保持一致。

---

## ☁️ 阿里云 OSS 深度集成 (Cloud Architecture)

### 1. 资源元数据表设计与同步
*   **业务现状**：OSS 只是文件存储，数据库必须记录文件的 Meta 信息（大小、MimeType、ETag），否则无法做容量统计和防重复上传。
*   **数据库任务**：
    *   设计 `resources` 表，增加 `oss_bucket`, `oss_key`, `file_hash` (MD5) 字段。
    *   **秒传逻辑**：上传前先计算文件 Hash，查库，如果已存在（hash命中），直接引用数据库记录，无需再次上传到 OSS。

**💻 实战代码 (SQL - 表结构)**：
```sql
CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    extension VARCHAR(20) NOT NULL COMMENT 'mp4, pdf, png',
    size BIGINT NOT NULL COMMENT '字节数',
    -- 核心 OSS 字段
    disk VARCHAR(20) DEFAULT 'aliyun-oss',
    file_path VARCHAR(500) NOT NULL COMMENT 'OSS Object Key',
    file_hash CHAR(32) NOT NULL COMMENT 'MD5 Hash 用于秒传',
    
    parent_id INT DEFAULT 0 COMMENT '文件夹ID',
    admin_id INT NOT NULL COMMENT '上传人',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_hash (file_hash) -- 唯一索引保证不重复存储
);
```

### 2. 大文件分片上传 (Backend Java)
*   **业务场景**：上传 2GB 的培训视频，普通上传会超时或 OOM。
*   **开发任务**：实现 OSS 的 **Multipart Upload** (分片上传) 接口。
    *   Step 1: `initiateMultipartUpload` 获得 UploadId。
    *   Step 2: 前端并发上传分片 (Part)。
    *   Step 3: `completeMultipartUpload` 合并文件。
    *   **DB 记录**：上传完成后，将 `resources` 记录写入数据库。

---

## 🛠 数据库实战任务 (Database Deep Dive)

### 1. 课程编排的事务一致性 (Transaction)
*   **业务现状**：在「线上课」编辑页面，用户可能同时修改了课程名称、删了一个章节、加了两个课时、换了一个视频。这是一个**大事务**。
*   **数据库任务**：演示在 `REPEATABLE READ` 隔离级别下，如何保证多表操作的原子性。

**💻 实战代码 (Java)**：
```java
@Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
public void saveCourseAggregated(CourseAggregatedDTO dto) {
    // 1. 保存/更新课程主表
    Course course = saveCourse(dto);
    
    // 2. 物理删除该课程旧的所有章节（简单粗暴策略，或做 diff 增量）
    chapterMapper.deleteByCourseId(course.getId());
    
    // 3. 重新插入新章节
    for (ChapterDto chapter : dto.getChapters()) {
        chapterMapper.insert(chapter);
        // 4. 插入课时
        for (HourDto hour : chapter.getHours()) {
            hourMapper.insert(hour);
            // 校验资源是否存在
            if (!resourceService.exists(hour.getResourceId())) {
                 throw new RuntimeException("引用了无效资源!");
            }
        }
    }
}
```

### 2. 资源引用计数与级联 (Cascade)
*   **业务场景**：删除课程时，不能直接把视频文件删了（因为可能被其他课程复用）。
*   **数据库任务**：
    *   实现一个**引用计数查询**。
    *   编写 SQL 查找“**僵尸资源**” (Zombies)：存在于 `resources` 表，但不存在于任何 `course_hours`、`questions` 中的文件。

```sql
-- 查找未被引用的视频资源（僵尸文件）
SELECT r.id, r.file_path, r.size 
FROM resources r
LEFT JOIN course_hours ch ON r.id = ch.rid
WHERE r.type = 'VIDEO' 
AND ch.id IS NULL
AND r.created_at < DATE_SUB(NOW(), INTERVAL 3 DAY); -- 3天前的老数据
```

---

## 📡 前端开发任务 (React)

### 1. 视频上传组件 (Uploader)
*   **对应菜单**：资源管理 / 课程编辑。
*   **任务描述**：
    *   集成 `ali-oss` JS SDK。
    *   实现**进度条显示** (Progress Bar)。
    *   实现**断点续传**：利用 LocalStorage 记录 checkpoints。

---

## ✅ 你的交付成果
1.  **SQL 脚本**：`resources_ddl.sql`, `find_zombie_files.sql`。
2.  **Java 代码**：`OssUploadService.java` (分片上传), `CourseCompositeService.java` (复杂事务)。
3.  **前端**：带进度条的上传组件截图。
4.  **架构图**：绘制资源上传时序图 (前端 -> 后端 -> OSS)。
