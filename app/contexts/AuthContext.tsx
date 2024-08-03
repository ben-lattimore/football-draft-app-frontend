'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

type User = {
    username: string;
    isAdmin: boolean;
};

type AuthContextType = {
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const loadUserFromStorage = useCallback(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        console.log('Stored token:', token);
        console.log('Stored user:', storedUser);

        if (token && storedUser && storedUser !== 'undefined') {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && typeof parsedUser === 'object' && 'username' in parsedUser) {
                    setIsAuthenticated(true);
                    setUser(parsedUser);
                    console.log('User loaded from storage:', parsedUser);
                } else {
                    throw new Error('Invalid user data structure');
                }
            } catch (error) {
                console.error('Failed to parse stored user data:', error);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                setIsAuthenticated(false);
                setUser(null);
            }
        } else {
            setIsAuthenticated(false);
            setUser(null);
            console.log('No valid user data found in storage');
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadUserFromStorage();
    }, [loadUserFromStorage]);

    const login = useCallback((token: string, user: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setIsAuthenticated(true);
        setUser(user);
        console.log('User logged in:', user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        console.log('User logged out');
    }, []);

    const value = {
        isAuthenticated,
        user,
        login,
        logout,
        isLoading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};