'use client';

import { useEffect, useState } from 'react';
import AuctionInterface from './components/AuctionInterface';
import { useAuth } from './contexts/AuthContext';

type Player = {
    _id: string;
    // Legacy fields
    name?: string;
    player_image?: string;
    club?: string;
    position: string;
    
    // New FPL fields
    player_id?: number;
    web_name?: string;
    first_name?: string;
    second_name?: string;
    team_name?: string;
    team_short_name?: string;
    element_type?: number;
    now_cost?: number;
    total_points?: number;
    form?: string;
    selected_by_percent?: string;
    minutes?: number;
    goals_scored?: number;
    assists?: number;
    clean_sheets?: number;
    photo_url?: string;
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
            <AuctionInterface />
        </div>
    );
}