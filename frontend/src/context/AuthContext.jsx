import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check session on mount
        const storedUser = sessionStorage.getItem('currentUsername');
        const storedToken = sessionStorage.getItem('authToken');
        if (storedUser && storedToken) {
            setUser({ username: storedUser });
            setToken(storedToken);
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || 'Login failed');

            sessionStorage.setItem('currentUsername', data.username);
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('isLoggedIn', 'true');

            setUser({ username: data.username });
            setToken(data.token);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        sessionStorage.clear();
        setUser(null);
        setToken(null);
    };

    const register = async (username, password, confirmPassword) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, confirm_password: confirmPassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Registration failed');
            if (!response.ok) throw new Error(data.detail || 'Registration failed');
            return { success: true, recovery_key: data.recovery_key };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const getRecoveryKey = async (username, token) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_URL}/api/auth/recovery-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, token }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to generate key');
            return { success: true, recovery_key: data.recovery_key };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const resetPassword = async (username, recoveryKey, newPassword, confirmPassword) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    recovery_key: recoveryKey,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Reset failed');
            return { success: true, message: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, getRecoveryKey, resetPassword, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
