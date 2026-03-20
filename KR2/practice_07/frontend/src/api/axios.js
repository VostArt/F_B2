import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

// ПЕРЕХВАТЧИК ЗАПРОСОВ: автоматически добавляет Access токен в заголовки
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ПЕРЕХВАТЧИК ОТВЕТОВ: ловит 401 ошибку и пробует обновить токен
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Если получили 401 и мы еще не пробовали обновлять токен (_retry)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                
                // Делаем запрос на обновление
                const { data } = await axios.post('http://localhost:3000/api/auth/refresh', { refreshToken });
                
                // Сохраняем новые токены
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                
                // Повторяем изначальный запрос с новым токеном
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Если refresh токен тоже сдох — выходим из аккаунта
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;