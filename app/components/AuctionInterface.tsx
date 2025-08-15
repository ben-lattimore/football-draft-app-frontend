import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DefaultPlayerSVG from './DefaultPlayerSVG';

type Player = {
    _id: string;
    // Legacy fields
    name?: string;
    player_image?: string;
    position: string;
    club?: string;
    
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

type Bid = {
    amount: number;
    bidder: string;
    timestamp: Date;
};

type AuctionResult = {
    winner: string | null;
    amount: number | null;
    player: string | null;
    newBudget?: number | null;
    allBids: Bid[];
};

const AuctionInterface: React.FC = () => {
    const socketRef = useRef<Socket | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [currentBid, setCurrentBid] = useState<Bid | null>(null);
    const [allBids, setAllBids] = useState<Bid[]>([]);
    const [isAuctionActive, setIsAuctionActive] = useState<boolean>(false);
    const [bidAmount, setBidAmount] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [lastAuctionResult, setLastAuctionResult] = useState<AuctionResult | null>(null);
    const [userBudget, setUserBudget] = useState<number | null>(null);
    const { isAuthenticated, user, isLoading } = useAuth();
    const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'error' | 'warning' | null }>({ message: '', type: null });
    
    // Player search states
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<Player[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    const fetchUserBudget = useCallback(async () => {
        console.log('Fetching user budget');
        if (isAuthenticated && user) {
            try {
                const token = localStorage.getItem('token');
                console.log('Token used for budget fetch:', token);
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/budget`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('Budget fetch response status:', response.status);
                if (!response.ok) {
                    throw new Error('Failed to fetch budget');
                }
                const data = await response.json();
                console.log('Fetched budget data:', data);
                setUserBudget(data.budget);
                console.log('Updated userBudget state:', data.budget);
            } catch (error) {
                console.error('Error fetching user budget:', error);
                setError('Failed to fetch user budget');
            }
        } else {
            console.log('Not fetching budget: user not authenticated or user object missing');
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (isAuthenticated && user && token) {
            fetchUserBudget();
        } else {
            console.log('Not fetching budget: missing authentication or token');
        }
    }, [isAuthenticated, user, fetchUserBudget]);

    useEffect(() => {
        if (alertInfo.message) {
            const timer = setTimeout(() => {
                setAlertInfo({ message: '', type: null });
            }, 5000); // Clear after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [alertInfo]);

    const connectSocket = useCallback(() => {
        console.log('Attempting to connect socket');
        if (socketRef.current) {
            console.log('Socket already exists, reusing');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            setError('Authentication required. Please log in.');
            return;
        }

        console.log('Creating new socket connection');
        const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        newSocket.on('connect', () => {
            console.log('Connected to server');
            setError(null);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setError(`Failed to connect to server: ${err.message}`);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
        });

        newSocket.on('auctionState', (state) => {
            console.log('Received auctionState', state);
            setCurrentPlayer(state.currentPlayer);
            setCurrentBid(state.currentBid);
            setIsAuctionActive(state.auctionActive);
            setAllBids(state.allBids || []);
        });

        newSocket.on('auctionStarted', ({ player, currentBid, allBids }) => {
            console.log('Auction started', { player, currentBid, allBids });
            setCurrentPlayer(player);
            setCurrentBid(currentBid);
            setIsAuctionActive(true);
            setAllBids(allBids || []);
        });

        newSocket.on('auctionStopped', (result: AuctionResult & { movedToBin?: boolean }) => {
            console.log('Auction stopped', result);
            setIsAuctionActive(false);
            setLastAuctionResult(result);
            setAllBids(result.allBids || []);
            setError(null);
            if (result.newBudget !== undefined && user && result.winner === user.username) {
                console.log('Updating budget from auction result:', result.newBudget);
                setUserBudget(result.newBudget);
            } else {
                console.log('Fetching updated budget after auction');
                fetchUserBudget();
            }
            if (result.movedToBin) {
                console.log('Player moved to bin');
                setAlertInfo({
                    message: `${result.player} has been moved to the bin due to no bids.`,
                    type: 'warning'
                });
                // Clear the alert after 5 seconds
                setTimeout(() => setAlertInfo({ message: '', type: null }), 5000);
            } else {
                setAlertInfo({ message: '', type: null });
            }
        });

        newSocket.on('newBid', ({ currentBid, allBids }) => {
            console.log('New bid received', { currentBid, allBids });
            setCurrentBid(currentBid);
            setAllBids(allBids);
        });

        newSocket.on('error', ({ message }) => {
            console.error('Socket error:', message);
            setAlertInfo({ message, type: 'error' });
        });

        newSocket.on('auctionPlayerSet', (data) => {
            console.log('Player set for auction:', data);
            setAlertInfo({ message: data.message, type: null });
            setSelectedPlayer(data.player);
        });

        socketRef.current = newSocket;
    }, [fetchUserBudget, user]);

    useEffect(() => {
        console.log('useEffect running', { isLoading, isAuthenticated });
        if (!isLoading && isAuthenticated) {
            console.log('Connecting socket and fetching budget');
            connectSocket();
            fetchUserBudget();
        }

        return () => {
            console.log('Cleaning up socket connection');
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [connectSocket, isLoading, isAuthenticated, fetchUserBudget, user]);

    const validateBidIncrement = (newBid: number, currentBid: number | null): boolean => {
        if (currentBid === null) return Number.isInteger(newBid) || (newBid * 10) % 5 === 0;
        const increment = newBid - currentBid;
        return increment === 0.5 || increment === 1 || (increment > 1 && (Number.isInteger(increment) || (increment * 10) % 5 === 0));
    };

    const handleBid = useCallback(() => {
        console.log('Attempting to place bid', { bidAmount, user, userBudget });
        if (socketRef.current && isAuthenticated && user) {
            const bidValue = parseFloat(bidAmount);
            if (isNaN(bidValue) || bidValue <= 0) {
                console.error('Invalid bid amount');
                setAlertInfo({ message: 'Please enter a valid bid amount', type: 'error' });
                return;
            }
            if (currentBid && !validateBidIncrement(bidValue, currentBid.amount)) {
                console.error('Invalid bid increment');
                setAlertInfo({ message: 'Your bid must increase by £0.5 million or £1 million, or be a whole number or half number above that', type: 'error' });
                return;
            }
            if (userBudget !== null && bidValue > userBudget) {
                console.error('Bid exceeds budget');
                setAlertInfo({ message: 'Your bid exceeds your available budget', type: 'error' });
                return;
            }
            const bid = {
                amount: bidValue,
                bidder: user.username
            };
            console.log('Emitting placeBid event', bid);
            socketRef.current.emit('placeBid', bid);
            setBidAmount('');
            setAlertInfo({ message: '', type: null }); // Clear any existing alerts
        } else {
            console.error('Cannot place bid: socket not connected or user not authenticated');
            setAlertInfo({ message: 'Unable to place bid. Please try again.', type: 'error' });
        }
    }, [bidAmount, currentBid, isAuthenticated, user, userBudget]);

    const handleIncrementBid = useCallback(() => {
        if (socketRef.current && isAuthenticated && user) {
            const newBidAmount = currentBid ? currentBid.amount + 0.5 : 0.5;
            if (userBudget !== null && newBidAmount > userBudget) {
                setAlertInfo({ message: 'Incremented bid exceeds your available budget', type: 'error' });
                return;
            }
            const bid = {
                amount: newBidAmount,
                bidder: user.username
            };
            console.log('Emitting placeBid event for increment', bid);
            socketRef.current.emit('placeBid', bid);
            setAlertInfo({ message: '', type: null }); // Clear any existing alerts
        } else {
            console.error('Cannot place incremented bid: socket not connected or user not authenticated');
            setAlertInfo({ message: 'Unable to place incremented bid. Please try again.', type: 'error' });
        }
    }, [currentBid, isAuthenticated, user, userBudget]);

    const handleStartAuction = useCallback(() => {
        console.log('Attempting to start auction', { user });
        if (socketRef.current && isAuthenticated && user && user.isAdmin) {
            console.log('Emitting startAuction event');
            socketRef.current.emit('startAuction');
            setAlertInfo({ message: '', type: null });
        } else {
            console.error('Cannot start auction: socket not connected, user not authenticated, or not admin');
            setAlertInfo({ message: 'Unable to start auction. Please try again.', type: 'error' });
        }
    }, [isAuthenticated, user]);

    const handleStopAuction = useCallback(() => {
        console.log('Attempting to stop auction', { user });
        if (socketRef.current && isAuthenticated && user && user.isAdmin) {
            console.log('Emitting stopAuction event');
            socketRef.current.emit('stopAuction');
            setAlertInfo({ message: '', type: null });
        } else {
            console.error('Cannot stop auction: socket not connected, user not authenticated, or not admin');
            setAlertInfo({ message: 'Unable to stop auction. Please try again.', type: 'error' });
        }
    }, [isAuthenticated, user]);

    // Player search functions
    const searchPlayers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/players/search?q=${encodeURIComponent(query)}`
            );
            const data = await response.json();
            
            if (response.ok) {
                setSearchResults(data.results || []);
            } else {
                console.error('Search error:', data.message);
                setAlertInfo({ message: 'Error searching players: ' + data.message, type: 'error' });
            }
        } catch (error) {
            console.error('Search error:', error);
            setAlertInfo({ message: 'Error searching players', type: 'error' });
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handlePlayerSelect = useCallback((player: Player) => {
        if (!socketRef.current || !isAuthenticated || !user?.isAdmin) {
            setAlertInfo({ message: 'Unable to select player. Admin access required.', type: 'error' });
            return;
        }

        if (isAuctionActive) {
            setAlertInfo({ message: 'Cannot select player while an auction is active', type: 'error' });
            return;
        }

        console.log('Selecting player for auction:', player);
        socketRef.current.emit('setAuctionPlayer', { playerId: player._id });
    }, [socketRef, isAuthenticated, user, isAuctionActive]);

    // Function to select random player by position
    const handleRandomPlayerSelectByPosition = useCallback((position: string) => {
        if (!socketRef.current || !isAuthenticated || !user?.isAdmin) {
            setAlertInfo({ message: 'Unable to select random player. Admin access required.', type: 'error' });
            return;
        }

        if (isAuctionActive) {
            setAlertInfo({ message: `Cannot select random ${position} while an auction is active`, type: 'error' });
            return;
        }

        console.log(`Selecting random ${position} player for auction`);
        socketRef.current.emit('setRandomAuctionPlayerByPosition', { position });
    }, [socketRef, isAuthenticated, user, isAuctionActive]);
    
    // Keep original function for backwards compatibility
    const handleRandomPlayerSelect = useCallback(() => {
        if (!socketRef.current || !isAuthenticated || !user?.isAdmin) {
            setAlertInfo({ message: 'Unable to select random player. Admin access required.', type: 'error' });
            return;
        }

        if (isAuctionActive) {
            setAlertInfo({ message: 'Cannot select random player while an auction is active', type: 'error' });
            return;
        }

        console.log('Selecting random player for auction');
        socketRef.current.emit('setRandomAuctionPlayer');
    }, [socketRef, isAuthenticated, user, isAuctionActive]);

    // Function to select completely random player (Banter)
    const handleBanterPlayerSelect = useCallback(() => {
        if (!socketRef.current || !isAuthenticated || !user?.isAdmin) {
            setAlertInfo({ message: 'Unable to select banter player. Admin access required.', type: 'error' });
            return;
        }

        if (isAuctionActive) {
            setAlertInfo({ message: 'Cannot select banter player while an auction is active', type: 'error' });
            return;
        }

        console.log('Selecting random banter player for auction');
        socketRef.current.emit('setRandomAuctionPlayer');
    }, [socketRef, isAuthenticated, user, isAuctionActive]);


    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery) {
                searchPlayers(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchPlayers]);

    console.log('Current state before render', { currentPlayer, currentBid, isAuctionActive, error, isAuthenticated, user, userBudget });

    if (isLoading) {
        return <div>Loading...</div>;
    }

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    
    // Helper functions for player data
    const getPlayerName = (player: Player) => {
        return player.name || player.web_name || `${player.first_name || ''} ${player.second_name || ''}`.trim() || 'Unknown Player';
    };
    
    const getPlayerImage = (player: Player) => {
        return player.photo_url || player.player_image;
    };
    
    const handleImageError = (playerId: string) => {
        setImageErrors(prev => new Set(prev).add(playerId));
    };
    
    const getTeamName = (player: Player) => {
        return player.team_name || player.club || 'Unknown Team';
    };
    
    const formatPosition = (position: string) => {
        if (!position) return 'Unknown';
        const posMap: { [key: string]: string } = {
            'GK': 'Goalkeeper',
            'DEF': 'Defender', 
            'MID': 'Midfielder',
            'FWD': 'Forward'
        };
        return posMap[position.toUpperCase()] || capitalize(position);
    };
    
    // Get position color for styling
    const getPositionColor = (position: string) => {
        if (!position) return 'gray';
        const colorMap: { [key: string]: string } = {
            'GK': 'yellow',
            'DEF': 'blue',
            'MID': 'green',
            'FWD': 'red'
        };
        return colorMap[position.toUpperCase()] || 'gray';
    };

    return (
        <Card className="w-full max-w-7xl mx-auto min-h-[85vh] mt-2 overflow-y-auto">
            <CardHeader>
                <CardTitle className="text-2xl">
                    {isAuctionActive ? "Active Auction" : "Auction Not Active"}
                </CardTitle>
                {isAuthenticated && (
                    <p className="text-lg">Your remaining budget: £{userBudget !== null ? Number(userBudget).toFixed(1) : 'Loading...'} million</p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {currentPlayer ? (
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-1/2">
                            {getPlayerImage(currentPlayer) && !imageErrors.has(currentPlayer._id) ? (
                                <img
                                    src={getPlayerImage(currentPlayer)}
                                    alt={getPlayerName(currentPlayer)}
                                    className="w-full h-[32rem] object-cover rounded-lg"
                                    onError={() => handleImageError(currentPlayer._id)}
                                />
                            ) : (
                                <div className="w-full h-[32rem] flex items-center justify-center bg-gray-100 rounded-lg">
                                    <DefaultPlayerSVG size={200} className="w-48 h-48" />
                                </div>
                            )}
                        </div>
                        <div className="w-full md:w-1/2 space-y-3">
                            <div>
                                <p className="text-2xl font-bold">{getPlayerName(currentPlayer)}</p>
                                <p className="text-lg text-gray-600">{getTeamName(currentPlayer)} • {formatPosition(currentPlayer.position)}</p>
                            </div>
                            
                            {/* FPL Stats */}
                            {currentPlayer.now_cost && (
                                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">FPL Price</p>
                                        <p className="text-lg font-semibold">£{(currentPlayer.now_cost / 10).toFixed(1)}m</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">Total Points</p>
                                        <p className="text-lg font-semibold">{currentPlayer.total_points || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">Form</p>
                                        <p className="text-lg font-semibold">{currentPlayer.form || '0.0'}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">Selected By</p>
                                        <p className="text-lg font-semibold">{currentPlayer.selected_by_percent || '0.0'}%</p>
                                    </div>
                                    {currentPlayer.position !== 'GK' && (
                                        <>
                                            <div className="text-center">
                                                <p className="text-sm text-gray-600">Goals</p>
                                                <p className="text-lg font-semibold">{currentPlayer.goals_scored || 0}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-gray-600">Assists</p>
                                                <p className="text-lg font-semibold">{currentPlayer.assists || 0}</p>
                                            </div>
                                        </>
                                    )}
                                    {currentPlayer.position === 'GK' && (
                                        <div className="text-center col-span-2">
                                            <p className="text-sm text-gray-600">Clean Sheets</p>
                                            <p className="text-lg font-semibold">{currentPlayer.clean_sheets || 0}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <p className="text-xl font-semibold mt-4">
                                Current Bid: {currentBid ? `£${currentBid.amount} million by ${currentBid.bidder}` : 'No bids yet'}
                            </p>
                            
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Bid History:</h3>
                                <div className="max-h-40 overflow-y-auto">
                                    {allBids.length > 0 ? (
                                        allBids.slice().reverse().map((bid, index) => (
                                            <div key={index} className="mb-1">
                                                <span className="font-medium">{bid.bidder}</span>: £{bid.amount} million
                                                <span className="text-sm text-gray-500 ml-2">
                                                    {new Date(bid.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No bids yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-xl text-center">No player selected for auction</p>
                )}

                {isAuctionActive && isAuthenticated && (
                    <div className="flex flex-col space-y-2 w-full mt-4">
                        <div className="flex space-x-2">
                            <Input
                                type="text"
                                value={bidAmount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d*\.?\d{0,1}$/.test(value)) {
                                        setBidAmount(value);
                                    }
                                }}
                                placeholder="Enter bid amount [millions]"
                                className="flex-grow"
                            />
                            <Button onClick={handleBid} className="w-32">Place Bid</Button>
                        </div>
                        <Button
                            onClick={handleIncrementBid}
                            className="w-full"
                            disabled={!isAuctionActive}
                        >
                            Bid £{((currentBid?.amount || 0) + 0.5).toFixed(1)}m
                        </Button>
                    </div>
                )}

                {isAuthenticated && user && user.isAdmin && (
                    <>
                        {/* Player Search Section - Only for Admins */}
                        {!isAuctionActive && (
                            <Card className="mt-4 border-blue-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg text-blue-700">Admin: Select Player for Next Auction</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex space-x-2">
                                        <Input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search for a player (e.g., 'salah', 'haaland')..."
                                            className="flex-grow"
                                        />
                                        {isSearching && <div className="flex items-center px-3 text-sm text-gray-500">Searching...</div>}
                                    </div>
                                    
                                    {/* Position-specific random player buttons */}
                                    <div className="flex flex-wrap justify-center md:justify-end gap-2 mt-3">
                                        <Button
                                            onClick={() => handleRandomPlayerSelectByPosition('GK')}
                                            disabled={isAuctionActive}
                                            variant="outline"
                                            className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                                            size="sm"
                                        >
                                            🎲 GK
                                        </Button>
                                        <Button
                                            onClick={() => handleRandomPlayerSelectByPosition('DEF')}
                                            disabled={isAuctionActive}
                                            variant="outline"
                                            className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                                            size="sm"
                                        >
                                            🎲 DEF
                                        </Button>
                                        <Button
                                            onClick={() => handleRandomPlayerSelectByPosition('MID')}
                                            disabled={isAuctionActive}
                                            variant="outline"
                                            className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                            size="sm"
                                        >
                                            🎲 MID
                                        </Button>
                                        <Button
                                            onClick={() => handleRandomPlayerSelectByPosition('FWD')}
                                            disabled={isAuctionActive}
                                            variant="outline"
                                            className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                                            size="sm"
                                        >
                                            🎲 FWD
                                        </Button>
                                        <Button
                                            onClick={handleBanterPlayerSelect}
                                            disabled={isAuctionActive}
                                            variant="outline"
                                            className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                                            size="sm"
                                        >
                                            🎭 Banter
                                        </Button>
                                    </div>
                                    
                                    {selectedPlayer && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm font-medium text-green-800">
                                                ✓ {getPlayerName(selectedPlayer)} selected for next auction
                                            </p>
                                        </div>
                                    )}
                                    
                                    {searchResults.length > 0 && (
                                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                                            {searchResults.map((player) => (
                                                <div key={player._id} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50">
                                                    <div className="flex items-center space-x-3">
                                                        {getPlayerImage(player) && !imageErrors.has(player._id) ? (
                                                            <img 
                                                                src={getPlayerImage(player)} 
                                                                alt={getPlayerName(player)}
                                                                className="w-12 h-12 rounded-full object-cover"
                                                                onError={() => handleImageError(player._id)}
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 flex items-center justify-center">
                                                                <DefaultPlayerSVG size={48} className="w-12 h-12" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium">{getPlayerName(player)}</p>
                                                            <p className="text-sm text-gray-500">
                                                                {formatPosition(player.position)} • {getTeamName(player)} • 
                                                                £{player.now_cost ? (player.now_cost / 10).toFixed(1) : '0.0'}m • 
                                                                {player.total_points || 0} pts
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handlePlayerSelect(player)}
                                                        className="ml-2"
                                                    >
                                                        Select
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                                        <p className="text-sm text-gray-500 text-center py-4">No available players found for "{searchQuery}"</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Admin Controls */}
                        <div className="flex space-x-2 w-full mt-4">
                            <Button
                                onClick={handleStartAuction}
                                disabled={isAuctionActive}
                                className="flex-grow"
                            >
                                Start Auction
                            </Button>
                            <Button
                                onClick={handleStopAuction}
                                disabled={!isAuctionActive}
                                className="flex-grow"
                            >
                                Stop Auction
                            </Button>
                        </div>
                    </>
                )}

                {lastAuctionResult && (
                    <Alert>
                        <AlertTitle>Last Auction Result</AlertTitle>
                        <AlertDescription>
                            {lastAuctionResult.winner
                                ? `${lastAuctionResult.winner} won ${lastAuctionResult.player} for £${lastAuctionResult.amount} million`
                                : 'No winner in the last auction.'}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
            {alertInfo.type && (
                <CardFooter>
                    <Alert
                        variant={alertInfo.type === 'error' ? 'destructive' : 'default'}
                        className={alertInfo.message ? 'visible' : 'hidden'}
                    >
                        <AlertTitle>{alertInfo.type === 'error' ? 'Error' : 'Warning'}</AlertTitle>
                        <AlertDescription>{alertInfo.message}</AlertDescription>
                    </Alert>
                </CardFooter>
            )}
        </Card>
    );
};

export default AuctionInterface;