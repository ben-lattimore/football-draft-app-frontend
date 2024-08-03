'use client';

import { useEffect, useState } from 'react';
import PlayerNavigation from './components/PlayerNavigation';
import AuctionInterface from './components/AuctionInterface';
import { useAuth } from './contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Player = {
    name: string;
    player_image: string;
    club: string;
    position: string;
};

export default function Home() {
    const [players, setPlayers] = useState<Player[]>([]);
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        async function fetchPlayers() {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players`);
            if (!res.ok) {
                throw new Error('Failed to fetch players');
            }
            const data = await res.json();
            setPlayers(data);
        }
        if (isAuthenticated) {
            fetchPlayers();
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <Card className="w-[350px]">
                    <CardHeader>
                        <CardTitle>Welcome to Football Draft</CardTitle>
                        <CardDescription>Please log in to access the auction.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => window.location.href = '/login'} className="w-full">
                            Log In
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Welcome, {user?.username}!</h1>
            <PlayerNavigation players={players} />
            <AuctionInterface />
        </div>
    );
}