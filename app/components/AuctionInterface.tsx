'use client';

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
    club: string;
    position: string;
};

type Bid = {
    amount: number;
    bidder: string;
};

const AuctionInterface: React.FC<{ currentDisplayedPlayer: Player }> = ({ currentDisplayedPlayer }) => {
    const socketRef = useRef<Socket | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [currentBid, setCurrentBid] = useState<Bid | null>(null);
    const [isAuctionActive, setIsAuctionActive] = useState<boolean>(false);
    const [bidAmount, setBidAmount] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, user, isLoading } = useAuth();

    console.log('Rendering AuctionInterface', { isAuthenticated, user, currentDisplayedPlayer, isLoading });

    const connectSocket = useCallback(() => {
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
        });

        newSocket.on('auctionStarted', ({ player, currentBid }) => {
            console.log('Auction started', { player, currentBid });
            setCurrentPlayer(player);
            setCurrentBid(currentBid);
            setIsAuctionActive(true);
        });

        newSocket.on('auctionStopped', ({ winner, amount }) => {
            console.log('Auction stopped', { winner, amount });
            setIsAuctionActive(false);
            setError(`Auction ended. Winner: ${winner}, Amount: ${amount}`);
        });

        newSocket.on('newBid', (bid: Bid) => {
            console.log('New bid received', bid);
            setCurrentBid(bid);
        });

        newSocket.on('error', ({ message }) => {
            console.error('Socket error:', message);
            setError(message);
        });

        socketRef.current = newSocket;
    }, []);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            console.log('useEffect running, connecting socket');
            connectSocket();
        }

        return () => {
            console.log('Cleaning up socket connection');
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [connectSocket, isLoading, isAuthenticated]);

    const handleBid = useCallback(() => {
        console.log('Attempting to place bid', { bidAmount, user });
        if (socketRef.current && isAuthenticated && user) {
            const bidValue = parseFloat(bidAmount);
            if (isNaN(bidValue) || bidValue <= 0) {
                console.error('Invalid bid amount');
                setError('Please enter a valid bid amount');
                return;
            }
            if (currentBid && bidValue <= currentBid.amount) {
                console.error('Bid too low');
                setError('Your bid must be higher than the current bid');
                return;
            }
            const bid = {
                amount: bidValue,
                bidder: user.username
            };
            console.log('Emitting placeBid event', bid);
            socketRef.current.emit('placeBid', bid);
            setBidAmount('');
            setError(null);
        }
    }, [bidAmount, currentBid, isAuthenticated, user]);

    const handleStartAuction = useCallback(() => {
        console.log('Attempting to start auction', { user, currentDisplayedPlayer });
        if (socketRef.current && isAuthenticated && user && user.isAdmin) {
            console.log('Emitting startAuction event', currentDisplayedPlayer);
            socketRef.current.emit('startAuction', currentDisplayedPlayer);
            setError(null);
        }
    }, [currentDisplayedPlayer, isAuthenticated, user]);

    const handleStopAuction = useCallback(() => {
        console.log('Attempting to stop auction', { user });
        if (socketRef.current && isAuthenticated && user && user.isAdmin) {
            console.log('Emitting stopAuction event');
            socketRef.current.emit('stopAuction');
            setError(null);
        }
    }, [isAuthenticated, user]);

    console.log('Current state before render', { currentPlayer, currentBid, isAuctionActive, error, isAuthenticated, user });

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Card className="w-full max-w-4xl mx-auto h-[calc(70vh-4rem)] overflow-y-auto">
            <CardHeader>
                <CardTitle className="text-2xl">
                    {isAuctionActive ? "Active Auction" : "Auction Not Active"}
                </CardTitle>
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
                            <p className="text-lg">Club: {currentPlayer.club}</p>
                            <p className="text-lg">Position: {currentPlayer.position}</p>
                            <p className="text-xl font-semibold mt-4">
                                Current Bid: {currentBid ? `£${currentBid.amount} by ${currentBid.bidder}` : 'No bids yet'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-xl text-center">No player selected for auction</p>
                )}

                {isAuctionActive && isAuthenticated && (
                    <div className="flex space-x-2 w-full mt-4">
                        <Input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="Enter bid amount"
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
            </CardContent>
            {error && (
                <CardFooter>
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardFooter>
            )}
        </Card>
    );
};

export default AuctionInterface;