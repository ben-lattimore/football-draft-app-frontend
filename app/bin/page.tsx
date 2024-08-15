'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Player = {
    _id: string;
    name: string;
    position: string;
    player_image: string;
};

export default function BinPage() {
    const [binPlayers, setBinPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    useEffect(() => {
        const fetchBinPlayers = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/bin`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch bin players');
                }
                const data = await response.json();
                setBinPlayers(data);
            } catch (err) {
                setError('Error fetching bin players');
                console.error('Error fetching bin players:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBinPlayers();
    }, []);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Bin Players</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {binPlayers.map((player) => (
                    <Card key={player._id}>
                        <CardHeader>
                            <CardTitle>{player.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-w-3 aspect-h-4 mb-2">
                                <Avatar className="w-full h-full">
                                    <AvatarImage src={player.player_image} alt={player.name} />
                                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <p><strong>Position:</strong> {capitalize(player.position)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}