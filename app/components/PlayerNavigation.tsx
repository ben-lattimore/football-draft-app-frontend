'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Player = {
    name: string;
    player_image: string;
    club: string;
    position: string;
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
        <Card className="w-[800px] max-w-[95vw]">
            <CardHeader>
                <CardTitle className="text-4xl font-bold text-center">{player.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[600px] mb-8 overflow-hidden rounded-lg">
                    <img
                        src={player.player_image}
                        alt={player.name}
                        className="w-full h-full object-cover object-center"
                    />
                </div>
                <div className="space-y-4">
                    <p className="text-2xl"><span className="font-semibold">Club:</span> {player.club}</p>
                    <p className="text-2xl"><span className="font-semibold">Position:</span> <span className="capitalize">{player.position}</span></p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button size="lg" onClick={() => navigate(-1)}><ChevronLeft className="w-6 h-6 mr-2" /> Previous</Button>
                <Button size="lg" onClick={() => navigate(1)}>Next <ChevronRight className="w-6 h-6 ml-2" /></Button>
            </CardFooter>
        </Card>
    );
}