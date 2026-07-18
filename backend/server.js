const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// 1. МІНДЕТТІ ТҮРДЕ: Middleware баптаулары
app.use(cors());
app.use(express.json()); // Фронтендтен келетін JSON-ды оқу үшін

// 2. База қосылымын реттеу (Күту уақытын шектеу)
// 2. База қосылымын реттеу (Қауіпсіз нұсқа)
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://kuatkyzyaizada1:<aizada2604>@cluster0.qaicgp2.mongodb.net/";

mongoose.connect(DB_URI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log("🚀 MongoDB базасына сәтті қосылдық!"))
.catch(err => console.error("❌ MongoDB қосылу қатесі:", err));

// 3. Пайдаланушының MongoDB құрылымы (Schema & Model)
// Егер бұл модель сізде басқа файлда жазылған болса, бұл бөлікті қалдырып кетсеңіз де болады
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    tests: [{
        testTitle: String,
        title: String, // Кейбір жерде 'title' деп қолданылса
        score: Number,
        totalQuestions: Number,
        date: { type: Date, default: Date.now }
    }]
});

// Егер модель бұрын жарияланған болса, соны алады, әйтпесе жаңадан құрады
const User = mongoose.models.User || mongoose.model('User', userSchema);

// 4. Логин маршруты
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Электрондық пошта мен құпия сөзді тексеру
        if (!email || !password) {
            return res.status(400).json({ message: "⚠️ Email және құпия сөзді толтырыңыз!" });
        }

        // Базадан пайдаланушыны іздеу
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(400).json({ message: "❌ Мұндай пайдаланушы табылмады!" });
        }

        // Құпия сөзді тексеру
        if (user.password !== password) {
            return res.status(400).json({ message: "❌ Құпия сөз қате!" });
        }

        // Сәтті кірген жағдайда фронтендке жауап қайтару
        res.status(200).json({
            message: "✅ Сәтті кірдіңіз!",
            user: {
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin || user.email === "kuatkyzyaizada1@gmail.com" // Админ екенін анықтау
            }
        });

    } catch (error) {
        console.error("Жүйеге кіру кезіндегі ішкі қате:", error);
        res.status(500).json({ message: "Серверде ішкі қате орын алды: " + error.message });
    }
});

// 5. Админге арналған статистика мен нәтижелерді алу маршруты
app.get('/admin/all-results', async (req, res) => {
    try {
        const ADMIN_EMAIL = "kuatkyzyaizada1@gmail.com";
        
        // Базадан барлық пайдаланушыларды жүктеп алу
        const users = await User.find({});

        // Админнен басқа тек оқушыларды сүзіп алу
        const students = users.filter(u => u.email !== ADMIN_EMAIL);

        let totalTests = 0;
        let totalScore = 0;
        let totalQuestions = 0;
        let resultsList = [];

        // Әр оқушының тесттерін жинақтау
        students.forEach(user => {
            if (user.tests && user.tests.length > 0) {
                totalTests += user.tests.length;
                user.tests.forEach(test => {
                    // Қай нұсқада жазылса да атауын дұрыс таңдау
                    const currentTitle = test.testTitle || test.title || "Физика тесті";
                    const currentScore = test.score || 0;
                    const currentTotal = test.totalQuestions || 10;

                    totalScore += currentScore;
                    totalQuestions += currentTotal;

                    resultsList.push({
                        name: user.name || "Аты белгісіз",
                        email: user.email,
                        testTitle: currentTitle,
                        score: currentScore,
                        totalQuestions: currentTotal,
                        date: test.date || "Белгісіз"
                    });
                });
            }
        });

        // Нәтижелерді күні бойынша сұрыптау (Ең жаңасы басында тұрады)
        resultsList.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Орташа үлгерім пайызын есептеу
        const avgScorePercent = totalQuestions > 0 
            ? (totalScore / totalQuestions * 100).toFixed(1) + '%' 
            : '0%';

        // Дайын статистиканы админге жөнелту
        res.status(200).json({
            stats: {
                totalStudents: students.length,
                totalTests: totalTests,
                avgScore: avgScorePercent
            },
            results: resultsList
        });

    } catch (error) {
        console.error("Админ деректерін жинау сәтінде қате кетті:", error);
        res.status(500).json({ message: "Серверде деректерді өңдеу қатесі", error: error.message });
    }
});

// 6. Серверді іске қосу
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер ${PORT} портында сәтті қосылды!`);
});