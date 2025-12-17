const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors'); 
const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
// 0. 模型定义 (Model Definitions)
// =================================================================

// 简化版随机ID生成器，替代复杂的UUID库
const generateAnonymousToken = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

// ------------------- 用户模型 -------------------
const UserSchema = new mongoose.Schema({
    anonymousToken: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const User = mongoose.model('User', UserSchema);

// ------------------- 笔记模型 (更新为关联用户) -------------------
const NoteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 新增用户ID关联
    title: { type: String, required: true },
    content: { type: String, default: '' },
    images: [{ type: String }]
}, {
    timestamps: true // 自动管理 createdAt 和 updatedAt
});
const Note = mongoose.model('Note', NoteSchema);

// ------------------- 习惯模型 (Habit) -------------------
const HabitSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    frequency: { type: String, default: 'daily' }, // daily, weekly_3, custom
    target: { type: String, default: '每日' }, // 目标描述
    currentStreak: { type: Number, default: 0 }, // 当前连击天数
    maxStreak: { type: Number, default: 0 }, // 历史最大连击
    checkIns: [{ type: Date }] // 打卡日期列表
}, {
    timestamps: true // 自动管理 createdAt 和 updatedAt
});
const Habit = mongoose.model('Habit', HabitSchema);

// ------------------- 日记/情绪模型 (Diary) -------------------
const DiarySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, unique: true }, // 确保每天只有一篇日记
    mood: { type: String, required: true }, // 情绪图标或代号
    coreEvent: { type: String, default: '' }, // 核心事件
    reflection: { type: String, default: '' } // 反思总结
}, {
    timestamps: true // 自动管理 createdAt 和 updatedAt
});
const Diary = mongoose.model('Diary', DiarySchema);


// =================================================================
// 1. 文件和中间件配置 (File & Middleware Setup)
// =================================================================

// 确保 uploads 文件夹存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 multer 存储 (此处代码不变)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

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

// =================================================================
// 时间转换工具函数
// =================================================================

/**
 * 将 UTC 时间转换为北京时间字符串
 * @param {Date} date - UTC 时间
 * @returns {string} 格式化的北京时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
function toBeijingTime(date) {
  if (!date) return null;

  const utcDate = new Date(date);
  // 北京时间 = UTC + 8小时
  const beijingDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);

  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');
  const hours = String(beijingDate.getUTCHours()).padStart(2, '0');
  const minutes = String(beijingDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(beijingDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 递归转换对象中的所有日期字段为北京时间
 * @param {*} obj - 要转换的对象
 * @returns {*} 转换后的对象
 */
function convertDateFields(obj) {
  if (!obj) return obj;

  // 如果是数组，递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => convertDateFields(item));
  }

  // 如果是 Date 对象，转换为北京时间字符串
  if (obj instanceof Date) {
    return toBeijingTime(obj);
  }

  // 如果是 Mongoose 文档，转换为 JSON 对象（自动处理 ObjectId）
  if (obj.toJSON && typeof obj.toJSON === 'function') {
    obj = obj.toJSON();
  } else if (obj.toObject && typeof obj.toObject === 'function') {
    obj = obj.toObject();
  }

  // 如果是普通对象，递归处理所有属性
  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        // 特殊处理日期字段
        if (value instanceof Date) {
          converted[key] = toBeijingTime(value);
        }
        // 处理 ObjectId（转换为字符串）
        else if (value && value.constructor && value.constructor.name === 'ObjectId') {
          converted[key] = value.toString();
        }
        // 递归处理对象和数组
        else if (value && typeof value === 'object') {
          converted[key] = convertDateFields(value);
        }
        // 其他类型直接赋值
        else {
          converted[key] = value;
        }
      }
    }
    return converted;
  }

  return obj;
}

// 通用中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // CORS 启用
app.use('/uploads', express.static(uploadsDir)); // 静态文件服务


// =================================================================
// 2. 匿名认证中间件 (Auth Middleware)
// =================================================================

const authMiddleware = async (req, res, next) => {
    // 客户端应在请求头中发送 X-User-Token，例如：uni.setStorageSync('user_token') 的值
    const token = req.header('X-User-Token');
    
    // 如果没有 Token，则拒绝访问，要求客户端先获取 Token (或进入应用时自动生成)
    if (!token) {
        return res.status(401).json({ 
            code: 401, 
            error: '需要 X-User-Token 权限标识',
            suggestion: '请在 App 启动时生成一个唯一ID并存储，作为 X-User-Token 发送。'
        });
    }

    try {
        // 尝试查找用户
        let user = await User.findOne({ anonymousToken: token });

        if (!user) {
            // 如果用户不存在，则创建新用户 (Guest Mode 自动注册)
            user = new User({ anonymousToken: token });
            await user.save();
        }

        // 将用户ID挂载到请求对象上，供后续路由使用
        req.userId = user._id;
        next();
    } catch (error) {
        res.status(500).json({ code: 500, error: '认证过程失败' });
    }
};

