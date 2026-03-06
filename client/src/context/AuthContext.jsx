import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const t = localStorage.getItem('rc_token');
            const u = localStorage.getItem('rc_user');
            if (t && u) { setToken(t); setUser(JSON.parse(u)); }
        } catch {
            // Corrupted localStorage — clear and start fresh
            localStorage.removeItem('rc_token');
            localStorage.removeItem('rc_user');
        }
        setLoading(false);
    }, []);

    const login = (token, user) => {
        localStorage.setItem('rc_token', token);
        localStorage.setItem('rc_user', JSON.stringify(user));
        setToken(token);
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem('rc_token');
        localStorage.removeItem('rc_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
