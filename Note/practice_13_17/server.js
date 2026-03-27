require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// ТВОИ КЛЮЧИ VAPID
const vapidKeys = {
    publicKey: 'BCZdj6WO7lK8zUeb-WusCjP3CQEFwiWgb2mZs8o_LHpPDPsfh3x_hgEOO22ACCkAZMeehfaoPeWLJ_8lJ64mRpg',
    privateKey: process.env.VAPID_PRIVATE_KEY // берется из скрытого файла
};

webpush.setVapidDetails('mailto:test@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

let subscriptions = [];
const reminders = new Map();

// Создание HTTPS сервера
const server = https.createServer({
    key: fs.readFileSync('localhost-key.pem'),
    cert: fs.readFileSync('localhost.pem')
}, app);

const io = socketIo(server);

io.on('connection', (socket) => {
    console.log('🔗 Клиент подключён:', socket.id);

    socket.on('newTask', (task) => {
        socket.broadcast.emit('taskAdded', task);
    });

    socket.on('newReminder', (reminder) => {
        const delay = reminder.reminderTime - Date.now();
        if (delay <= 0) return;

        const timeoutId = setTimeout(() => {
            const payload = JSON.stringify({ 
                title: '⏰ ВНИМАНИЕ!', 
                body: reminder.text, 
                reminderId: reminder.id 
            });

            // Безопасная отправка (с удалением битых подписок)
            subscriptions.forEach((sub, index) => {
                webpush.sendNotification(sub, payload)
                    .then(() => console.log('✅ Push отправлен успешно'))
                    .catch(e => {
                        if (e.statusCode === 410 || e.statusCode === 404) {
                            console.log('🗑 Удаление просроченной подписки');
                            subscriptions.splice(index, 1);
                        }
                    });
            });
            reminders.delete(reminder.id);
        }, delay);

        reminders.set(reminder.id, { timeoutId, text: reminder.text });
    });
});

app.post('/subscribe', (req, res) => {
    subscriptions.push(req.body);
    res.status(201).json({ message: 'OK' });
});

app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);
    if (!reminders.has(reminderId)) return res.status(404).send();

    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);
    
    const newTimeoutId = setTimeout(() => {
        const payload = JSON.stringify({ title: '💤 ОТЛОЖЕНО', body: `Повтор: ${reminder.text}`, reminderId });
        subscriptions.forEach(sub => webpush.sendNotification(sub, payload).catch(() => {}));
        reminders.delete(reminderId);
    }, 10000); // 10 секунд для теста

    reminders.set(reminderId, { timeoutId: newTimeoutId, text: reminder.text });
    res.json({ message: 'OK' });
});

server.listen(3000, () => {
    console.log('✅ СЕРВЕР: https://localhost:3000');
});