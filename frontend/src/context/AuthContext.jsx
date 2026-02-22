import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await api.get('/users/me');
                    setUser(response.data);
                } catch (error) {
                    console.error("Auth check failed", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/login/access-token', formData);
        const { access_token } = response.data;

        localStorage.setItem('token', access_token);
        // Fetch user details immediately
        const userRes = await api.get('/users/me');
        setUser(userRes.data);
        return true;
    };

    const register = async (email, password, fullName) => {
        try {
            await api.post('/users/', {
                email,
                password,
                full_name: fullName
            });
            // Auto login after register
            await login(email, password);
            return true;
        } catch (error) {
            console.error("Registration error", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
