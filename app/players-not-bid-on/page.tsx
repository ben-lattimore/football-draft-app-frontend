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

const PlayersNotBidOnPage: React.FC = () => {
    const [noBidPlayers, setNoBidPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNoBidPlayers = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/not-bid-on`);
                const data = await response.json();
                
                if (response.ok) {
                    setNoBidPlayers(data.players || []);
                } else {
                    setError(data.message || 'Failed to fetch players with no bids');
                }
            } catch (err) {
                setError('Error fetching players with no bids');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNoBidPlayers();
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

    const getPositionColor = (position: string) => {
        const colors: { [key: string]: string } = {
            'GK': 'bg-yellow-100 text-yellow-800',
            'DEF': 'bg-blue-100 text-blue-800',
            'MID': 'bg-green-100 text-green-800',
            'FWD': 'bg-red-100 text-red-800'
        };
        return colors[position.toUpperCase()] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Players Not Bid On</h1>
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Players Not Bid On</h1>
            <p className="text-gray-600 mb-6">Players who were put up for auction but received no bids when the auction was stopped.</p>
            
            {error && (
                <Alert className="mb-6" variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {noBidPlayers.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="mb-4">
                            <span className="text-6xl">🎉</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Great news!</h3>
                        <p className="text-gray-500 mb-4">
                            No players have been left without bids in auctions. Every player put up for auction has received at least one bid!
                        </p>
                        <div className="text-sm text-gray-400">
                            This page will show players who were auctioned but received no bids when those auctions were stopped.
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div>
                    <Alert className="mb-6" variant="default">
                        <AlertDescription>
                            These players were put up for auction but didn't receive any bids. They may be available for future auctions.
                        </AlertDescription>
                    </Alert>

                    <div className="mb-4 text-sm text-gray-600">
                        Total players with no bids: {noBidPlayers.length}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {noBidPlayers.map((player) => (
                            <Card key={player._id} className="hover:shadow-lg transition-shadow border-orange-200">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-16 h-16 flex items-center justify-center">
                                            <DefaultPlayerSVG size={64} className="w-16 h-16" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg font-semibold truncate">
                                                {getPlayerName(player)}
                                            </CardTitle>
                                            <p className="text-sm text-gray-500">
                                                {getTeamName(player)}
                                            </p>
                                            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getPositionColor(player.position)}`}>
                                                {formatPosition(player.position)}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        {player.now_cost && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">FPL Price:</span>
                                                <span className="font-semibold text-blue-600">£{(player.now_cost / 10).toFixed(1)}m</span>
                                            </div>
                                        )}
                                        {player.total_points && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">Total Points:</span>
                                                <span className="font-semibold">{player.total_points}</span>
                                            </div>
                                        )}
                                        <div className="pt-2 border-t border-orange-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-orange-600 font-medium">⚠️ No bids received</span>
                                                <span className="text-xs text-gray-500">May be re-auctioned</span>
                                            </div>
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

export default PlayersNotBidOnPage;
