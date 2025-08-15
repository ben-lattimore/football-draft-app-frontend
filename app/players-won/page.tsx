'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DefaultPlayerSVG from '../components/DefaultPlayerSVG';

type Player = {
    _id: string;
    web_name?: string;
    first_name?: string;
    second_name?: string;
    position: string;
    team_name?: string;
    team_short_name?: string;
    now_cost?: number;
    total_points?: number;
    photo_url?: string;
};

type WonPlayer = {
    player: Player;
    winner: string;
    amount: number;
    auctionDate: string;
};

const PlayersWonPage: React.FC = () => {
    const [wonPlayers, setWonPlayers] = useState<WonPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWonPlayers = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/won`);
                const data = await response.json();
                
                if (response.ok) {
                    setWonPlayers(data.players || []);
                } else {
                    setError(data.message || 'Failed to fetch won players');
                }
            } catch (err) {
                setError('Error fetching won players');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchWonPlayers();
    }, []);

    const getPlayerName = (player: Player) => {
        return player.web_name || `${player.first_name || ''} ${player.second_name || ''}`.trim() || 'Unknown Player';
    };

    const getPlayerImage = (player: Player) => {
        return player.photo_url || '/default-player.png';
    };

    const getTeamName = (player: Player) => {
        return player.team_name || 'Unknown Team';
    };

    const formatPosition = (position: string) => {
        const posMap: { [key: string]: string } = {
            'GK': 'Goalkeeper',
            'DEF': 'Defender', 
            'MID': 'Midfielder',
            'FWD': 'Forward'
        };
        return posMap[position.toUpperCase()] || position;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Players Won</h1>
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Players Won</h1>
            <p className="text-gray-600 mb-6">All players who have been successfully auctioned and won by team managers.</p>
            
            {error && (
                <Alert className="mb-6" variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {wonPlayers.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-gray-500">No players have been won in auctions yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div>
                    <div className="mb-4 text-sm text-gray-600">
                        Total players won: {wonPlayers.length}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wonPlayers.map((wonPlayer, index) => (
                            <Card key={`${wonPlayer.player._id}-${index}`} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-16 h-16 flex items-center justify-center">
                                            <DefaultPlayerSVG size={64} className="w-16 h-16" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg font-semibold truncate">
                                                {getPlayerName(wonPlayer.player)}
                                            </CardTitle>
                                            <p className="text-sm text-gray-500">
                                                {formatPosition(wonPlayer.player.position)} • {getTeamName(wonPlayer.player)}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-600">Won by:</span>
                                            <span className="font-semibold text-blue-600">{wonPlayer.winner}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-600">Amount:</span>
                                            <span className="font-semibold text-green-600">£{wonPlayer.amount}m</span>
                                        </div>
                                        {wonPlayer.player.now_cost && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">FPL Price:</span>
                                                <span className="text-sm">£{(wonPlayer.player.now_cost / 10).toFixed(1)}m</span>
                                            </div>
                                        )}
                                        {wonPlayer.player.total_points && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">Points:</span>
                                                <span className="text-sm">{wonPlayer.player.total_points}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                            <span className="text-xs text-gray-500">Auction Date:</span>
                                            <span className="text-xs text-gray-500">{formatDate(wonPlayer.auctionDate)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayersWonPage;
