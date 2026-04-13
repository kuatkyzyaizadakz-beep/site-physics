const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./userModel");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: "*", // Allow all origins for development
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// MongoDB connection
mongoose.connect("mongodb+srv://kuatkyzyaizada1:Aizada2604@cluster0.qaicgp2.mongodb.net/?appName=Cluster0")
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.log("MongoDB connection error:", err));

// Routes
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Барлық өрістерді толтырыңыз" });
    }

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Бұл email бұрын қолданылған" });

    await User.create({ name, email, password });

    res.json({ message: "Сәтті тіркелдіңіз!" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Қате болды" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(400).json({ success: false, message: "Email немесе құпия сөз қате" });
    }

    // Тексеру: Бұл админ бе? 
    // Төмендегі email-ді өзіңіздің базадағы админ email-іне ауыстырыңыз
    const isAdmin = (email === "kuatkyzyaizada@gmail.com"); 

    res.json({
      success: true,
      token: "mock-token-" + user._id, // Нақты жобада JWT қолданған дұрыс
      user: {
        id: user._id,
        name: user.name,
        isAdmin: isAdmin // Админ екенін фронтендке айтамыз
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Серверде қате болды" });
  }
});

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Use port 3001 instead of 5000
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Get user profile
app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });
    
    res.json(user);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Сервер қатесі" });
  }
});

// Save test results
app.post("/save-test", async (req, res) => {
  try {
    const { userId, toqsan, testName, score, totalQuestions } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });
    
    user.testResults.push({
      toqsan,
      testName,
      score,
      totalQuestions
    });
    
    await user.save();
    res.json({ success: true, message: "Тест нәтижесі сақталды!" });
  } catch (err) {
    console.error("Save test error:", err);
    res.status(500).json({ message: "Қате болды" });
  }
});

// Get user progress
app.get("/user-progress/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });
    
    const progress = {
      totalTests: user.testResults.length,
      averageScore: 0,
      byToqsan: {}
    };
    
    // Calculate progress by тоқсан
    for (let i = 1; i <= 4; i++) {
      const toqsanTests = user.testResults.filter(t => t.toqsan === i);
      progress.byToqsan[i] = {
        testCount: toqsanTests.length,
        averageScore: toqsanTests.length > 0 ? 
          toqsanTests.reduce((sum, t) => sum + (t.score / t.totalQuestions * 100), 0) / toqsanTests.length : 0
      };
    }
    
    // Calculate overall average
    const allScores = user.testResults.map(t => (t.score / t.totalQuestions * 100));
    progress.averageScore = allScores.length > 0 ? 
      allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
    
    res.json(progress);
  } catch (err) {
    console.error("Progress fetch error:", err);
    res.status(500).json({ message: "Қате болды" });
  }
});

// Барлық пайдаланушылар мен олардың нәтижелерін алу
app.get('/admin/all-results', async (req, res) => {
    try {
        // Мұнда User - бұл сіздің MongoDB-дегі модель атыңыз
        // Барлық пайдаланушыларды тауып, олардың нәтижелерін қайтарамыз
        const users = await User.find({}, 'name email testResults');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Деректерді алу мүмкін болмады" });
    }
});

// Get user progress by modules
app.get("/user-progress-modules/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });

    const modules = {
      "kinematika": { name: "Кинематика", tests: [], averageScore: 0 },
      "dinamika": { name: "Динамика", tests: [], averageScore: 0 },
      "energia": { name: "Энергия және жұмыс", tests: [], averageScore: 0 },
      "elektromagnetizm": { name: "Электромагнетизм", tests: [], averageScore: 0 }
    };

    // Group tests by module
    user.testResults.forEach(test => {
      if (test.module && modules[test.module]) {
        modules[test.module].tests.push(test);
      }
    });

    // Calculate averages
    Object.keys(modules).forEach(moduleKey => {
      const module = modules[moduleKey];
      if (module.tests.length > 0) {
        const scores = module.tests.map(t => (t.score / t.totalQuestions * 100));
        module.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        module.testCount = module.tests.length;
      } else {
        module.averageScore = 0;
        module.testCount = 0;
      }
    });

    res.json(modules);
  } catch (err) {
    console.error("Module progress fetch error:", err);
    res.status(500).json({ message: "Қате болды" });
  }
});