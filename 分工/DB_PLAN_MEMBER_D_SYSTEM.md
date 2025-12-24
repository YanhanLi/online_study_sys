# 🎯 成员 D 任务书：组织架构与系统安全

## 📌 角色定位
你负责 PlayEdu 的 **“骨架”** 与 **“安全”**——对应 **「学员管理」**、**「部门管理」** 以及 **「系统设置」**。
你需要解决无限层级部门的查询性能问题，并保护系统最敏感的配置信息（如阿里云 OSS 的 AccessKey）。

---

## 🛠 数据库实战任务 (Database Deep Dive)

### 1. 部门树的 CTE 递归 (Common Table Expressions)
*   **业务现状**：PlayEdu 的部门（Departments）是树形结构。前端需要展示树，后端需要查询“技术部”及其下属“后端组”、“前端组”的所有学员。
*   **数据库任务**：编写 MySQL 8.0 CTE 递归查询 SQL。

**💻 实战代码 (SQL)**：
```sql
-- 1. 递归查询：查找部门 ID=5 (技术部) 及其所有子部门 ID
WITH RECURSIVE dept_cte AS (
    -- Anchor: 根节点
    SELECT id, parent_id, name, CAST(id AS CHAR(200)) AS path
    FROM departments 
    WHERE id = 5
    
    UNION ALL
    
    -- Recursive: 子节点
    SELECT d.id, d.parent_id, d.name, CONCAT(dc.path, ',', d.id)
    FROM departments d
    JOIN dept_cte dc ON d.parent_id = dc.id
)
SELECT id FROM dept_cte;

-- 2. 应用场景：查询这些部门下的所有学员
SELECT * FROM users 
WHERE dept_id IN (SELECT id FROM dept_cte);
```

### 2. 管理日志全文检索 (Fulltext Search)
*   **业务现状**：在「管理日志」菜单，管理员需要搜“删除了哪个学员”。目前的 `LIKE '%...%'` 全表扫描太慢。
*   **数据库任务**：
    *   为 `admin_logs` 表的 `opt_content` 字段创建全文索引。
    *   使用 `MATCH ... AGAINST` 进行毫秒级搜索。

```sql
ALTER TABLE admin_logs ADD FULLTEXT INDEX ft_opt_content (opt_content);

-- 搜索包含 "删除" 和 "张三" 的日志
SELECT * FROM admin_logs 
WHERE MATCH(opt_content) AGAINST('+删除 +张三' IN BOOLEAN MODE);
```

---

## 🛡️ 系统安全与 Redis 缓存 (System & Security)

### 1. 敏感配置加密与缓存
*   **业务现状**：在「系统设置」中，配置了阿里云 OSS 的 `AccessKeyId` 和 `AccessKeySecret`。这些绝对不能明文存库。
*   **开发任务**：
    *   **AES 加密**：写入数据库前使用 AES-256 加密，读取时解密。
    *   **Redis 缓存**：因为系统高频使用 OSS，不能每次上传都解密一次。将配置缓存到 Redis `sys:config:oss`。

**💻 实战代码 (Java)**：
```java
@Service
public class SystemConfigService {
    @Cacheable(value = "sys_config", key = "'oss_config'")
    public OssConfigDto getOssConfig() {
        // 1. 从 DB 读取加密串
        String encryptedSk = configMapper.getValue("oss_sk");
        
        // 2. 解密
        String sk = AesUtil.decrypt(encryptedSk, MASTER_KEY);
        
        // 3. 返回 (Spring Cache 自动写入 Redis)
        return new OssConfigDto(ak, sk, bucket);
    }
    
    @CacheEvict(value = "sys_config", allEntries = true)
    public void updateConfig(ConfigDto dto) {
        // 更新 DB 时自动清除缓存
    }
}
```

---

## 📡 前端开发任务 (React)

### 1. 部门管理 - 拖拽树 (Draggable Tree)
*   **对应菜单**：部门管理。
*   **任务描述**：
    *   使用 `antd` 的 `Tree` 组件。
    *   实现 **Drag & Drop**：将“后端组”拖拽到“研发中心”下，前端调用 `moveDepartment(id, targetId)` 接口。
    *   **局部刷新**：拖拽成功后，不刷新全页，只更新移动的节点及其子节点。

### 2. 权限控制指令 (Perm Directive)
*   **任务描述**：封装一个 `<Auth>` 组件。
*   只有拥有 `SYSTEM_CONFIG` 权限的管理员，才能看到「系统设置」菜单。
```tsx
<Auth code="SYSTEM_CONFIG">
  <Button>保存配置</Button>
</Auth>
// 如果无权限，按钮自动隐藏
```

---

## ✅ 你的交付成果
1.  **SQL 脚本**：`dept_recursive.sql` (递归查询), `admin_log_fulltext.sql` (全文索引)。
2.  **Java 代码**：`AesCryptoUtil.java` (加密), `SystemConfigService.java` (Redis缓存)。
3.  **前端截图**：部门拖拽操作动图。
4.  **安全报告**：数据库敏感字段加密前后的对比截图。
