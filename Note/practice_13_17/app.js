const socket = io('https://localhost:3000');
const contentDiv = document.getElementById('app-content');

// ТВОЙ PUBLIC KEY
const VAPID_PUBLIC_KEY = 'BCZdj6WO7lK8zUeb-WusCjP3CQEFwiWgb2mZs8o_LHpPDPsfh3x_hgEOO22ACCkAZMeehfaoPeWLJ_8lJ64mRpg';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

async function loadContent(page) {
    try {
        const res = await fetch(`/content/${page}.html`);
        contentDiv.innerHTML = await res.text();
        if (page === 'home') initNotes();
    } catch(e) { contentDiv.innerHTML = '<h3 style="color:red; text-align:center;">ОФЛАЙН РЕЖИМ</h3>'; }
}

document.getElementById('home-btn').onclick = () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('home-btn').classList.add('active');
    loadContent('home');
};
document.getElementById('about-btn').onclick = () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById('about-btn').classList.add('active');
    loadContent('about');
};

function initNotes() {
    const list = document.getElementById('notes-list');
    function renderNotes() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        list.innerHTML = notes.map(n => `<li>${n.text} ${n.reminder ? `<br><small style="color:#ff003c;">⏰ ${new Date(n.reminder).toLocaleString()}</small>` : ''}</li>`).join('');
    }

    document.getElementById('note-form').onsubmit = (e) => {
        e.preventDefault();
        const text = document.getElementById('note-input').value;
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push({ id: Date.now(), text });
        localStorage.setItem('notes', JSON.stringify(notes));
        socket.emit('newTask', { text });
        renderNotes();
        document.getElementById('note-input').value = '';
    };

    document.getElementById('reminder-form').onsubmit = (e) => {
        e.preventDefault();
        const text = document.getElementById('reminder-text').value;
        const time = new Date(document.getElementById('reminder-time').value).getTime();
        if(time <= Date.now()) return alert("Выберите будущее время!");
        
        const id = Date.now();
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push({ id, text, reminder: time });
        localStorage.setItem('notes', JSON.stringify(notes));
        socket.emit('newReminder', { id, text, reminderTime: time });
        renderNotes();
        document.getElementById('reminder-text').value = '';
    };
    renderNotes();
}

socket.on('taskAdded', (task) => alert(`[WebSocket] Новая задача: "${task.text}"`));

// РЕГИСТРАЦИЯ PUSH ПО КНОПКЕ
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        document.getElementById('enable-push').onclick = async () => {
            try {
                // Удаляем старую подписку
                const oldSub = await reg.pushManager.getSubscription();
                if (oldSub) await oldSub.unsubscribe();

                // Создаем новую
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                await fetch('https://localhost:3000/subscribe', { 
                    method: 'POST', 
                    headers: {'Content-Type':'application/json'}, 
                    body: JSON.stringify(sub) 
                });
                alert('Уведомления ВКЛЮЧЕНЫ! 🟢');
            } catch (e) {
                console.error(e);
                alert('Ошибка! Разрешите уведомления в браузере.');
            }
        };
    });
}
loadContent('home');