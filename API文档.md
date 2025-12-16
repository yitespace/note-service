# 笔记应用后端 API 文档

## 基本信息

- **项目名称**: 笔记应用后端 API
- **版本**: 1.0.0
- **基础URL**: `http://localhost:3000` (开发环境)
- **技术栈**: Node.js + Express + MongoDB + Mongoose
- **认证方式**: 匿名Token认证 (X-User-Token)

---

## 认证机制

### 认证说明

所有 `/api/*` 接口都需要在请求头中携带 `X-User-Token`。

**请求头示例**:
```http
X-User-Token: your-unique-token-here
```

### Token生成规则

客户端首次启动时，应生成一个唯一的Token并存储到本地:

```javascript
// 示例: UniApp生成Token
const token = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
uni.setStorageSync('user_token', token);
```

### 认证流程

1. 客户端生成唯一Token并保存到本地
2. 每次请求时在请求头中携带 `X-User-Token`
3. 服务端验证Token，不存在则自动创建匿名用户
4. 所有数据自动关联到该Token对应的用户

### 认证失败响应

```json
{
  "code": 401,
  "error": "需要 X-User-Token 权限标识",
  "suggestion": "请在 App 启动时生成一个唯一ID并存储，作为 X-User-Token 发送。"
}
```

---

## 数据模型

### User (用户模型)

```javascript
{
  "_id": "ObjectId",
  "anonymousToken": "String (唯一)",
  "createdAt": "Date"
}
```

### Note (笔记模型)

```javascript
{
  "_id": "ObjectId",
  "userId": "ObjectId (关联用户)",
  "title": "String (必填)",
  "content": "String",
  "images": ["String (图片URL数组)"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Habit (习惯模型)

```javascript
{
  "_id": "ObjectId",
  "userId": "ObjectId (关联用户)",
  "name": "String (必填)",
  "frequency": "String (daily/weekly_3/custom)",
  "target": "String (目标描述)",
  "currentStreak": "Number (当前连击天数)",
  "maxStreak": "Number (历史最大连击)",
  "checkIns": ["Date (打卡日期列表)"],
  "createdAt": "Date"
}
```

### Diary (日记模型)

```javascript
{
  "_id": "ObjectId",
  "userId": "ObjectId (关联用户)",
  "date": "Date (每天唯一)",
  "mood": "String (必填, 情绪图标或代号)",
  "coreEvent": "String (核心事件)",
  "reflection": "String (反思总结)",
  "createdAt": "Date"
}
```

---

## API 接口列表

### 1. 笔记管理 (Notes)

#### 1.1 获取笔记列表

**接口**: `GET /api/notes`

**请求头**:
```http
X-User-Token: your-token
```

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | Number | 否 | 1 | 页码 |
| limit | Number | 否 | 10 | 每页数量 |
| pageSize | Number | 否 | 10 | 每页数量(同limit) |
| search | String | 否 | "" | 搜索关键词(标题/内容) |
| sort | String | 否 | -createdAt | 排序方式 |

**成功响应** (200):
```json
{
  "code": 200,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "title": "我的第一篇笔记",
      "content": "这是笔记内容",
      "images": [
        "http://192.168.1.100:3000/uploads/file-1234567890.jpg"
      ],
      "createdAt": "2025-12-16T08:00:00.000Z",
      "updatedAt": "2025-12-16T08:00:00.000Z"
    }
  ],
  "total": 50,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

---

#### 1.2 获取单个笔记

**接口**: `GET /api/notes/:id`

