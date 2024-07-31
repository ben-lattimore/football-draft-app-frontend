'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Define a type for the player object
type Player = {
    name: string;
    player_image: string;
    club: string;
    position_id: number;
};

type PlayerNavigationProps = {
    players: Player[];
};

export default function PlayerNavigation({ players }: PlayerNavigationProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const playerName = searchParams.get('player');
        if (playerName && players.length > 0) {
            const index = players.findIndex(p => p.name === playerName);
            if (index !== -1) {
                setCurrentIndex(index);
            }
        }
    }, [searchParams, players]);

    const navigate = (direction: number) => {
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = players.length - 1;
        if (newIndex >= players.length) newIndex = 0;
        setCurrentIndex(newIndex);
        router.push(`/?player=${encodeURIComponent(players[newIndex].name)}`, { scroll: false });
    };

    if (players.length === 0) return <div>Loading...</div>;

    const player = players[currentIndex];

    return (
        <Card className="w-96">
            <CardHeader>
                <CardTitle>{player.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <img src={player.player_image} alt={player.name} className="w-full h-64 object-cover mb-4"/>
                <p>Club: {player.club}</p>
                <p>Position ID: {player.position_id}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={() => navigate(-1)}><ChevronLeft /></Button>
                <Button onClick={() => navigate(1)}><ChevronRight /></Button>
            </CardFooter>
        </Card>
    );
}