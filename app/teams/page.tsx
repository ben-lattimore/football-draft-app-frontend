'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DefaultPlayerSVG from '../components/DefaultPlayerSVG';

// Updated Player type to match new FPL data structure
type Player = {
    _id: string;
    // New FPL fields
    web_name?: string;
    first_name?: string;
    second_name?: string;
    position: string;
    team_name?: string;
    team_short_name?: string;
    now_cost?: number;
    total_points?: number;
    photo_url?: string;
    // Legacy fields for backwards compatibility
    name?: string;
    player_image?: string;
    country?: string;
    club?: string;
};

type WonPlayer = {
    player: Player | null;
    amount: number;
    auctionDate: string;
    _id: string;
};

type Team = {
    _id: string;
    username: string;
    isAdmin: boolean;
    wonPlayers: WonPlayer[];
    remainingBudget: number;
    totalSpent: number;
    playerCount: number;
};

type GroupedPlayers = {
    [key: string]: WonPlayer[];
};

const positionOrder = ['goalkeeper', 'defender', 'midfielder', 'forward'];

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Helper functions for player data
    const getPlayerName = (player: Player) => {
        return player.web_name || player.name || `${player.first_name || ''} ${player.second_name || ''}`.trim() || 'Unknown Player';
    };
    
    const getPlayerImage = (player: Player) => {
        return player.photo_url || player.player_image || '/default-player.png';
    };
    
    const getTeamName = (player: Player) => {
        return player.team_name || player.club || 'Unknown Team';
    };
    
    const formatPosition = (position: string) => {
        if (!position) return 'Unknown Position';
        const posMap: { [key: string]: string } = {
            'GK': 'Goalkeeper',
            'GKP': 'Goalkeeper',
            'DEF': 'Defender', 
            'MID': 'Midfielder',
            'FWD': 'Forward'
        };
        return posMap[position.toUpperCase()] || position;
    };
    
    const getPositionColor = (position: string) => {
        const colors: { [key: string]: string } = {
            'GK': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'GKP': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'DEF': 'bg-blue-100 text-blue-800 border-blue-200',
            'MID': 'bg-green-100 text-green-800 border-green-200',
            'FWD': 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[position?.toUpperCase?.()] || 'bg-gray-100 text-gray-800 border-gray-200';
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
            // Skip if player object is null or undefined
            if (!player.player) {
                console.warn('Null player reference found in wonPlayers:', player);
                return acc;
            }
            
            const position = player.player.position?.toUpperCase() || 'UNKNOWN';
            const groupKey = (position === 'GK' || position === 'GKP') ? 'goalkeeper' : 
                           position === 'DEF' ? 'defender' :
                           position === 'MID' ? 'midfielder' :
                           position === 'FWD' ? 'forward' : 'other';
            
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(player);
            return acc;
        }, {} as GroupedPlayers);
    };

    const renderPlayerCard = (wonPlayer: WonPlayer) => {
        // Handle null player references
        if (!wonPlayer.player) {
            return (
                <Card key={wonPlayer._id} className="hover:shadow-lg transition-shadow border-2 bg-red-50 border-red-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-start space-x-3">
                            <div className="w-16 h-16 flex items-center justify-center">
                                <DefaultPlayerSVG size={64} className="w-16 h-16 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg font-semibold truncate text-red-800">
                                    Player Data Missing
                                </CardTitle>
                                <p className="text-sm text-red-600">
                                    Player reference not found
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Bought for:</span>
                                <span className="font-semibold text-green-600">£{wonPlayer.amount}m</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <span className="text-xs text-gray-500">Acquired:</span>
                                <span className="text-xs text-gray-500">{new Date(wonPlayer.auctionDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card key={wonPlayer._id} className={`hover:shadow-lg transition-shadow border-2 ${getPositionColor(wonPlayer.player.position)}`}>
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
                                {getTeamName(wonPlayer.player)} • {formatPosition(wonPlayer.player.position)}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Bought for:</span>
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
                            <span className="text-xs text-gray-500">Acquired:</span>
                            <span className="text-xs text-gray-500">{new Date(wonPlayer.auctionDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Teams</h1>
                <div className="text-center">Loading teams...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Teams</h1>
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Teams</h1>
            <p className="text-gray-600 mb-6">View all team squads with their purchased players and remaining budgets.</p>
            
            {teams.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-gray-500">No teams found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {teams.map((team) => {
                        const groupedPlayers = groupPlayersByPosition(team.wonPlayers);
                        
                        return (
                            <Card key={team._id} className="overflow-hidden">
                                <CardHeader className="bg-gray-50 border-b">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-2xl">{team.username}'s Team</CardTitle>
                                            {team.isAdmin && (
                                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mt-1">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-600">£{team.remainingBudget.toFixed(1)}m</div>
                                            <div className="text-sm text-gray-500">Remaining Budget</div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {team.playerCount} player{team.playerCount !== 1 ? 's' : ''} • £{team.totalSpent.toFixed(1)}m spent
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {team.wonPlayers.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500">No players purchased yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {positionOrder.map((position) => {
                                                const players = groupedPlayers[position] || [];
                                                return players.length > 0 ? (
                                                    <div key={position}>
                                                        <h3 className="text-lg font-semibold mb-3 capitalize">
                                                            {position}s ({players.length})
                                                        </h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {players.map(renderPlayerCard)}
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}