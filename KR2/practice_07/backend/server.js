const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;
const ACCESS_SECRET = "access_secret_123";
const REFRESH_SECRET = "refresh_secret_456";

app.use(cors());
app.use(express.json());

// --- БАЗА ДАННЫХ (10 товаров) ---
let products = [
    { id: nanoid(6), name: "Sony WH-1000XM5", category: "Наушники", description: "Топ шумоподавление", price: 34990, stock: 15, rating: 4.9, photo: "https://4pda.to/s/as6ywyGsRMTZXodgMkXs2SdF4Uae.jpg" },
    { id: nanoid(6), name: "AirPods Max", category: "Наушники", description: "Премиум звук от Apple", price: 54990, stock: 8, rating: 4.7, photo: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=600" },
    { id: nanoid(6), name: "Marshall Major IV", category: "Наушники", description: "Классический рок-дизайн", price: 14500, stock: 30, rating: 4.8, photo: "https://avatars.mds.yandex.net/get-mpic/5222546/2a0000018e0ee2fcffeaf7f8945e321ccf6c/orig" },
    { id: nanoid(6), name: "JBL Tune 510BT", category: "Бюджет", description: "Хороший бас за свои деньги", price: 4500, stock: 50, rating: 4.5, photo: "https://avatars.mds.yandex.net/get-mpic/10495676/2a0000019620168c47c45e66bc1224d1aa8a/orig" },
    { id: nanoid(6), name: "Sennheiser HD 450", category: "Студийные", description: "Чистый и ровный звук", price: 12990, stock: 12, rating: 4.6, photo: "https://unwiredforsound.com/wp-content/uploads/2020/11/Sennheiser-HD-450-1.jpg" },
    { id: nanoid(6), name: "Bose QC Ultra", category: "Комфорт", description: "Самые удобные", price: 28500, stock: 20, rating: 4.8, photo: "https://static.insales-cdn.com/images/products/1/4953/2441687897/51aLZtpNgkL._AC_SL1500_.jpg" },
    { id: nanoid(6), name: "Logitech G Pro X2", category: "Гейминг", description: "Для киберспорта", price: 11990, stock: 25, rating: 4.7, photo: "https://ir-3.ozone.ru/s3/multimedia-1-l/w1200/7112188137.jpg" },
    { id: nanoid(6), name: "HYPERX Cloud Alpha", category: "Гейминг", description: "Легендарная надежность", price: 9990, stock: 40, rating: 4.9, photo: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/6684df120400509.60b0bb8061dbc.png" },
    { id: nanoid(6), name: "Samsung Buds 3 Pro", category: "TWS", description: "Компактные и мощные", price: 13000, stock: 60, rating: 4.4, photo: "https://avatars.mds.yandex.net/get-mpic/5219030/2a00000194960c255af8f20c60ef431a3a72/optimize" },
    { id: nanoid(6), name: "Pixel Buds Pro", category: "TWS", description: "Умный звук от Google", price: 15990, stock: 10, rating: 4.5, photo: "https://www.headphonecheck.com/wp-content/uploads/Google-Pixel-Buds-Pro-4.jpg" }
];

let users = []; 
let refreshTokens = new Set();

// Middlewares
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });
    try {
        req.user = jwt.verify(authHeader.split(' ')[1], ACCESS_SECRET);
        next();
    } catch (e) { res.status(401).json({ error: "Invalid token" }); }
}

function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: insufficient permissions" });
        }
        next();
    };
}

// Swagger
const swaggerOptions = {
    definition: { 
        openapi: '3.0.0', 
        info: { title: 'Headphones Store API', version: '2.0.0', description: 'API с RBAC, JWT и Refresh токенами' },
        servers: [{ url: "http://localhost:3000" }],
        components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } }
    },
    apis: ['./server.js'],
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));
app.get('/', (req, res) => res.redirect('/api-docs'));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация нового пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email, example: "admin@audiostore.ru" }
 *               password: { type: string, format: password, example: "qwerty123" }
 *               first_name: { type: string, example: "Nikolay" }
 *               role: { type: string, enum: [user, seller, admin], example: "admin" }
 *     responses:
 *       201:
 *         description: Пользователь создан
 */
app.post("/api/auth/register", async (req, res) => {
    const { email, password, first_name, role } = req.body;
    
    // Валидация Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Некорректный email" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { id: nanoid(6), email, first_name, passwordHash, role: role || 'user' };
    users.push(newUser);
    res.status(201).json({ email, role: newUser.role });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход (Получение JWT)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "admin@audiostore.ru" }
 *               password: { type: string, example: "qwerty123" }
 *     responses:
 *       200:
 *         description: Успешный вход
 */
app.post("/api/auth/login", async (req, res) => {
    const user = users.find(u => u.email === req.body.email);
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
        return res.status(401).json({ error: "Ошибка входа" });
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
    refreshTokens.add(refreshToken);
    res.json({ accessToken, refreshToken });
});/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Обновление пары токенов
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Токены обновлены
 */
app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken: rt } = req.body;
    if (!rt || !refreshTokens.has(rt)) return res.status(401).send();
    try {
        const payload = jwt.verify(rt, REFRESH_SECRET);
        refreshTokens.delete(rt);
        const at = jwt.sign({ sub: payload.sub, email: payload.email, role: payload.role }, ACCESS_SECRET, { expiresIn: '15m' });
        const nrt = jwt.sign({ sub: payload.sub, email: payload.email, role: payload.role }, REFRESH_SECRET, { expiresIn: '7d' });
        refreshTokens.add(nrt);
        res.json({ accessToken: at, refreshToken: nrt });
    } catch(e) { res.status(401).send(); }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Текущий профиль (Защищено)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Информация о пользователе
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.sub);
    res.json(user);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Список всех товаров
 *     responses:
 *       200:
 *         description: Список получен
 */
app.get('/api/products', (req, res) => res.json(products));

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Получить один товар по ID
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200:
 *         description: Товар найден
 */
app.get('/api/products/:id', (req, res) => {
    const p = products.find(p => p.id === req.params.id);
    p ? res.json(p) : res.status(404).send();
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Создать товар (Seller/Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const newP = { id: nanoid(6), ...req.body };
    products.push(newP);
    res.status(201).json(newP);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Обновить товар (Seller/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200:
 *         description: Обновлено
 */
app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).send();
    products[idx] = { ...products[idx], ...req.body };
    res.json(products[idx]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Удалить товар (Admin Only)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       204:
 *         description: Удалено
 */
app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.status(204).send();
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Список всех пользователей (Admin Only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Список пользователей
 */
app.get("/api/users", authMiddleware, roleMiddleware(['admin']), (req, res) => res.json(users));

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
    console.log(`Swagger available at http://localhost:${port}/api-docs`);
});