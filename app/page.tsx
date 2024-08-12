'use client';

import { useEffect, useState } from 'react';
import AuctionInterface from './components/AuctionInterface';
import { useAuth } from './contexts/AuthContext';

type Player = {
    _id: string;
    name: string;
    player_image: string;
    club: string;
    position: string;
};

export default function Home() {
    const [players, setPlayers] = useState<Player[]>([]);
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        async function fetchPlayers() {
            console.log('Fetching players');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players`);
            if (!res.ok) {
                console.error('Failed to fetch players');
                throw new Error('Failed to fetch players');
            }
            const data = await res.json();
            console.log('Fetched players:', data);
            setPlayers(data);
        }
        if (isAuthenticated && !isLoading) {
            fetchPlayers();
        }
    }, [isAuthenticated, isLoading]);

    console.log('Rendering Home', { playersCount: players.length });

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <div className="flex justify-center items-center min-h-screen">Please log in to access the auction.</div>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            {players.length > 0 && <AuctionInterface />}
        </div>
    );
}