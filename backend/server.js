const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// ============ МОДЕЛЬДІ ЖҮКТЕУ ============
const User = require('./userModel');  // ← ОСЫ ЖОЛДЫ ҚОСЫҢЫЗ!

const app = express();
const PORT = process.env.PORT || 3001;

// ============ MIDDLEWARE ============
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ============ MONGODB ҚОСЫЛЫМ ============
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://kuatkyzyaizada1:aizada2604@cluster0.qaicgp2.mongodb.net/site-physics?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    
    // Админді автоматты түрде қосу
    try {
      const adminExists = await User.findOne({ email: "kuatkyzyaizada1@gmail.com" });
      
      if (!adminExists) {
        await User.create({
          name: "Администратор",
          email: "kuatkyzyaizada1@gmail.com",
          password: "admin123",
          isAdmin: true,
          testResults: []
        });
        console.log("✅ Админ аккаунты автоматты түрде қосылды!");
      } else {
        console.log("✅ Админ аккаунты бұрыннан бар");
      }
    } catch (err) {
      console.log("Админ тексеру кезінде қате:", err.message);
    }
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ============ МАРШРУТТАР (ROUTES) ============

// Тест: сервер жұмыс істей ме?
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Регистрация
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Барлық өрістерді толтырыңыз" });
    }

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Бұл email бұрын қолданылған" });

    await User.create({ name, email, password, testResults: [] });

    res.json({ message: "Сәтті тіркелдіңіз!" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Қате болды" });
  }
});

// Логин
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(400).json({ success: false, message: "Email немесе құпия сөз қате" });
    }

    const isAdmin = user.isAdmin === true || email === "kuatkyzyaizada1@gmail.com";

    res.json({
      success: true,
      token: "mock-token-" + user._id,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: isAdmin
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Серверде қате болды" });
  }
});

// Пайдаланушыны алу
app.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });
    res.json(user);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Сервер қатесі" });
  }
});

// Тест нәтижесін сақтау
app.post('/save-test', async (req, res) => {
  try {
    const { userId, toqsan, testName, score, totalQuestions } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });
    
    if (!user.testResults) user.testResults = [];
    
    user.testResults.push({
      toqsan: toqsan || 1,
      testName: testName || "Тест",
      score: score || 0,
      totalQuestions: totalQuestions || 10,
      date: new Date()
    });
    
    await user.save();
    res.json({ success: true, message: "Тест нәтижесі сақталды!" });
  } catch (err) {
    console.error("Save test error:", err);
    res.status(500).json({ message: "Қате болды" });
  }
});

// Барлық нәтижелер (админ үшін)
app.get('/admin/all-results', async (req, res) => {
  try {
    const users = await User.find({});
    console.log('Табылған пайдаланушылар саны:', users.length);
    res.json(users);
  } catch (error) {
    console.error("Admin all-results error:", error);
    res.status(500).json({ message: "Деректерді алу мүмкін болмады" });
  }
});

// Оқушы прогрессі
app.get('/user-progress/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });
    
    const testResults = user.testResults || [];
    const progress = {
      totalTests: testResults.length,
      averageScore: 0,
      byToqsan: {}
    };
    
    for (let i = 1; i <= 4; i++) {
      const toqsanTests = testResults.filter(t => t.toqsan === i);
      progress.byToqsan[i] = {
        testCount: toqsanTests.length,
        averageScore: toqsanTests.length > 0 ? 
          toqsanTests.reduce((sum, t) => sum + (t.score / t.totalQuestions * 100), 0) / toqsanTests.length : 0
      };
    }
    
    const allScores = testResults.map(t => (t.score / t.totalQuestions * 100));
    progress.averageScore = allScores.length > 0 ? 
      allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
    
    res.json(progress);
  } catch (err) {
    console.error("Progress fetch error:", err);
    res.status(500).json({ message: "Қате болды" });
  }
});

// ============ СЕРВЕРДІ ҚОСУ ============
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
});