// 将认证中间件应用于所有需要用户权限的 API 路由
app.use('/api', authMiddleware);


// =================================================================
// 3. 数据库连接 (Database Connection)
// =================================================================

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
    process.exit(1);
  });

// 基本路由
app.get('/', (req, res) => {
  res.json({ message: '笔记应用后端 API' });
});

// =================================================================
// 4. Note 模型的 CRUD 接口 (更新为使用 req.userId 过滤)
// =================================================================

/**
 * 查询所有笔记
 * GET /api/notes
 */
app.get('/api/notes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const pageSize = parseInt(req.query.pageSize) || limit; 
    const sort = req.query.sort || '-createdAt';

    // 构建查询条件，包含用户ID过滤
    const query = { userId: req.userId };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const notes = await Note.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize);
    const total = await Note.countDocuments(query);

    res.json({
      code: 200,
      data: convertDateFields(notes),
      total: total,
      pagination: { page, limit: pageSize, total, pages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    res.status(500).json({ code: 500, error: error.message });
  }
});

/**
 * 根据 ID 获取单个笔记
 * GET /api/notes/:id
 */
app.get('/api/notes/:id', async (req, res) => {
  try {
    // 必须同时匹配 ID 和用户 ID
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!note) {
      return res.status(404).json({ code: 404, error: '笔记未找到或无权访问' });
    }
    res.json({ code: 200, data: convertDateFields(note) });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ code: 400, error: '无效的笔记 ID' });
    }
    res.status(500).json({ code: 500, error: error.message });
  }
});

/**
 * 创建新笔记
 * POST /api/notes
 */
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, images } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ code: 400, error: '标题不能为空' });
    }

    const note = new Note({
      userId: req.userId, // 写入用户ID
      title: title.trim(),
      content: content || '',
      images: images || []
    });
    await note.save();

    res.status(201).json({ code: 200, message: '笔记创建成功', data: convertDateFields(note) });
  } catch (error) {
    res.status(400).json({ code: 400, error: error.message });
  }
});

/**
 * 完整更新笔记
 * PUT /api/notes/:id
 */
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { title, content, images } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ code: 400, error: '标题不能为空' });
    }

    // 必须同时匹配 ID 和用户 ID，updatedAt 会自动更新
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        title: title.trim(),
        content: content || '',
        images: images || []
      },
      { new: true, runValidators: true } // new: true 返回更新后的文档
    );

    if (!note) {
      return res.status(404).json({ code: 404, error: '笔记未找到或无权访问' });
    }

    res.json({ code: 200, message: '笔记更新成功', data: convertDateFields(note) });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ code: 400, error: '无效的笔记 ID' });
    }
    res.status(400).json({ code: 400, error: error.message });
  }
});

/**
 * 部分更新笔记
 * PATCH /api/notes/:id
 */
app.patch('/api/notes/:id', async (req, res) => {
  try {
    const { title, content, images } = req.body;
    const updateData = {};

    // 只更新提供的字段
    if (title !== undefined) {
      if (title.trim() === '') {
        return res.status(400).json({ code: 400, error: '标题不能为空' });
      }
      updateData.title = title.trim();
    }
    if (content !== undefined) updateData.content = content;
    if (images !== undefined) updateData.images = images;

    // 必须同时匹配 ID 和用户 ID，updatedAt 会自动更新
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ code: 404, error: '笔记未找到或无权访问' });
    }

    res.json({ code: 200, message: '笔记更新成功', data: convertDateFields(note) });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ code: 400, error: '无效的笔记 ID' });
    }
    res.status(400).json({ code: 400, error: error.message });
  }
});

/**
 * 删除笔记
 * DELETE /api/notes/:id
 */
app.delete('/api/notes/:id', async (req, res) => {
  try {
    // 必须同时匹配 ID 和用户 ID 才能删除
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!note) {
      return res.status(404).json({ code: 404, error: '笔记未找到或无权访问' });
    }

    res.json({ code: 200, message: '笔记删除成功', data: convertDateFields(note) });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ code: 400, error: '无效的笔记 ID' });
    }
    res.status(500).json({ code: 500, error: error.message });
  }
});

