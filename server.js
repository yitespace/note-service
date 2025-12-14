const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors'); // <<< 1. 引入 CORS 模块
const Note = require('./models/Note');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保 uploads 文件夹存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器：只允许图片
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为 5MB
  },
  fileFilter: fileFilter
});

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =================================================================
// 🚨 CORS 配置：在所有路由和静态文件服务之前启用！
// 允许所有来源（*）访问 API，解决 UniApp 跨域问题
app.use(cors()); 
// =================================================================

// 静态文件服务：提供 uploads 文件夹的访问
app.use('/uploads', express.static(uploadsDir));

// MongoDB 连接
// 默认使用提供的 Atlas 连接串，环境变量 MONGODB_URI 可覆盖
const DEFAULT_MONGODB_URI = 'mongodb+srv://zhuangrongjian:zhuangrongjian@cluster0.la8fkvn.mongodb.net/';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'notesapp';

mongoose.connect(MONGODB_URI, {
  dbName: MONGODB_DB_NAME,
})
  .then(() => {
    console.log('✅ MongoDB 连接成功');
    console.log(`📊 数据库: ${mongoose.connection.name}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB 连接失败:', error.message);
    console.error('\n💡 解决方案：');
    console.error('1. 如果使用本地 MongoDB，请确保 MongoDB 服务已启动');
    console.error('2. 如果使用 MongoDB Atlas，请检查连接字符串是否正确');
    console.error('3. 可以通过环境变量 MONGODB_URI 设置连接字符串');
    console.error('\n示例：');
    console.error('  Windows: set MONGODB_URI=mongodb://localhost:27017/notesapp');
    console.error('  Linux/Mac: export MONGODB_URI=mongodb://localhost:27017/notesapp');
    process.exit(1);
  });

// 基本路由
app.get('/', (req, res) => {
  res.json({ message: '笔记应用后端 API' });
});

// ==================== Note 模型的 CRUD 接口 ====================

/**
 * 查询所有笔记（支持分页、搜索、排序）
 * GET /api/notes
 * 查询参数：
 * - page: 页码（默认 1）
 * - limit: 每页数量（默认 10）
 * - search: 搜索关键词（搜索 title 和 content）
 * - sort: 排序方式（默认 -createdAt，-表示降序）
 */
app.get('/api/notes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    // 兼容前端传入的 pageSize 参数
    const pageSize = parseInt(req.query.pageSize) || limit; 
    const sort = req.query.sort || '-createdAt';

    // 构建查询条件
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // 执行查询
    const notes = await Note.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize); // 使用 pageSize

    // 获取总数
    const total = await Note.countDocuments(query);

    // 统一返回前端需要的格式：code: 200, data: [], total: 100
    res.json({
      code: 200, // 统一使用 code
      data: notes,
      total: total,
      pagination: {
        page,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 500, // 统一使用 code
      error: error.message
    });
  }
});

/**
 * 根据 ID 获取单个笔记
 * GET /api/notes/:id
 */
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        code: 404, // 统一使用 code
        error: '笔记未找到'
      });
    }

    res.json({
      code: 200, // 统一使用 code
      data: note
    });
  } catch (error) {
    // 处理无效的 ObjectId 格式
    if (error.name === 'CastError') {
      return res.status(400).json({
        code: 400, // 统一使用 code
        error: '无效的笔记 ID'
      });
    }
    res.status(500).json({
      code: 500, // 统一使用 code
      error: error.message
    });
  }
});

/**
 * 创建新笔记
 * POST /api/notes
 * 请求体：
 * - title: 标题（必填）
 * - content: 内容（可选）
 * - images: 图片数组（可选）
 */
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, images } = req.body;

    // 验证必填字段
    if (!title || title.trim() === '') {
      return res.status(400).json({
        code: 400,
        error: '标题不能为空'
      });
    }

    const note = new Note({
      title: title.trim(),
      content: content || '',
      images: images || []
    });

    await note.save();

    res.status(201).json({
      code: 200,
      message: '笔记创建成功',
      data: note
    });
  } catch (error) {
    res.status(400).json({
      code: 400,
      error: error.message
    });
  }
});

/**
 * 完整更新笔记（PUT）
 * PUT /api/notes/:id
 * 请求体：包含所有字段
 */
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { title, content, images } = req.body;

    // 验证必填字段
    if (!title || title.trim() === '') {
      return res.status(400).json({
        code: 400,
        error: '标题不能为空'
      });
    }

    const note = await Note.findByIdAndUpdate(
      req.params.id,
      {
        title: title.trim(),
        content: content || '',
        images: images || []
      },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        code: 404,
        error: '笔记未找到'
      });
    }

    res.json({
      code: 200,
      message: '笔记更新成功',
      data: note
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        code: 400,
        error: '无效的笔记 ID'
      });
    }
    res.status(400).json({
      code: 400,
      error: error.message
    });
  }
});

/**
 * 部分更新笔记（PATCH）
 * PATCH /api/notes/:id
 * 请求体：只包含需要更新的字段
 */
app.patch('/api/notes/:id', async (req, res) => {
  try {
    const updateData = {};

    // 只更新提供的字段
    if (req.body.title !== undefined) {
      if (req.body.title.trim() === '') {
        return res.status(400).json({
          code: 400,
          error: '标题不能为空'
        });
      }
      updateData.title = req.body.title.trim();
    }

    if (req.body.content !== undefined) {
      updateData.content = req.body.content;
    }

    if (req.body.images !== undefined) {
      updateData.images = req.body.images;
    }

    const note = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        code: 404,
        error: '笔记未找到'
      });
    }

    res.json({
      code: 200,
      message: '笔记更新成功',
      data: note
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        code: 400,
        error: '无效的笔记 ID'
      });
    }
    res.status(400).json({
      code: 400,
      error: error.message
    });
  }
});

/**
 * 删除笔记
 * DELETE /api/notes/:id
 */
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return res.status(404).json({
        code: 404,
        error: '笔记未找到'
      });
    }

    res.json({
      code: 200,
      message: '笔记删除成功',
      data: note
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        code: 400,
        error: '无效的笔记 ID'
      });
    }
    res.status(500).json({
      code: 500,
      error: error.message
    });
  }
});

// 图片上传接口
app.post('/api/upload', upload.single('file'), (req, res) => { // 兼容前端用 file 字段上传
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, error: '没有上传文件' });
    }

    // 获取局域网 IP
    const localIP = getLocalNetworkIP() || req.get('host');
    const imageUrl = `http://${localIP}:${PORT}/uploads/${req.file.filename}`;

    // 返回前端需要的简洁格式
    res.json({
      code: 200,
      message: '图片上传成功',
      url: imageUrl
    });
  } catch (error) {
    res.status(500).json({ code: 500, error: error.message });
  }
});

// 多图片上传接口
app.post('/api/upload/multiple', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ code: 400, error: '没有上传文件' });
    }

    const localIP = getLocalNetworkIP() || req.get('host');
    const baseUrl = `http://${localIP}:${PORT}`;
    
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: `${baseUrl}/uploads/${file.filename}`
    }));

    res.json({
      code: 200,
      message: '图片上传成功',
      count: uploadedFiles.length,
      files: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({ code: 500, error: error.message });
  }
});

// 获取局域网 IP 地址
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部（回环）地址和非 IPv4 地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  
  // 输出局域网访问地址
  const localIP = getLocalNetworkIP();
  if (localIP) {
    console.log(`🌐 局域网访问地址: http://${localIP}:${PORT}`);
  } else {
    console.log(`⚠️  无法获取局域网 IP 地址`);
  }
  console.log('✅ CORS 已启用，允许跨域访问。');
});