# 笔记应用后端 API

基于 Node.js + Express + Mongoose 的笔记应用后端服务。

## 功能特性

- ✅ Note 模型的完整 CRUD 操作
- ✅ 图片上传功能（支持单张/多张）
- ✅ 分页、搜索、排序功能
- ✅ RESTful API 设计

## 环境要求

- Node.js >= 14.0.0
- MongoDB（本地或 MongoDB Atlas）

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 MongoDB

#### 方案一：使用 MongoDB Atlas（推荐，免费）

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 注册账号
2. 创建免费集群（M0）
3. 创建数据库用户（Database Access）
4. 配置网络访问（Network Access），允许所有 IP 或添加你的 IP
5. 获取连接字符串（Connect → Connect your application）
6. 设置环境变量：

```bash
# Windows PowerShell
$env:MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/notesapp?retryWrites=true&w=majority"

# Windows CMD
set MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/notesapp?retryWrites=true&w=majority

# Linux/Mac
export MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/notesapp?retryWrites=true&w=majority"
```

#### 方案二：使用本地 MongoDB

1. 下载并安装 [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. 安装时选择 "Install MongoDB as a Service"
3. 安装完成后，MongoDB 服务会自动启动
4. 默认连接字符串：`mongodb://localhost:27017/notesapp`

**手动启动 MongoDB 服务（如果需要）：**

```bash
# Windows（以管理员身份运行）
net start MongoDB

# 或通过服务管理器启动 "MongoDB" 服务
```

## 启动项目

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动

## API 接口文档

### Note 相关接口

#### 1. 获取所有笔记（支持分页、搜索）
```
GET /api/notes?page=1&limit=10&search=关键词&sort=-createdAt
```

#### 2. 获取单个笔记
```
GET /api/notes/:id
```

#### 3. 创建笔记
```
POST /api/notes
Content-Type: application/json

{
  "title": "笔记标题",
  "content": "笔记内容",
  "images": ["url1", "url2"]
}
```

#### 4. 完整更新笔记
```
PUT /api/notes/:id
Content-Type: application/json

{
  "title": "新标题",
  "content": "新内容",
  "images": ["url1"]
}
```

#### 5. 部分更新笔记
```
PATCH /api/notes/:id
Content-Type: application/json

{
  "title": "只更新标题"
}
```

#### 6. 删除笔记
```
DELETE /api/notes/:id
```

### 图片上传接口

#### 1. 单张图片上传
```
POST /api/upload
Content-Type: multipart/form-data
字段名: image
```

#### 2. 多张图片上传（最多 10 张）
```
POST /api/upload/multiple
Content-Type: multipart/form-data
字段名: images
```

## 项目结构

```
backend/
├── models/
│   └── Note.js          # Note 数据模型
├── uploads/             # 上传的图片存储目录
├── server.js            # 服务器主文件
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## 环境变量

- `PORT`: 服务器端口（默认 3000）
- `MONGODB_URI`: MongoDB 连接字符串

## 注意事项

- 上传的图片保存在 `uploads/` 文件夹
- 图片大小限制：5MB
- 支持的图片格式：jpeg, jpg, png, gif, webp
- 上传的图片可通过 `http://localhost:3000/uploads/文件名` 访问






