import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Health check endpoint
export const checkHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

// Placeholder for future API methods (Day 2+)
export default api;
