import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import api from './api/axios';
import './App.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            window.location.href = '/';
        } catch (err) { alert("Ошибка входа!"); }
    };
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>🎧 AudioStore</h2>
                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Пароль" onChange={e => setPassword(e.target.value)} required />
                    <button type="submit">Войти</button>
                </form>
                <p>Нет аккаунта? <Link to="/register">Регистрация</Link></p>
            </div>
        </div>
    );
};

const Register = () => {
    const [form, setForm] = useState({ email: '', password: '', first_name: '', role: 'user' });
    const handleReg = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', form);
            alert("Успешно!");
            window.location.href = '/login';
        } catch (err) { alert("Ошибка!"); }
    };
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Регистрация</h2>
                <form onSubmit={handleReg}>
                    <input type="text" placeholder="Имя" onChange={e => setForm({...form, first_name: e.target.value})} required />
                    <input type="email" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} required />
                    <input type="password" placeholder="Пароль" onChange={e => setForm({...form, password: e.target.value})} required />
                    <select className="role-select" onChange={e => setForm({...form, role: e.target.value})}>
                        <option value="user">Покупатель</option>
                        <option value="seller">Продавец</option>
                        <option value="admin">Админ</option>
                    </select>
                    <button type="submit">Создать</button>
                </form>
            </div>
        </div>
    );
};

const Products = () => {
    const [items, setItems] = useState([]);
    const [user, setUser] = useState(null);
    
    // Состояния для добавления товара
    const [isAdding, setIsAdding] = useState(false);
    const [newProd, setNewProd] = useState({ title: '', price: '', category: 'Наушники', description: '', photo: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resMe = await api.get('/auth/me');
                setUser(resMe.data);
                const resProd = await api.get('/products');
                setItems(resProd.data);
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, []);

    const logout = () => { localStorage.clear(); window.location.href = '/login'; };

    // ФУНКЦИЯ ДОБАВЛЕНИЯ ТОВАРА
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            // Отправляем на бэкенд (который защищен JWT и RoleMiddleware)
            const { data } = await api.post('/products', newProd);
            setItems([...items, data]); // Обновляем список на лету
            setIsAdding(false); // Закрываем форму
            setNewProd({ title: '', price: '', category: 'Наушники', description: '', photo: '' }); // Чистим форму
        } catch (err) {
            alert("Ошибка при добавлении! Проверьте права доступа.");
        }
    };

    const deleteProd = async (id) => {
        if (!window.confirm("Удалить?")) return;
        try {
            await api.delete(`/products/${id}`);
            setItems(items.filter(p => p.id !== id));
        } catch(e) { alert("Нет прав (нужен Admin)!"); }
    };

    return (
        <div className="store-page">
            <header className="navbar">
                <div className="brand">AUDIO<span>STORE</span></div>
                <div className="nav-right">
                    <span className="user-badge">{user?.first_name} ({user?.role})</span>
                    <button onClick={logout} className="logout-btn">Выйти</button>
                </div>
            </header>

            <main className="container">
                <div className="section-header">
                    <h1>Premium Collection</h1>
                    {/* Кнопка открытия формы (только для Seller и Admin) */}
                    {(user?.role === 'seller' || user?.role === 'admin') && (
                        <button className="btn-add" onClick={() => setIsAdding(true)}>+ Добавить товар</button>
                    )}
                </div>

                {/* ФОРМА ДОБАВЛЕНИЯ (появляется при клике) */}
                {isAdding && (
                    <div className="auth-container" style={{position:'fixed', top:0, left:0, width:'100%', zIndex:2000, background:'rgba(0,0,0,0.8)'}}>
                        <div className="auth-card">
                            <h3>Новый товар</h3>
                            <form onSubmit={handleAddProduct}>
                                <input type="text" placeholder="Название" value={newProd.title} onChange={e => setNewProd({...newProd, title: e.target.value})} required />
                                <input type="number" placeholder="Цена" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} required />
                                <input type="text" placeholder="Ссылка на фото" value={newProd.photo} onChange={e => setNewProd({...newProd, photo: e.target.value})} required />
                                <input type="text" placeholder="Описание" value={newProd.description} onChange={e => setNewProd({...newProd, description: e.target.value})} />
                                <div style={{display:'flex', gap:'10px'}}>
                                    <button type="submit">Сохранить</button>
                                    <button type="button" onClick={() => setIsAdding(false)} style={{background:'#334155'}}>Отмена</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="products-grid">
                    {items.map(p => (
                        <div key={p.id} className="product-card">
                            <div className="card-image">
                                <img src={p.photo || 'https://via.placeholder.com/300'} alt={p.name} />
                                <div className="category-tag">{p.category}</div>
                            </div>
                            <div className="card-info">
                                <h3>{p.name || p.title}</h3>
                                <p className="description">{p.description}</p>
                                <div className="card-footer">
                                    <span className="price">{(p.price || 0).toLocaleString()} ₽</span>
                                    {user?.role === 'admin' && (
                                        <button className="btn-delete" onClick={() => deleteProd(p.id)}>🗑️</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

function App() {
    const isAuth = !!localStorage.getItem('accessToken');
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={!isAuth ? <Login /> : <Navigate to="/" />} />
                <Route path="/register" element={!isAuth ? <Register /> : <Navigate to="/" />} />
                <Route path="/" element={isAuth ? <Products /> : <Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}
export default App;