const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Егер bcrypt немесе jwt қолдансаңыз, оларды да қалдырыңыз

const app = express();

// 1. МІНДЕТТІ ТҮРДЕ: Middleware баптаулары
app.use(cors());
app.use(express.json()); // Фронтендтен келетін JSON-ды оқу үшін

// 2. База қосылымын реттеу (Күту уақытын шектеу)
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000 // База жауап бермесе, 10 секунд күтпей, 5 секундта бірден қате лақтырады
})
.then(() => console.log("🚀 MongoDB базасына сәтті қосылдық!"))
.catch(err => console.error("❌ MongoDB қосылу қатесі:", err));

// 3. Логин маршруты
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Электрондық пошта мен құпия сөзді тексеру
        if (!email || !password) {
            return res.status(400).json({ message: "⚠️ Email және құпия сөзді толтырыңыз!" });
        }

        // Базадан пайдаланушыны іздеу (Мысалы, User моделі арқылы)
        // ЕСКЕРТУ: Өзіңіздің базалық Модель атауын жазыңыз (User немесе аты басқа болса)
        const user = await mongoose.model('User').findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(400).json({ message: "❌ Мұндай пайдаланушы табылмады!" });
        }

        // Құпия сөзді тексеру (Егер жай мәтінмен сақтасаңыз - былай, bcrypt қолдансаңыз - compare қолданыңыз)
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
})