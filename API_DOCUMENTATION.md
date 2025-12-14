# 笔记应用后端 API 文档

## 基础信息

- **服务器地址**: `http://localhost:3000`
- **Content-Type**: `application/json` (除文件上传接口外)
- **数据格式**: JSON

---

## 数据模型

### Note (笔记)

```typescript
interface Note {
  _id: string;              // MongoDB 自动生成的 ID
  title: string;            // 标题（必填）
  content: string;          // 内容（可选，默认为空字符串）
  images: string[];         // 图片 URL 数组（可选，默认为空数组）
  createdAt: Date;          // 创建时间（自动生成）
}
```

---

## API 接口列表

### 1. 健康检查

**GET** `/`

检查服务器是否正常运行。

#### 响应示例

```json
{
  "message": "笔记应用后端 API"
}
```

---

### 2. 获取笔记列表

**GET** `/api/notes`

获取所有笔记，支持分页、搜索和排序。

#### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码（从 1 开始） |
| limit | number | 否 | 10 | 每页数量 |
| search | string | 否 | - | 搜索关键词（搜索 title 和 content） |
| sort | string | 否 | -createdAt | 排序方式（-表示降序，+或不加表示升序） |

#### 排序示例
- `-createdAt`: 按创建时间降序（最新的在前）
- `createdAt`: 按创建时间升序（最旧的在前）
- `-title`: 按标题降序
- `title`: 按标题升序

#### 请求示例

```
GET http://localhost:3000/api/notes?page=1&limit=10&search=测试&sort=-createdAt
```

