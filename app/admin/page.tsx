'use client';

import React, { useState, useEffect } from 'react';
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
    }, [isAuthenticated, user]);

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


            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="outline">
                            Export User Data
                        </Button>
                        <Button variant="outline">
                            Export Player Data
                        </Button>
                        <Button variant="destructive" disabled>
                            Clear All Auction Data
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Note: These actions are currently for display only. Implement backend endpoints as needed.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
