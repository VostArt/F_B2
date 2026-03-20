const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// Секреты подписи и время жизни (ДОБАВЛЕНО ДЛЯ ПРАКТИКИ 9)
const JWT_SECRET = "super_secret_jwt_key_123";
const REFRESH_SECRET = "super_secret_refresh_key_456"; 
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

app.use(cors());
app.use(express.json());

// База данных
let users = [];
let products =[
    { id: nanoid(6), title: "Наушники Sony", price: 35000 },
];

// Хранилище refresh-токенов (ДОБАВЛЕНО ДЛЯ ПРАКТИКИ 9)
const refreshTokens = new Set();

// Функции генерации токенов (ДОБАВЛЕНО ДЛЯ ПРАКТИКИ 9)
function generateAccessToken(user) {
    return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshToken(user) {
    return jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

// Middleware для JWT
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Токен не предоставлен" });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ error: "Невалидный токен" });
    }
}

// Настройки Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'Auth & JWT API', version: '1.0.0' },
        servers:[{ url: `http://localhost:${port}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        },
    },
    apis: ['./server.js'],
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));

// --- Маршруты ---

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: ["Auth"]
 *     summary: "Регистрация"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "user@mail.ru" }
 *               first_name: { type: string, example: "Ivan" }
 *               last_name: { type: string, example: "Ivanov" }
 *               password: { type: string, example: "12345" }
 *     responses:
 *       201:
 *         description: "OK"
 */
app.post("/api/auth/register", async (req, res) => {
    const { email, first_name, last_name, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { id: nanoid(6), email, first_name, last_name, passwordHash };
    users.push(newUser);
    res.status(201).json({ id: newUser.id, email: newUser.email });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: ["Auth"]
 *     summary: "Вход"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "user@mail.ru" }
 *               password: { type: string, example: "12345" }
 *     responses:
 *       200:
 *         description: "Возвращает токен"
 */
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
    }
    
    // ИЗМЕНЕНО: Теперь генерируем два токена
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    refreshTokens.add(refreshToken); // Сохраняем refresh-токен

    res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: ["Auth"]
 *     summary: "Обновление пары токенов"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: "Новая пара токенов"
 */
// НОВЫЙ МАРШРУТ ДЛЯ ПРАКТИКИ 9
app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken обязателен" });
    }

    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: "Невалидный refresh токен" });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = users.find(u => u.id === payload.sub);
        
        if (!user) return res.status(401).json({ error: "Пользователь не найден" });

        // Ротация: удаляем старый, создаем новый
        refreshTokens.delete(refreshToken);

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        refreshTokens.add(newRefreshToken);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        return res.status(401).json({ error: "Истек или невалиден refresh токен" });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: ["Auth"]
 *     summary: "Профиль (Защищено)"
 *     security:
 *       - bearerAuth:[]
 *     responses:
 *       200:
 *         description: "Данные пользователя"
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.sub);
    res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name });
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: ["Products"]
 *     summary: "Все товары"
 *     responses:
 *       200:
 *         description: "Список товаров"
 */
app.get('/api/products', (req, res) => res.json(products));

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: ["Products"]
 *     summary: "Создать товар"
 *     responses:
 *       201:
 *         description: "OK"
 */
app.post('/api/products', (req, res) => {
    const newProduct = { id: nanoid(6), ...req.body };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: ["Products"]
 *     summary: "Товар по ID (Защищено)"
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth:[]
 *     responses:
 *       200:
 *         description: "OK"
 */
app.get('/api/products/:id', authMiddleware, (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).send();
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: ["Products"]
 *     summary: "Обновить товар (Защищено)"
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth:[]
 *     responses:
 *       200:
 *         description: "OK"
 */
app.put('/api/products/:id', authMiddleware, (req, res) => {
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).send();
    products[idx] = { id: req.params.id, ...req.body };
    res.json(products[idx]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: ["Products"]
 *     summary: "Удалить товар (Защищено)"
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth:[]
 *     responses:
 *       204:
 *         description: "OK"
 */
app.delete('/api/products/:id', authMiddleware, (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.status(204).send();
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
    console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});