// 图片上传接口 (无需用户ID，但需要放在 authMiddleware 之后)
app.post('/api/upload', upload.single('file'), (req, res) => { 
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, error: '没有上传文件' });
    }

    const localIP = getLocalNetworkIP() || req.get('host');
    const imageUrl = `http://${localIP}:${PORT}/uploads/${req.file.filename}`;

    res.json({
      code: 200,
      message: '图片上传成功',
      url: imageUrl
    });
  } catch (error) {
    res.status(500).json({ code: 500, error: error.message });
  }
});


// =================================================================
// 5. 新增 Habit 模型的 CRUD 接口
// =================================================================

/**
 * 查询所有习惯
 * GET /api/habits
 */
app.get('/api/habits', async (req, res) => {
    try {
        const habits = await Habit.find({ userId: req.userId }).sort('-createdAt');
        res.json({ code: 200, data: convertDateFields(habits) });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
});

/**
 * 创建新习惯
 * POST /api/habits
 */
app.post('/api/habits', async (req, res) => {
    try {
        const { name, frequency, target } = req.body;
        if (!name) return res.status(400).json({ code: 400, error: '习惯名称不能为空' });

        const habit = new Habit({
            userId: req.userId,
            name,
            frequency: frequency || 'daily',
            target: target || '每日'
        });
        await habit.save();
        res.status(201).json({ code: 200, message: '习惯创建成功', data: convertDateFields(habit) });
    } catch (error) {
        res.status(400).json({ code: 400, error: error.message });
    }
});

/**
 * 习惯打卡接口 (Check-in)
 * POST /api/habits/:id/checkin
 */
app.post('/api/habits/:id/checkin', async (req, res) => {
    try {
        const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
        if (!habit) return res.status(404).json({ code: 404, error: '习惯未找到' });

        // 简单的打卡逻辑：今天是否已打卡
        const today = new Date().toISOString().slice(0, 10);
        const lastCheckIn = habit.checkIns.length > 0 ? habit.checkIns[habit.checkIns.length - 1].toISOString().slice(0, 10) : null;
        
        if (lastCheckIn === today) {
             return res.status(400).json({ code: 400, error: '今天已打卡' });
        }

        // 连击逻辑 (简化版：只检查昨天)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().slice(0, 10);
        
        if (lastCheckIn === yesterdayString) {
            habit.currentStreak += 1; // 连续打卡
        } else {
            habit.currentStreak = 1; // 重新开始连击
        }
        
        habit.maxStreak = Math.max(habit.maxStreak, habit.currentStreak);
        habit.checkIns.push(new Date()); // 记录打卡时间

        await habit.save();
        res.json({ code: 200, message: '打卡成功', data: convertDateFields(habit) });

    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
});

// =================================================================
// 6. 新增 Diary 模型的 CRUD 接口
// =================================================================

/**
 * 查询所有日记
 * GET /api/diaries
 */
app.get('/api/diaries', async (req, res) => {
    try {
        const diaries = await Diary.find({ userId: req.userId }).sort('-date');
        res.json({ code: 200, data: convertDateFields(diaries) });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
});

/**
 * 创建/更新日记 (Upsert: 每天只能有一篇日记)
 * POST /api/diaries
 */
app.post('/api/diaries', async (req, res) => {
    try {
        const { date, mood, coreEvent, reflection } = req.body;
        if (!mood) return res.status(400).json({ code: 400, error: '情绪不能为空' });

        // 将日期标准化为当天开始的午夜时间，用于唯一性判断
        const diaryDate = new Date(date || Date.now());
        diaryDate.setHours(0, 0, 0, 0);

        const diary = await Diary.findOneAndUpdate(
            { userId: req.userId, date: diaryDate }, // 查找条件：用户ID和今天的日期
            {
                $set: {
                    mood,
                    coreEvent: coreEvent || '',
                    reflection: reflection || ''
                }
            },
            { upsert: true, new: true, runValidators: true } // 如果不存在则创建，返回新文档
        );

        res.status(201).json({ code: 200, message: '日记保存成功', data: convertDateFields(diary) });
    } catch (error) {
        // 处理重复创建的错误（尽管 findOneAndUpdate 应该解决了这个问题）
        if (error.code === 11000) { 
            return res.status(400).json({ code: 400, error: '今天已经记录过日记，请编辑而不是新建' });
        }
        res.status(500).json({ code: 500, error: error.message });
    }
});

// 获取局域网 IP 地址 (此函数不变)
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
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
  
  const localIP = getLocalNetworkIP();
  if (localIP) {
    console.log(`🌐 局域网访问地址: http://${localIP}:${PORT}`);
  } else {
    console.log(`⚠️  无法获取局域网 IP 地址`);
  }
  console.log('✅ CORS 已启用，匿名认证中间件已加载。');
});