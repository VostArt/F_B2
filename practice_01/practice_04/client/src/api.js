import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:3000/api"
});

export const api = {
    getProducts: async () => (await apiClient.get("/products")).data,
    createProduct: async (product) => (await apiClient.post("/products", product)).data,
    updateProduct: async (id, product) => (await apiClient.patch(`/products/${id}`, product)).data,
    deleteProduct: async (id) => await apiClient.delete(`/products/${id}`)
};