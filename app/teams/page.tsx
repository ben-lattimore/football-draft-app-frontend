'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Player = {
    _id: string;
    name: string;
    position: string;
    player_image: string;
    country: string;
};

type WonPlayer = {
    player: Player;
    amount: number;
    auctionDate: string;
};

type User = {
    _id: string;
    username: string;
    isAdmin: boolean;
    wonPlayers: WonPlayer[];
    budget: number; // Add this line
};

type GroupedPlayers = {
    [key: string]: WonPlayer[];
};

const positionOrder = ['goalkeeper', 'defender', 'midfielder', 'forward'];

export default function TeamsPage() {
    const [teams, setTeams] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const INITIAL_BUDGET = 100; // Initial budget in millions
    const calculateRemainingBudget = (wonPlayers: WonPlayer[]): number => {
        const totalSpent = wonPlayers.reduce((total, player) => total + player.amount, 0);
        return Math.max(INITIAL_BUDGET - totalSpent, 0); // Ensure budget doesn't go negative
    };

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch teams');
                }
                const data = await response.json();
                setTeams(data);
            } catch (err) {
                setError('Error fetching teams data');
                console.error('Error fetching teams:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeams();
    }, []);

    const groupPlayersByPosition = (players: WonPlayer[]): GroupedPlayers => {
        return players.reduce((acc, player) => {
            const position = player.player.position.toLowerCase();
            if (!acc[position]) {
                acc[position] = [];
            }
            acc[position].push(player);
            return acc;
        }, {} as GroupedPlayers);
    };

    const renderPlayerCard = (wonPlayer: WonPlayer) => (
        <Card key={wonPlayer.player._id} className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">{wonPlayer.player.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="aspect-w-3 aspect-h-4 mb-2">
                    <Avatar className="w-full h-full">
                        <AvatarImage src={wonPlayer.player.player_image} alt={wonPlayer.player.name} />
                        <AvatarFallback>{wonPlayer.player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <p><strong>Position:</strong> {wonPlayer.player.position}</p>
                <p><strong>Country:</strong> {wonPlayer.player.country}</p>
                <p><strong>Bought for:</strong> £{wonPlayer.amount} million</p>
                <p><strong>Auction Date:</strong> {new Date(wonPlayer.auctionDate).toLocaleDateString()}</p>
            </CardContent>
        </Card>
    );

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Teams</h1>
            {teams.map((user) => {
                const groupedPlayers = groupPlayersByPosition(user.wonPlayers);
                const remainingBudget = calculateRemainingBudget(user.wonPlayers);
                return (
                    <Card key={user._id} className="mb-6">
                        <CardHeader>
                            <CardTitle>{user.username}'s Team</CardTitle>
                            <p className="text-lg">Remaining Budget: £{remainingBudget.toFixed(1)} million</p>
                        </CardHeader>
                        <CardContent>
                            {positionOrder.map((position) => {
                                const players = groupedPlayers[position] || [];
                                return players.length > 0 ? (
                                    <div key={position} className="mb-4">
                                        <h3 className="text-xl font-semibold mb-2 capitalize">{position}s</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {players.map(renderPlayerCard)}
                                        </div>
                                    </div>
                                ) : null;
                            })}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}