**请求头**:
```http
X-User-Token: your-token
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | String | 笔记ID |

**成功响应** (200):
```json
{
  "code": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "我的第一篇笔记",
    "content": "这是笔记内容",
    "images": [],
    "createdAt": "2025-12-16T08:00:00.000Z",
    "updatedAt": "2025-12-16T08:00:00.000Z"
  }
}
```

**错误响应** (404):
```json
{
  "code": 404,
  "error": "笔记未找到或无权访问"
}
```

**错误响应** (400):
```json
{
  "code": 400,
  "error": "无效的笔记 ID"
}
```

---

#### 1.3 创建笔记

**接口**: `POST /api/notes`

**请求头**:
```http
X-User-Token: your-token
Content-Type: application/json
```

**请求体**:
```json
{
  "title": "新笔记标题",
  "content": "笔记内容(可选)",
  "images": [
    "http://192.168.1.100:3000/uploads/file-1234567890.jpg"
  ]
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | String | 是 | 笔记标题(不能为空) |
| content | String | 否 | 笔记内容 |
| images | Array | 否 | 图片URL数组 |

**成功响应** (201):
```json
{
  "code": 200,
  "message": "笔记创建成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "新笔记标题",
    "content": "笔记内容",
    "images": [],
    "createdAt": "2025-12-16T08:00:00.000Z",
    "updatedAt": "2025-12-16T08:00:00.000Z"
  }
}
```

**错误响应** (400):
```json
{
  "code": 400,
  "error": "标题不能为空"
}
```

---

#### 1.4 删除笔记

**接口**: `DELETE /api/notes/:id`

**请求头**:
```http
X-User-Token: your-token
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | String | 笔记ID |

**成功响应** (200):
```json
{
  "code": 200,
  "message": "笔记删除成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "已删除的笔记",
    "content": "..."
  }
}
```

**错误响应** (404):
```json
{
  "code": 404,
  "error": "笔记未找到或无权访问"
}
```

---

### 2. 文件上传

#### 2.1 上传图片

**接口**: `POST /api/upload`

**请求头**:
```http
X-User-Token: your-token
Content-Type: multipart/form-data
```

**请求体** (FormData):
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件 |

**文件限制**:
- 允许格式: jpeg, jpg, png, gif, webp
- 最大大小: 5MB

**成功响应** (200):
```json
{
  "code": 200,
  "message": "图片上传成功",
  "url": "http://192.168.1.100:3000/uploads/file-1702716480123-123456789.jpg"
}
```

**错误响应** (400):
```json
{
  "code": 400,
  "error": "没有上传文件"
}
```

**使用示例** (UniApp):
```javascript
uni.chooseImage({
  count: 1,
  success: (res) => {
    uni.uploadFile({
      url: 'http://192.168.1.100:3000/api/upload',
      filePath: res.tempFilePaths[0],
      name: 'file',
      header: {
        'X-User-Token': uni.getStorageSync('user_token')
      },
      success: (uploadRes) => {
        const data = JSON.parse(uploadRes.data);
        console.log('图片URL:', data.url);
      }
    });
  }
});
```

---

### 3. 习惯管理 (Habits)

#### 3.1 获取习惯列表

**接口**: `GET /api/habits`

**请求头**:
```http
X-User-Token: your-token
```

**成功响应** (200):
```json
{
  "code": 200,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "userId": "507f1f77bcf86cd799439012",
      "name": "早起打卡",
      "frequency": "daily",
      "target": "每日",
      "currentStreak": 7,
      "maxStreak": 15,
      "checkIns": [
        "2025-12-10T00:00:00.000Z",
        "2025-12-11T00:00:00.000Z",
        "2025-12-12T00:00:00.000Z"
      ],
      "createdAt": "2025-12-01T00:00:00.000Z"
    }
  ]
}
```

---

#### 3.2 创建习惯

**接口**: `POST /api/habits`

**请求头**:
```http
X-User-Token: your-token
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "早起打卡",
  "frequency": "daily",
  "target": "每日6点起床"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | String | 是 | - | 习惯名称 |
| frequency | String | 否 | "daily" | 频率(daily/weekly_3/custom) |
| target | String | 否 | "每日" | 目标描述 |

**成功响应** (201):
```json
{
  "code": 200,
  "message": "习惯创建成功",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "userId": "507f1f77bcf86cd799439012",
    "name": "早起打卡",
    "frequency": "daily",
    "target": "每日6点起床",
    "currentStreak": 0,
    "maxStreak": 0,
    "checkIns": [],
    "createdAt": "2025-12-16T08:00:00.000Z"
  }
}
```

**错误响应** (400):
```json
{
  "code": 400,
  "error": "习惯名称不能为空"
}
```

---

