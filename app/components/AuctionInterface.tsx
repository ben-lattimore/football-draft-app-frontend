import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Player = {
    _id: string;
    name: string;
    player_image: string;
    position: string;
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

    console.log('Current state before render', { currentPlayer, currentBid, isAuctionActive, error, isAuthenticated, user, userBudget });

    if (isLoading) {
        return <div>Loading...</div>;
    }

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    return (
        <Card className="w-full max-w-4xl mx-auto h-[calc(70vh-4rem)] overflow-y-auto">
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
                            <img
                                src={currentPlayer.player_image}
                                alt={currentPlayer.name}
                                className="w-full h-96 object-cover rounded-lg"
                            />
                        </div>
                        <div className="w-full md:w-1/2 space-y-2">
                            <p className="text-2xl font-bold">{currentPlayer.name}</p>
                            <p className="text-lg">Position: {capitalize(currentPlayer.position)}</p>
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
                    <div className="flex space-x-2 w-full mt-4">
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
                )}

                {isAuthenticated && user && user.isAdmin && (
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