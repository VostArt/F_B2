const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

// 1. Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

// Разрешаем запросы с React (порта 5173)
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"]
}));

app.use(express.json());

// --- НАСТРОЙКИ SWAGGER ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AudioStore API',
            version: '1.0.0',
            description: 'API интернет-магазина наушников (Fullstack Practice)',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Local Development Server',
            },
        ],
    },
    apis: ['./server.js'], // Ищем аннотации в этом файле
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Маршрут для документации
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- БАЗА ДАННЫХ (Твои новые товары) ---
let products = [
    { id: nanoid(6), name: "Sony WH-1000XM5", category: "Наушники", description: "Топ шумоподавление", price: 34990, stock: 15, rating: 4.9, photo: "https://4pda.to/s/as6ywyGsRMTZXodgMkXs2SdF4Uae.jpg" },
    { id: nanoid(6), name: "AirPods Max", category: "Наушники", description: "Премиум звук от Apple", price: 54990, stock: 8, rating: 4.7, photo: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=600" },
    { id: nanoid(6), name: "Marshall Major IV", category: "Наушники", description: "Классический рок-дизайн", price: 14500, stock: 30, rating: 4.8, photo: "https://avatars.mds.yandex.net/get-mpic/5222546/2a0000018e0ee2fcffeaf7f8945e321ccf6c/orig" },
    { id: nanoid(6), name: "JBL Tune 510BT", category: "Бюджет", description: "Хороший бас за свои деньги", price: 4500, stock: 50, rating: 4.5, photo: "https://avatars.mds.yandex.net/get-mpic/10495676/2a0000019620168c47c45e66bc1224d1aa8a/orig" },
    { id: nanoid(6), name: "Sennheiser HD 450", category: "Студийные", description: "Чистый и ровный звук", price: 12990, stock: 12, rating: 4.6, photo: "https://unwiredforsound.com/wp-content/uploads/2020/11/Sennheiser-HD-450-1.jpg" },
    { id: nanoid(6), name: "Bose QuietComfort Ultra Headphones (2nd Gen)", category: "Комфорт", description: "Самые удобные", price: 28500, stock: 20, rating: 4.8, photo: "https://static.insales-cdn.com/images/products/1/4953/2441687897/51aLZtpNgkL._AC_SL1500_.jpg" },
    { id: nanoid(6), name: "Logitech G Pro X2", category: "Гейминг", description: "Для киберспорта", price: 11990, stock: 25, rating: 4.7, photo: "https://ir-3.ozone.ru/s3/multimedia-1-l/w1200/7112188137.jpg" },
    { id: nanoid(6), name: "HYPERX cloud Alpha", category: "Гейминг", description: "Легендарная надежность", price: 9990, stock: 40, rating: 4.9, photo: "https://mir-s3-cdn-cf.behance.net/project_modules/1400/6684df120400509.60b0bb8061dbc.png" },
    { id: nanoid(6), name: "Samsung Galaxy Buds 3 Pro", category: "TWS", description: "Компактные и мощные", price: 13000, stock: 60, rating: 4.4, photo: "https://avatars.mds.yandex.net/get-mpic/5219030/2a00000194960c255af8f20c60ef431a3a72/optimize" },
    { id: nanoid(6), name: "Pixel Buds Pro", category: "TWS", description: "Умный звук от Google", price: 15990, stock: 10, rating: 4.5, photo: "https://www.headphonecheck.com/wp-content/uploads/Google-Pixel-Buds-Pro-4.jpg" }
];

// --- JSDOC ОПИСАНИЕ СХЕМЫ ---

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID (генерируется автоматически)
 *         name:
 *           type: string
 *           description: Название товара
 *         category:
 *           type: string
 *           description: Категория товара
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена в рублях
 *         stock:
 *           type: number
 *           description: Количество на складе
 *         rating:
 *           type: number
 *           description: Рейтинг товара (0-5)
 *         photo:
 *           type: string
 *           description: URL изображения
 *       example:
 *         id: "Xy12zA"
 *         name: "Sony WH-1000XM5"
 *         category: "Наушники"
 *         description: "Лучшее шумоподавление"
 *         price: 34990
 *         stock: 15
 *         rating: 4.9
 *         photo: "https://4pda.to/s/as6ywyGsRMTZXodgMkXs2SdF4Uae.jpg"
 */

// --- МАРШРУТЫ API ---

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => res.json(products));

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить один товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Не найдено" });
    res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
app.post('/api/products', (req, res) => {
    const newProduct = { id: nanoid(6), ...req.body };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить данные товара
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       404:
 *         description: Товар не найден
 */
app.patch('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Не найдено" });
    
    Object.assign(product, req.body);
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар удален
 */
app.delete('/api/products/:id', (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.status(204).send();
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
    console.log(`Документация Swagger: http://localhost:${port}/api-docs`);
});