#### 3.3 习惯打卡

**接口**: `POST /api/habits/:id/checkin`

**请求头**:
```http
X-User-Token: your-token
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | String | 习惯ID |

**成功响应** (200):
```json
{
  "code": 200,
  "message": "打卡成功",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "早起打卡",
    "currentStreak": 8,
    "maxStreak": 15,
    "checkIns": [
      "2025-12-10T00:00:00.000Z",
      "2025-12-11T00:00:00.000Z",
      "2025-12-12T00:00:00.000Z",
      "2025-12-16T02:30:15.123Z"
    ]
  }
}
```

**打卡逻辑**:
- 每天只能打卡一次
- 连续打卡会增加连击数(currentStreak)
- 断开连续打卡会重置连击数为1
- 自动更新历史最大连击数(maxStreak)

**错误响应** (400):
```json
{
  "code": 400,
  "error": "今天已打卡"
}
```

**错误响应** (404):
```json
{
  "code": 404,
  "error": "习惯未找到"
}
```

---

### 4. 日记管理 (Diaries)

#### 4.1 获取日记列表

**接口**: `GET /api/diaries`

**请求头**:
```http
X-User-Token: your-token
```

**成功响应** (200):
```json
{
  "code": 200,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "userId": "507f1f77bcf86cd799439012",
      "date": "2025-12-16T00:00:00.000Z",
      "mood": "😊",
      "coreEvent": "完成了项目的重要功能",
      "reflection": "今天很有成就感，继续保持",
      "createdAt": "2025-12-16T08:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "userId": "507f1f77bcf86cd799439012",
      "date": "2025-12-15T00:00:00.000Z",
      "mood": "😐",
      "coreEvent": "遇到了技术难题",
      "reflection": "需要更多学习",
      "createdAt": "2025-12-15T08:00:00.000Z"
    }
  ]
}
```

**说明**: 日记列表按日期倒序排列(最新的在前)

---

#### 4.2 创建/更新日记

**接口**: `POST /api/diaries`

**请求头**:
```http
X-User-Token: your-token
Content-Type: application/json
```

**请求体**:
```json
{
  "date": "2025-12-16T00:00:00.000Z",
  "mood": "😊",
  "coreEvent": "完成了项目的重要功能",
  "reflection": "今天很有成就感，继续保持"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| date | Date/String | 否 | 当前日期 | 日记日期 |
| mood | String | 是 | - | 情绪(表情符号或代号) |
| coreEvent | String | 否 | "" | 核心事件 |
| reflection | String | 否 | "" | 反思总结 |

**特殊说明**:
- 每天只能有一篇日记
- 如果当天已有日记，则更新现有日记内容 (Upsert模式)
- 日期会被标准化为当天00:00:00

**成功响应** (201):
```json
{
  "code": 200,
  "message": "日记保存成功",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439012",
    "date": "2025-12-16T00:00:00.000Z",
    "mood": "😊",
    "coreEvent": "完成了项目的重要功能",
    "reflection": "今天很有成就感，继续保持",
    "createdAt": "2025-12-16T08:00:00.000Z"
  }
}
```

**错误响应** (400):
```json
{
  "code": 400,
  "error": "情绪不能为空"
}
```

---

## 通用响应格式

### 成功响应结构

```json
{
  "code": 200,
  "message": "操作成功消息(可选)",
  "data": {} // 或 []
}
```

### 错误响应结构

```json
{
  "code": 400/401/404/500,
  "error": "错误消息"
}
```

### HTTP状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权(缺少Token) |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

---

## 前端集成示例

### UniApp 请求封装示例

```javascript
// utils/request.js
const BASE_URL = 'http://192.168.1.100:3000'; // 替换为实际服务器地址

// 获取或生成Token
function getToken() {
  let token = uni.getStorageSync('user_token');
  if (!token) {
    token = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    uni.setStorageSync('user_token', token);
  }
  return token;
}

// 通用请求方法
function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'X-User-Token': getToken()
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

// 导出API方法
export default {
  // 笔记相关
  getNotes: (params) => request('/api/notes?' + new URLSearchParams(params).toString()),
  getNote: (id) => request(`/api/notes/${id}`),
  createNote: (data) => request('/api/notes', 'POST', data),
  deleteNote: (id) => request(`/api/notes/${id}`, 'DELETE'),

  // 习惯相关
  getHabits: () => request('/api/habits'),
  createHabit: (data) => request('/api/habits', 'POST', data),
  checkInHabit: (id) => request(`/api/habits/${id}/checkin`, 'POST'),

  // 日记相关
  getDiaries: () => request('/api/diaries'),
  saveDiary: (data) => request('/api/diaries', 'POST', data),

  // 文件上传
  uploadImage: (filePath) => {
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: BASE_URL + '/api/upload',
        filePath: filePath,
        name: 'file',
        header: {
          'X-User-Token': getToken()
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            resolve(data.url);
          } else {
            reject(data.error);
          }
        },
        fail: reject
      });
    });
  }
};
```

### 使用示例

```javascript
import api from '@/utils/request.js';

export default {
  data() {
    return {
      notes: []
    };
  },

  async mounted() {
    await this.loadNotes();
  },

  methods: {
    // 获取笔记列表
    async loadNotes() {
      try {
        const res = await api.getNotes({ page: 1, limit: 10 });
        this.notes = res.data;
      } catch (err) {
        console.error('加载笔记失败:', err);
      }
    },

    // 创建笔记
    async createNote() {
      try {
        const res = await api.createNote({
          title: '新笔记',
          content: '笔记内容'
        });
        console.log('创建成功:', res.data);
        await this.loadNotes(); // 刷新列表
      } catch (err) {
        console.error('创建失败:', err);
      }
    },

    // 上传图片
    async uploadImage() {
      uni.chooseImage({
        count: 1,
        success: async (res) => {
          try {
            const url = await api.uploadImage(res.tempFilePaths[0]);
            console.log('图片上传成功:', url);
          } catch (err) {
            console.error('上传失败:', err);
          }
        }
      });
    },

    // 习惯打卡
    async checkIn(habitId) {
      try {
        const res = await api.checkInHabit(habitId);
        console.log('打卡成功:', res.data);
      } catch (err) {
        if (err.error === '今天已打卡') {
          uni.showToast({ title: '今天已经打卡过了', icon: 'none' });
        }
      }
    }
  }
};
```

---

## 注意事项

1. **认证Token**: 必须在App启动时生成并持久化存储，所有API请求都需要携带
2. **跨域问题**: 服务端已启用CORS，前端可直接请求
3. **图片URL**: 上传成功后返回的URL包含服务器IP地址，确保设备在同一局域网内
4. **日期格式**: 所有日期字段使用ISO 8601格式 (如: "2025-12-16T08:00:00.000Z")
5. **数据隔离**: 每个Token对应的用户数据完全隔离，无法访问其他用户数据
6. **错误处理**: 建议在客户端统一处理401错误，提示用户重新生成Token
7. **连接数据库**: 默认连接到MongoDB Atlas，可通过环境变量配置

---

## 环境变量配置

可通过环境变量自定义配置:

```bash
# 端口号
PORT=3000

# MongoDB连接字符串
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# 数据库名称
MONGODB_DB_NAME=notesapp
```

---

## 开发调试

### 启动服务器

```bash
# 生产环境
npm start

# 开发环境(自动重启)
npm run dev
```

### 测试接口

可使用以下工具测试接口:
- Postman
- Apifox
- curl命令

**curl示例**:
```bash
# 创建笔记
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "X-User-Token: test-token-123" \
  -d '{"title":"测试笔记","content":"这是内容"}'

# 获取笔记列表
curl http://localhost:3000/api/notes?page=1&limit=10 \
  -H "X-User-Token: test-token-123"
```

---

## 更新日志

### v1.0.0 (2025-12-16)
- 初始版本
- 实现笔记CRUD功能
- 实现习惯打卡功能
- 实现日记记录功能
- 支持图片上传
- 匿名Token认证机制

---

**文档生成时间**: 2025-12-16
**服务端版本**: 1.0.0
**文档维护**: 根据 server.js 自动生成
