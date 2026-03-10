/**
 * Centralized API service layer.
 * All API calls go through these service functions — 
 * keeps component code clean and business logic centralized.
 */
import api from './axios';

// ─── Auth Services ─────────────────────────────────────────
export const authService = {
    /**
     * Login with email + password → returns access_token
     * Uses form-encoded body as required by OAuth2PasswordRequestForm
     */
    login: (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        return api.post('/login/access-token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
    },

    /** Get current logged-in user profile */
    getMe: () => api.get('/users/me'),

    /** Register a new user */
    register: (email, password, fullName) =>
        api.post('/users/', { email, password, full_name: fullName }),
};

// ─── Image Services ────────────────────────────────────────
export const videoService = {
    /** List all uploaded images for current user */
    list: () => api.get('/video/list'),

    /** Get a single image by ID */
    getById: (id) => api.get(`/video/${id}`),

    /**
     * Upload an image file for detection processing.
     * @param {File} file - image file to upload
     * @param {Function} onProgress - optional progress callback (0-100)
     */
    upload: (file, onProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/video/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(pct);
                }
            },
        });
    },

    /** Delete a video by ID */
    delete: (id) => api.delete(`/video/${id}`),
};

// ─── Detection Services ───────────────────────────────────
export const detectionService = {
    /** Get all detections for a specific video */
    getByVideoId: (videoId) => api.get(`/detections/${videoId}`),

    /** Get overall detection statistics */
    getStats: () => api.get('/detections/stats'),
};

// ─── Alert Services ────────────────────────────────────────
export const alertService = {
    /** List active alerts */
    list: () => api.get('/alerts/'),

    /** Acknowledge / dismiss an alert */
    acknowledge: (alertId) => api.patch(`/alerts/${alertId}/acknowledge`),
};
