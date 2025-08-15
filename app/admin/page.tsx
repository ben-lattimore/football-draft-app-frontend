'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Player = {
    _id: string;
    name?: string;
    web_name?: string;
    first_name?: string;
    second_name?: string;
    position: string;
    team_name?: string;
    club?: string;
    photo_url?: string;
    player_image?: string;
    now_cost?: number;
    total_points?: number;
};

type User = {
    _id: string;
    username: string;
    email?: string;
    is_admin?: boolean;
    isAdmin?: boolean;
    budget_remaining?: number;
    initialBudget?: number;
    wonPlayers: any[];
};

export default function AdminPage() {
    const { isAuthenticated, user, isLoading } = useAuth();
    const [players, setPlayers] = useState<Player[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

    // Helper functions
    const getPlayerName = (player: Player) => {
        return player.name || player.web_name || `${player.first_name || ''} ${player.second_name || ''}`.trim() || 'Unknown Player';
    };

    const getTeamName = (player: Player) => {
        return player.team_name || player.club || 'Unknown Team';
    };

    const getUserBudget = (user: User) => {
        if (user.budget_remaining !== undefined) {
            return (user.budget_remaining / 1000000).toFixed(1);
        } else {
            const totalSpent = user.wonPlayers?.reduce((total, player) => total + player.amount, 0) || 0;
            return Math.max((user.initialBudget || 100) - totalSpent, 0).toFixed(1);
        }
    };

    // Reset functions
    const handleFullReset = useCallback(async () => {
        if (!confirm('⚠️ FULL RESET: This will clear ALL auction data, won players, and reset all budgets to £100m. This cannot be undone. Are you sure?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reset-auction`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                setAlertInfo({ message: `✅ ${data.message} (${data.usersReset} users reset)`, type: 'success' });
                // Refresh data
                setUsers([]);
                setLoading(true);
                // The useEffect will re-fetch the data
            } else {
                setAlertInfo({ message: `Reset failed: ${data.message}`, type: 'error' });
            }
        } catch (error) {
            console.error('Error resetting auction:', error);
            setAlertInfo({ message: 'Error performing full reset', type: 'error' });
        }
    }, []);

    const handleBudgetReset = useCallback(async () => {
        if (!confirm('Reset all user budgets to £100m? Won players will be kept. Continue?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reset-budgets-only`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                setAlertInfo({ message: `✅ ${data.message} (${data.usersReset} users)`, type: 'success' });
                // Refresh data
                setUsers([]);
                setLoading(true);
            } else {
                setAlertInfo({ message: `Budget reset failed: ${data.message}`, type: 'error' });
            }
        } catch (error) {
            console.error('Error resetting budgets:', error);
            setAlertInfo({ message: 'Error resetting budgets', type: 'error' });
        }
    }, []);

    const handleClearWonPlayers = useCallback(async () => {
        if (!confirm('Clear all won players from all teams? Budgets will be kept as-is. Continue?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/clear-won-players`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                setAlertInfo({ message: `✅ ${data.message} (${data.usersReset} teams)`, type: 'success' });
                // Refresh data
                setUsers([]);
                setLoading(true);
            } else {
                setAlertInfo({ message: `Clear failed: ${data.message}`, type: 'error' });
            }
        } catch (error) {
            console.error('Error clearing won players:', error);
            setAlertInfo({ message: 'Error clearing won players', type: 'error' });
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!isAuthenticated || !user?.isAdmin) return;

            try {
                const token = localStorage.getItem('token');
                const headers = {
                    'Authorization': `Bearer ${token}`
                };

                // Fetch all data in parallel
                const [playersRes, usersRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams`, { headers })
                ]);

                if (playersRes.ok) {
                    const playersData = await playersRes.json();
                    setPlayers(playersData);
                }

                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData);
                }

            } catch (error) {
                console.error('Error fetching admin data:', error);
                setError('Failed to load admin data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated, user, loading]); // Add loading to deps to re-fetch when reset operations set loading to true

    // Clear alerts after 8 seconds
    useEffect(() => {
        if (alertInfo.message) {
            const timer = setTimeout(() => {
                setAlertInfo({ message: '', type: null });
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [alertInfo]);

    if (isLoading || loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <div className="flex justify-center items-center min-h-screen">Please log in to access admin panel.</div>;
    }

    if (!user?.isAdmin) {
        return <div className="flex justify-center items-center min-h-screen">Access denied. Admin privileges required.</div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <div className="text-sm text-gray-600">
                    Logged in as: <span className="font-semibold">{user.username}</span>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {alertInfo.message && (
                <Alert variant={alertInfo.type === 'error' ? 'destructive' : 'default'} className={alertInfo.type === 'success' ? 'border-green-200 bg-green-50' : ''}>
                    <AlertTitle>{alertInfo.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                    <AlertDescription>{alertInfo.message}</AlertDescription>
                </Alert>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Available Players</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{players.length}</div>
                        <p className="text-xs text-muted-foreground">Ready for auction</p>
                    </CardContent>
                </Card>


                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                        <p className="text-xs text-muted-foreground">Registered users</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter(u => u.isAdmin || u.is_admin).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Admin privileges</p>
                    </CardContent>
                </Card>
            </div>

            {/* Users Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Users Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Username</th>
                                    <th className="text-left p-2">Email</th>
                                    <th className="text-left p-2">Admin</th>
                                    <th className="text-left p-2">Budget</th>
                                    <th className="text-left p-2">Players Won</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-medium">{user.username}</td>
                                        <td className="p-2 text-gray-600">{user.email || 'N/A'}</td>
                                        <td className="p-2">
                                            {user.isAdmin || user.is_admin ? (
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                                                    User
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2">£{getUserBudget(user)}M</td>
                                        <td className="p-2">{user.wonPlayers?.length || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>


            {/* Auction Reset Controls - Danger Zone */}
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="text-red-700 flex items-center gap-2">
                        ⚠️ Danger Zone - Auction Reset Controls
                    </CardTitle>
                    <p className="text-sm text-red-600">These actions cannot be undone. Use with extreme caution.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Button
                                onClick={handleFullReset}
                                variant="destructive"
                                className="w-full"
                            >
                                🔄 Full Reset
                            </Button>
                            <p className="text-xs text-gray-600">
                                Clears everything - won players + resets budgets to £100m
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Button
                                onClick={handleBudgetReset}
                                variant="outline"
                                className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                            >
                                💰 Reset Budgets
                            </Button>
                            <p className="text-xs text-gray-600">
                                Only resets budgets to £100m, keeps won players
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Button
                                onClick={handleClearWonPlayers}
                                variant="outline"
                                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                🧹 Clear Won Players
                            </Button>
                            <p className="text-xs text-gray-600">
                                Only clears won players, keeps current budgets
                            </p>
                        </div>
                    </div>
                    
                    <div className="border-t border-red-200 pt-4 mt-4">
                        <h4 className="font-semibold text-red-800 mb-2">⚠️ Safety Guidelines:</h4>
                        <ul className="text-xs text-red-700 space-y-1">
                            <li>• Always confirm with all participants before resetting</li>
                            <li>• Consider backing up data before major resets</li>
                            <li>• Full Reset should only be used to start completely fresh</li>
                            <li>• Use specific resets (Budget/Players) for targeted adjustments</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Export & Analysis Tools</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="outline" disabled>
                            📊 Export User Data
                        </Button>
                        <Button variant="outline" disabled>
                            📋 Export Player Data
                        </Button>
                        <Button variant="outline" disabled>
                            📈 Generate Auction Report
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Note: Export functionality coming soon. Contact developer if needed urgently.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