#### 成功响应 (200)

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "测试笔记",
      "content": "这是笔记内容",
      "images": ["http://localhost:3000/uploads/image-1234567890.jpg"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### 错误响应 (500)

```json
{
  "success": false,
  "error": "错误信息"
}
```

---

### 3. 获取单个笔记

**GET** `/api/notes/:id`

根据 ID 获取单个笔记详情。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 笔记的 MongoDB _id |

#### 请求示例

```
GET http://localhost:3000/api/notes/507f1f77bcf86cd799439011
```

#### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "测试笔记",
    "content": "这是笔记内容",
    "images": ["http://localhost:3000/uploads/image-1234567890.jpg"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

**404 - 笔记未找到**
```json
{
  "success": false,
  "error": "笔记未找到"
}
```

**400 - 无效的 ID**
```json
{
  "success": false,
  "error": "无效的笔记 ID"
}
```

---

### 4. 创建笔记

**POST** `/api/notes`

创建一条新笔记。

#### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 笔记标题（不能为空） |
| content | string | 否 | 笔记内容（默认为空字符串） |
| images | string[] | 否 | 图片 URL 数组（默认为空数组） |

#### 请求示例

```json
{
  "title": "我的第一篇笔记",
  "content": "这是笔记的内容...",
  "images": [
    "http://localhost:3000/uploads/image-1234567890.jpg"
  ]
}
```

#### 成功响应 (201)

```json
{
  "success": true,
  "message": "笔记创建成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "我的第一篇笔记",
    "content": "这是笔记的内容...",
    "images": ["http://localhost:3000/uploads/image-1234567890.jpg"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

**400 - 标题为空**
```json
{
  "success": false,
  "error": "标题不能为空"
}
```

---

### 5. 完整更新笔记

**PUT** `/api/notes/:id`

完整更新笔记的所有字段（需要提供所有字段）。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 笔记的 MongoDB _id |

#### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 笔记标题（不能为空） |
| content | string | 否 | 笔记内容 |
| images | string[] | 否 | 图片 URL 数组 |

#### 请求示例

```
PUT http://localhost:3000/api/notes/507f1f77bcf86cd799439011
```

```json
{
  "title": "更新后的标题",
  "content": "更新后的内容",
  "images": ["http://localhost:3000/uploads/image-new.jpg"]
}
```

#### 成功响应 (200)

```json
{
  "success": true,
  "message": "笔记更新成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "更新后的标题",
    "content": "更新后的内容",
    "images": ["http://localhost:3000/uploads/image-new.jpg"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

**404 - 笔记未找到**
```json
{
  "success": false,
  "error": "笔记未找到"
}
```

**400 - 标题为空或无效 ID**
```json
{
  "success": false,
  "error": "标题不能为空"
}
```

---

### 6. 部分更新笔记

**PATCH** `/api/notes/:id`

部分更新笔记（只需提供要更新的字段）。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 笔记的 MongoDB _id |

#### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 笔记标题（如果提供，不能为空） |
| content | string | 否 | 笔记内容 |
| images | string[] | 否 | 图片 URL 数组 |

**注意**: 只需提供要更新的字段，未提供的字段保持不变。

#### 请求示例

```
PATCH http://localhost:3000/api/notes/507f1f77bcf86cd799439011
```

**只更新标题**
```json
{
  "title": "新标题"
}
```

**只更新内容**
```json
{
  "content": "新内容"
}
```

**更新多个字段**
```json
{
  "title": "新标题",
  "content": "新内容"
}
```

#### 成功响应 (200)

```json
{
  "success": true,
  "message": "笔记更新成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "新标题",
    "content": "新内容",
    "images": ["http://localhost:3000/uploads/image-1234567890.jpg"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

**404 - 笔记未找到**
```json
{
  "success": false,
  "error": "笔记未找到"
}
```

**400 - 标题为空或无效 ID**
```json
{
  "success": false,
  "error": "标题不能为空"
}
```

---

### 7. 删除笔记

**DELETE** `/api/notes/:id`

删除指定的笔记。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 笔记的 MongoDB _id |

#### 请求示例

```
DELETE http://localhost:3000/api/notes/507f1f77bcf86cd799439011
```

#### 成功响应 (200)

```json
{
  "success": true,
  "message": "笔记删除成功",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "测试笔记",
    "content": "这是笔记内容",
    "images": [],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

**404 - 笔记未找到**
```json
{
  "success": false,
  "error": "笔记未找到"
}
```

**400 - 无效的 ID**
```json
{
  "success": false,
  "error": "无效的笔记 ID"
}
```

---

### 8. 单图片上传

**POST** `/api/upload`

上传单张图片。

#### 请求格式

- **Content-Type**: `multipart/form-data`
- **字段名**: `image`
- **文件类型**: 仅支持图片（jpeg, jpg, png, gif, webp）
- **文件大小限制**: 5MB

#### 请求示例

使用 FormData 上传文件：

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  body: formData
});
```

#### 成功响应 (200)

```json
{
  "message": "图片上传成功",
  "filename": "image-1234567890-987654321.jpg",
  "originalName": "photo.jpg",
  "size": 102400,
  "url": "http://localhost:3000/uploads/image-1234567890-987654321.jpg"
}
```

#### 错误响应

**400 - 没有上传文件**
```json
{
  "error": "没有上传文件"
}
```

**400 - 文件类型不支持**
```json
{
  "error": "只允许上传图片文件 (jpeg, jpg, png, gif, webp)"
}
```

**400 - 文件过大**
```json
{
  "error": "文件大小超过限制"
}
```

---

### 9. 多图片上传

**POST** `/api/upload/multiple`

一次上传多张图片（最多 10 张）。

#### 请求格式

- **Content-Type**: `multipart/form-data`
- **字段名**: `images`（注意是复数）
- **文件类型**: 仅支持图片（jpeg, jpg, png, gif, webp）
- **文件大小限制**: 每个文件 5MB
- **数量限制**: 最多 10 张

#### 请求示例

使用 FormData 上传多个文件：

```javascript
const formData = new FormData();
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('images', fileInput.files[i]);
}

fetch('http://localhost:3000/api/upload/multiple', {
  method: 'POST',
  body: formData
});
```

#### 成功响应 (200)

```json
{
  "message": "图片上传成功",
  "count": 2,
  "files": [
    {
      "filename": "images-1234567890-111111111.jpg",
      "originalName": "photo1.jpg",
      "size": 102400,
      "url": "http://localhost:3000/uploads/images-1234567890-111111111.jpg"
    },
    {
      "filename": "images-1234567890-222222222.png",
      "originalName": "photo2.png",
      "size": 204800,
      "url": "http://localhost:3000/uploads/images-1234567890-222222222.png"
    }
  ]
}
```

#### 错误响应

**400 - 没有上传文件**
```json
{
  "error": "没有上传文件"
}
```

---

## 错误处理

### HTTP 状态码

- **200**: 请求成功
- **201**: 创建成功
- **400**: 请求参数错误（如标题为空、无效的 ID 等）
- **404**: 资源未找到（如笔记不存在）
- **500**: 服务器内部错误

### 统一错误响应格式

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

---

## 使用流程示例

### 创建笔记并上传图片的完整流程

1. **上传图片**
   ```
   POST /api/upload
   FormData: { image: file }
   ```
   获取返回的 `url`

2. **创建笔记**
   ```
   POST /api/notes
   Body: {
     "title": "我的笔记",
     "content": "内容",
     "images": ["http://localhost:3000/uploads/image-xxx.jpg"]
   }
   ```

3. **获取笔记列表**
   ```
   GET /api/notes?page=1&limit=10
   ```

4. **更新笔记**
   ```
   PATCH /api/notes/:id
   Body: {
     "title": "更新后的标题"
   }
   ```

5. **删除笔记**
   ```
   DELETE /api/notes/:id
   ```

---

## 前端开发建议

### 1. API 请求封装

建议创建一个 API 服务类来封装所有请求：

```javascript
const API_BASE_URL = 'http://localhost:3000';

class NoteAPI {
  // 获取笔记列表
  static async getNotes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/notes?${queryString}`);
    return response.json();
  }

  // 获取单个笔记
  static async getNote(id) {
    const response = await fetch(`${API_BASE_URL}/api/notes/${id}`);
    return response.json();
  }

  // 创建笔记
  static async createNote(note) {
    const response = await fetch(`${API_BASE_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    return response.json();
  }

  // 更新笔记（完整）
  static async updateNote(id, note) {
    const response = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    return response.json();
  }

  // 更新笔记（部分）
  static async patchNote(id, updates) {
    const response = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  // 删除笔记
  static async deleteNote(id) {
    const response = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  // 上传单张图片
  static async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }

  // 上传多张图片
  static async uploadImages(files) {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    const response = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }
}
```

### 2. 错误处理

```javascript
try {
  const result = await NoteAPI.createNote({
    title: '我的笔记',
    content: '内容'
  });
  
  if (result.success) {
    console.log('创建成功', result.data);
  } else {
    console.error('创建失败', result.error);
  }
} catch (error) {
  console.error('请求失败', error);
}
```

### 3. 图片显示

上传后返回的 `url` 可以直接用于 `<img>` 标签：

```html
<img src="http://localhost:3000/uploads/image-1234567890.jpg" alt="笔记图片" />
```

---

## 注意事项

1. **CORS**: 如果前端运行在不同端口，需要配置 CORS
2. **图片 URL**: 上传后的图片 URL 是相对路径，需要根据实际部署情况调整
3. **文件大小**: 单张图片限制 5MB，多图片上传最多 10 张
4. **ID 格式**: MongoDB 的 `_id` 是 24 位十六进制字符串
5. **时间格式**: `createdAt` 是 ISO 8601 格式的日期字符串

---

## 测试建议

### Postman 测试

1. **创建笔记**
   - Method: POST
   - URL: `http://localhost:3000/api/notes`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "title": "测试笔记",
       "content": "这是测试内容"
     }
     ```

2. **上传图片**
   - Method: POST
   - URL: `http://localhost:3000/api/upload`
   - Body: form-data
   - Key: `image` (类型选择 File)
   - Value: 选择图片文件

3. **获取笔记列表**
   - Method: GET
   - URL: `http://localhost:3000/api/notes?page=1&limit=10`

---

**文档版本**: 1.0  
**最后更新**: 2024


