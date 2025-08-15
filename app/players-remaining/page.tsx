'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const PlayersRemainingPage: React.FC = () => {
    const [remainingPlayers, setRemainingPlayers] = useState<Player[]>([]);
    const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPosition, setFilterPosition] = useState('All');
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchRemainingPlayers = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/remaining`);
                const data = await response.json();
                
                if (response.ok) {
                    setRemainingPlayers(data.players || []);
                    setFilteredPlayers(data.players || []);
                } else {
                    setError(data.message || 'Failed to fetch remaining players');
                }
            } catch (err) {
                setError('Error fetching remaining players');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRemainingPlayers();
    }, []);

    // Filter players based on search query and position
    useEffect(() => {
        let filtered = remainingPlayers;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(player => 
                getPlayerName(player).toLowerCase().includes(query) ||
                getTeamName(player).toLowerCase().includes(query)
            );
        }

        if (filterPosition !== 'All') {
            filtered = filtered.filter(player => player.position === filterPosition);
        }

        setFilteredPlayers(filtered);
    }, [remainingPlayers, searchQuery, filterPosition]);

    const getPlayerName = (player: Player) => {
        return player.web_name || `${player.first_name || ''} ${player.second_name || ''}`.trim() || 'Unknown Player';
    };

    const getPlayerImage = (player: Player) => {
        return player.photo_url;
    };
    
    const handleImageError = (playerId: string) => {
        setImageErrors(prev => new Set(prev).add(playerId));
    };

    const getTeamName = (player: Player) => {
        return player.team_name || 'Unknown Team';
    };

    const formatPosition = (position: string) => {
        if (!position) return 'Unknown Position';
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
        return colors[position?.toUpperCase?.()] || 'bg-gray-100 text-gray-800';
    };

    const positionStats = remainingPlayers.reduce((acc, player) => {
        const position = player.position || 'Unknown';
        acc[position] = (acc[position] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Players Remaining</h1>
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Players Remaining</h1>
            <p className="text-gray-600 mb-6">All players who have not yet been put up for auction and are still available.</p>
            
            {error && (
                <Alert className="mb-6" variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {remainingPlayers.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-gray-500">All players have been auctioned!</p>
                    </CardContent>
                </Card>
            ) : (
                <div>
                    {/* Stats and Filters */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {Object.entries(positionStats).map(([position, count]) => (
                                <div key={position} className="text-center">
                                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPositionColor(position)}`}>
                                        {formatPosition(position)}
                                    </div>
                                    <div className="text-lg font-bold mt-1">{count}</div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4">
                            <Input
                                type="text"
                                placeholder="Search players or teams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-grow"
                            />
                            <select
                                value={filterPosition}
                                onChange={(e) => setFilterPosition(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                            >
                                <option value="All">All Positions</option>
                                <option value="GK">Goalkeepers</option>
                                <option value="DEF">Defenders</option>
                                <option value="MID">Midfielders</option>
                                <option value="FWD">Forwards</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4 text-sm text-gray-600">
                        Showing {filteredPlayers.length} of {remainingPlayers.length} remaining players
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlayers.map((player) => (
                            <Card key={player._id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start space-x-3">
                                        {getPlayerImage(player) && !imageErrors.has(player._id) ? (
                                            <img 
                                                src={getPlayerImage(player)} 
                                                alt={getPlayerName(player)}
                                                className="w-16 h-16 rounded-full object-cover"
                                                onError={() => handleImageError(player._id)}
                                            />
                                        ) : (
                                            <div className="w-16 h-16 flex items-center justify-center">
                                                <DefaultPlayerSVG size={64} className="w-16 h-16" />
                                            </div>
                                        )}
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
                                        <div className="pt-2 border-t border-gray-100">
                                            <span className="text-xs text-green-600 font-medium">✓ Available for auction</span>
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

export default PlayersRemainingPage;
