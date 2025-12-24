# PlayEdu 项目运行指南 🚀

## 前置条件

确保已安装以下软件：
- **Docker** - 用于运行 MySQL、Redis、MinIO
- **Java 17** - 用于运行后端 API
- **Node.js 18+** 和 **pnpm** - 用于运行前端

---

## 快速启动

### 1️⃣ 启动 Docker 容器

```bash
cd /Users/yanhanli/Desktop/PlayEdu-main
docker-compose up -d
```

这会启动：
- MySQL（端口 23307）
- Redis（端口 6378）
- MinIO（端口 9000）

### 2️⃣ 启动后端 API

```bash
cd /Users/yanhanli/Desktop/PlayEdu-main/playedu-api
./mvnw spring-boot:run -pl playedu-api
```

> 🔗 后端运行地址：`http://localhost:9898`

### 3️⃣ 启动前端 - 管理后台

```bash
cd /Users/yanhanli/Desktop/PlayEdu-main/playedu-admin
pnpm dev
```

> 🔗 管理后台地址：`http://localhost:3004`
> 
> 默认账号：`admin@playedu.xyz` / 密码：`playedu`

### 4️⃣ 启动前端 - 学员端（PC版）

```bash
cd /Users/yanhanli/Desktop/PlayEdu-main/playedu-pc
pnpm dev
```

> 🔗 PC学员端地址：`http://localhost:3000`

### 5️⃣ 启动前端 - 学员端（H5版）

```bash
cd /Users/yanhanli/Desktop/PlayEdu-main/playedu-h5
pnpm dev
```

> 🔗 H5学员端地址：`http://localhost:3002`

---

## 服务概览

| 服务 | 端口 | 说明 |
|------|------|------|
| MySQL | 23307 | 数据库 |
| Redis | 6378 | 缓存 |
| MinIO | 9000 | 对象存储 |
| 后端 API | 9898 | Java Spring Boot |
| 管理后台 | 3004 | Admin Panel |
| PC学员端 | 3000 | 电脑版学员界面 |
| H5学员端 | 3002 | 手机版学员界面 |

---

## 常用命令

### 检查 Docker 状态
```bash
docker ps
```

### 停止所有 Docker 容器
```bash
docker-compose down
```

### 重新编译后端
```bash
cd /Users/yanhanli/Desktop/PlayEdu-main/playedu-api
./mvnw clean install -DskipTests
./mvnw spring-boot:run -pl playedu-api
```

### 安装前端依赖
```bash
cd /Users/yanhanli/Desktop/PlayEdu-main/playedu-admin
pnpm install
```

---

## 存储配置（阿里云 OSS）

当前项目已配置使用阿里云 OSS 存储：
- **Bucket**: `oss-lyh`
- **Endpoint**: `https://oss-cn-hangzhou.aliyuncs.com`
- **Region**: `oss-cn-hangzhou`

如需修改存储配置，请在管理后台 **系统设置 → 存储配置** 中更改。

---

## 故障排除

### 端口被占用
```bash
# 查找占用端口的进程
lsof -i:9898

# 杀死进程
kill -9 <PID>
```

### 数据库连接失败
确保 Docker 容器正在运行：
```bash
docker ps | grep playedu-mysql
```

### 前端编译错误
尝试删除 node_modules 并重新安装：
```bash
rm -rf node_modules
pnpm install
```
