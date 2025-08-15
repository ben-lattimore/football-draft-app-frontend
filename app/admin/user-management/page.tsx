'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';

type User = {
    _id: string;
    username: string;
    email?: string;
    is_admin?: boolean;
    isAdmin?: boolean;
    budget_remaining?: number;
    initialBudget?: number;
    wonPlayers: any[];
    created_at?: string;
    updated_at?: string;
};

export default function UserManagementPage() {
    const { isAuthenticated, user, isLoading } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
    
    // Add new user form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({ 
        username: '', 
        password: '', 
        email: '', 
        isAdmin: false 
    });
    
    // Edit user state
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<User> & { password?: string }>({});

    // Helper functions
    const getUserBudget = (user: User) => {
        if (user.budget_remaining !== undefined) {
            return (user.budget_remaining / 1000000).toFixed(1);
        } else {
            const totalSpent = user.wonPlayers?.reduce((total, player) => total + player.amount, 0) || 0;
            return Math.max((user.initialBudget || 100) - totalSpent, 0).toFixed(1);
        }
    };

    const isUserAdmin = (user: User) => user.isAdmin || user.is_admin;

    // Fetch users from API
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const usersData = await response.json();
                setUsers(usersData);
            } else {
                setError('Failed to load users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    // Add new user
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newUser.username.trim() || !newUser.password.trim()) {
            setAlertInfo({ message: 'Username and password are required', type: 'error' });
            return;
        }
        
        if (newUser.password.length < 6) {
            setAlertInfo({ message: 'Password must be at least 6 characters long', type: 'error' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            
            // Prepare user data, converting empty email to null
            const userData = {
                ...newUser,
                email: newUser.email.trim() || null // Convert empty string to null
            };
            
            console.log('Creating user with data:', userData);
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                setAlertInfo({ message: 'User created successfully', type: 'success' });
                setNewUser({ username: '', password: '', email: '', isAdmin: false });
                setShowAddForm(false);
                fetchUsers(); // Refresh user list
            } else {
                console.error('Server error:', data);
                setAlertInfo({ 
                    message: data.message || `Error creating user (${response.status})`, 
                    type: 'error' 
                });
            }
        } catch (error) {
            console.error('Network error:', error);
            setAlertInfo({ message: `Network error: ${error.message}`, type: 'error' });
        }
    };

    // Edit user
    const startEditUser = (user: User) => {
        setEditingUser(user._id);
        setEditFormData({
            username: user.username,
            email: user.email || '',
            isAdmin: isUserAdmin(user),
            password: ''
        });
    };

    const cancelEdit = () => {
        setEditingUser(null);
        setEditFormData({});
    };

    const handleEditUser = async (userId: string) => {
        if (!editFormData.username?.trim()) {
            setAlertInfo({ message: 'Username is required', type: 'error' });
            return;
        }
        
        if (editFormData.password && editFormData.password.length < 6) {
            setAlertInfo({ message: 'Password must be at least 6 characters long', type: 'error' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const updateData: any = {
                username: editFormData.username.trim(),
                email: editFormData.email,
                isAdmin: editFormData.isAdmin
            };
            
            // Only include password if it's provided
            if (editFormData.password && editFormData.password.trim()) {
                updateData.password = editFormData.password.trim();
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (response.ok) {
                setAlertInfo({ message: 'User updated successfully', type: 'success' });
                setEditingUser(null);
                setEditFormData({});
                fetchUsers(); // Refresh user list
            } else {
                setAlertInfo({ message: data.message || 'Error updating user', type: 'error' });
            }
        } catch (error) {
            setAlertInfo({ message: 'Error updating user', type: 'error' });
        }
    };

    // Delete user
    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setAlertInfo({ message: 'User deleted successfully', type: 'success' });
                fetchUsers(); // Refresh user list
            } else {
                setAlertInfo({ message: data.message || 'Error deleting user', type: 'error' });
            }
        } catch (error) {
            setAlertInfo({ message: 'Error deleting user', type: 'error' });
        }
    };

    useEffect(() => {
        if (!isLoading && isAuthenticated && user?.isAdmin) {
            fetchUsers();
        } else if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
            setLoading(false);
        }
    }, [isAuthenticated, user, isLoading]);

    // Clear alerts after 5 seconds
    useEffect(() => {
        if (alertInfo.message) {
            const timer = setTimeout(() => {
                setAlertInfo({ message: '', type: null });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [alertInfo]);

    if (isLoading || loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <div className="flex justify-center items-center min-h-screen">Please log in to access this page.</div>;
    }

    if (!user?.isAdmin) {
        return <div className="flex justify-center items-center min-h-screen">Access denied. Admin privileges required.</div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-gray-600">Manage user accounts and permissions</p>
                </div>
                <Link href="/admin">
                    <Button variant="outline">← Back to Admin Dashboard</Button>
                </Link>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {alertInfo.message && (
                <Alert variant={alertInfo.type === 'error' ? 'destructive' : 'default'} 
                       className={alertInfo.type === 'success' ? 'border-green-200 bg-green-50' : ''}>
                    <AlertTitle>{alertInfo.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                    <AlertDescription>{alertInfo.message}</AlertDescription>
                </Alert>
            )}

            {/* Statistics Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter(u => isUserAdmin(u)).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter(u => !isUserAdmin(u)).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add New User Form */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Add New User</CardTitle>
                        <Button 
                            onClick={() => setShowAddForm(!showAddForm)} 
                            variant={showAddForm ? "outline" : "default"}
                        >
                            {showAddForm ? 'Cancel' : '+ Add User'}
                        </Button>
                    </div>
                </CardHeader>
                {showAddForm && (
                    <CardContent>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="username">Username *</Label>
                                    <Input 
                                        id="username"
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input 
                                        id="email"
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                        placeholder="Enter email (optional)"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="password">Password *</Label>
                                <Input 
                                    id="password"
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    placeholder="Enter password (min 6 characters)"
                                    required
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="isAdmin"
                                    checked={newUser.isAdmin}
                                    onCheckedChange={(checked) => setNewUser({...newUser, isAdmin: checked})}
                                />
                                <Label htmlFor="isAdmin">Admin privileges</Label>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit">Create User</Button>
                                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                )}
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Username</th>
                                    <th className="text-left p-2">Email</th>
                                    <th className="text-left p-2">Role</th>
                                    <th className="text-left p-2">Budget</th>
                                    <th className="text-left p-2">Players Won</th>
                                    <th className="text-left p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u._id} className="border-b hover:bg-gray-50">
                                        {editingUser === u._id ? (
                                            <>
                                                <td className="p-2">
                                                    <Input 
                                                        value={editFormData.username || ''}
                                                        onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                                                        className="w-full"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input 
                                                        value={editFormData.email || ''}
                                                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                                        className="w-full"
                                                        placeholder="Email"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            checked={editFormData.isAdmin || false}
                                                            onCheckedChange={(checked) => setEditFormData({...editFormData, isAdmin: checked})}
                                                        />
                                                        <span className="text-sm">Admin</span>
                                                    </div>
                                                </td>
                                                <td className="p-2">£{getUserBudget(u)}M</td>
                                                <td className="p-2">{u.wonPlayers?.length || 0}</td>
                                                <td className="p-2">
                                                    <div className="flex gap-1">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleEditUser(u._id)}
                                                            className="px-2 py-1"
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            onClick={cancelEdit}
                                                            className="px-2 py-1"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-2 font-medium">{u.username}</td>
                                                <td className="p-2 text-gray-600">{u.email || 'N/A'}</td>
                                                <td className="p-2">
                                                    {isUserAdmin(u) ? (
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                                                            Admin
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                                                            User
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2">£{getUserBudget(u)}M</td>
                                                <td className="p-2">{u.wonPlayers?.length || 0}</td>
                                                <td className="p-2">
                                                    <div className="flex flex-col sm:flex-row gap-1">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            onClick={() => startEditUser(u)}
                                                            className="px-2 py-1"
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive" 
                                                            onClick={() => handleDeleteUser(u._id, u.username)}
                                                            className="px-2 py-1"
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {users.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No users found.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Password Change Form (for editing user password separately) */}
            {editingUser && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-blue-800">Change Password</CardTitle>
                        <p className="text-sm text-blue-600">Leave blank to keep current password</p>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-md">
                            <Label htmlFor="editPassword">New Password</Label>
                            <Input 
                                id="editPassword"
                                type="password"
                                value={editFormData.password || ''}
                                onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                                placeholder="Enter new password (min 6 characters)"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Password must be at least 6 characters long
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
