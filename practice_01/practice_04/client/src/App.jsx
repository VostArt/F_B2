import { useEffect, useState } from "react";
import { api } from "./api";
import "./App.scss";

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Состояние для модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', category: '', description: '', price: '', stock: '', rating: '', photo: '' 
  });
  const [editId, setEditId] = useState(null);

  // Загрузка товаров с сервера
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Удалить товар?")) {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setFormData(product);
      setEditId(product.id);
    } else {
      setFormData({ name: '', category: '', description: '', price: '', stock: '', rating: '', photo: '' });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      const updated = await api.updateProduct(editId, formData);
      setProducts(products.map(p => p.id === editId ? updated : p));
    } else {
      const created = await api.createProduct(formData);
      setProducts([...products, created]);
    }
    setIsModalOpen(false);
  };

  if (loading) return <div className="loading">Загрузка сервера...</div>;

  return (
    <div className="page">
      <header className="header">
        <h1>🎧 AudioStore Admin</h1>
        <button className="btn btn-add" onClick={() => handleOpenModal()}>+ Добавить товар</button>
      </header>

      <div className="catalog">
        {products.map(p => (
          <div key={p.id} className="card">
            <img src={p.photo} alt={p.name} className="card__img" />
            <div className="card__body">
              <span className="card__category">{p.category}</span>
              <h2 className="card__title">{p.name}</h2>
              <p className="card__desc">{p.description}</p>
              
              <div className="card__stats">
                <span>⭐ {p.rating}</span>
                <span>📦 В наличии: {p.stock} шт.</span>
              </div>
              
              <div className="card__footer">
                <span className="card__price">{p.price} ₽</span>
                <div className="card__actions">
                  <button className="btn btn-edit" onClick={() => handleOpenModal(p)}>✎</button>
                  <button className="btn btn-delete" onClick={() => handleDelete(p.id)}>✖</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleSubmit}>
            <h2>{editId ? "Редактировать товар" : "Новый товар"}</h2>
            <input required placeholder="Название" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input required placeholder="Категория" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
            <input required placeholder="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <input required type="number" placeholder="Цена" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
            <input required type="number" placeholder="Кол-во на складе" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
            <input required type="number" step="0.1" placeholder="Рейтинг" value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} />
            <input required placeholder="Ссылка на фото (URL)" value={formData.photo} onChange={e => setFormData({...formData, photo: e.target.value})} />
            
            <div className="modal__btns">
              <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button type="submit" className="btn btn-add">Сохранить</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}