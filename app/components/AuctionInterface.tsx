'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Player = {
    name: string;
    player_image: string;
    club: string;
    position: string;
};

type Bid = {
    amount: number;
    bidder: string;
};

const AuctionInterface: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [currentBid, setCurrentBid] = useState<Bid | null>(null);
    const [isAuctionActive, setIsAuctionActive] = useState<boolean>(false);
    const [bidAmount, setBidAmount] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            return;
        }

        const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
            auth: {
                token: token
            },
            transports: ['websocket'],
            upgrade: false
        });

        newSocket.on('connect', () => {
            console.log('Connected to server');
            setSocket(newSocket);
            setError(null);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setError('Failed to connect to server. Please try again later.');
        });

        newSocket.on('auctionState', ({ currentPlayer, currentBid, auctionActive }) => {
            setCurrentPlayer(currentPlayer);
            setCurrentBid(currentBid);
            setIsAuctionActive(auctionActive);
        });

        newSocket.on('auctionStarted', ({ player, currentBid }) => {
            setCurrentPlayer(player);
            setCurrentBid(currentBid);
            setIsAuctionActive(true);
        });

        newSocket.on('auctionStopped', ({ winner, amount }) => {
            setIsAuctionActive(false);
            setError(`Auction ended. Winner: ${winner}, Amount: ${amount}`);
        });

        newSocket.on('newBid', (bid: Bid) => {
            setCurrentBid(bid);
        });

        newSocket.on('error', ({ message }) => {
            setError(message);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const handleBid = () => {
        if (socket && isAuthenticated && user) {
            const bidValue = parseFloat(bidAmount);
            if (isNaN(bidValue) || bidValue <= 0) {
                setError('Please enter a valid bid amount');
                return;
            }
            if (currentBid && bidValue <= currentBid.amount) {
                setError('Your bid must be higher than the current bid');
                return;
            }
            const bid = {
                amount: bidValue,
                bidder: user.username
            };
            socket.emit('placeBid', bid);
            setBidAmount('');
            setError(null);
        }
    };

    const handleStartAuction = () => {
        if (socket && isAuthenticated && user && user.isAdmin) {
            socket.emit('startAuction', currentPlayer);
            setError(null);
        }
    };

    const handleStopAuction = () => {
        if (socket && isAuthenticated && user && user.isAdmin) {
            socket.emit('stopAuction');
            setError(null);
        }
    };

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="w-[400px] mt-4">
            <CardHeader>
                <CardTitle>{isAuctionActive ? "Active Auction" : "Auction Not Active"}</CardTitle>
            </CardHeader>
            <CardContent>
                {currentPlayer ? (
                    <>
                        <img src={currentPlayer.player_image} alt={currentPlayer.name} className="w-full h-48 object-cover mb-4" />
                        <p className="font-bold text-lg">{currentPlayer.name}</p>
                        <p>Club: {currentPlayer.club}</p>
                        <p>Position: {currentPlayer.position}</p>
                        <p className="mt-2 font-semibold">Current Bid: {currentBid ? `${currentBid.amount} by ${currentBid.bidder}` : 'No bids yet'}</p>
                    </>
                ) : (
                    <p>No player selected for auction</p>
                )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
                {isAuctionActive ? (
                    isAuthenticated ? (
                        <div className="flex space-x-2 w-full">
                            <Input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder="Enter bid amount"
                                className="flex-grow"
                            />
                            <Button onClick={handleBid}>Place Bid</Button>
                        </div>
                    ) : (
                        <p>Please log in to place a bid</p>
                    )
                ) : (
                    <p>Waiting for auction to start...</p>
                )}
                {user && user.isAdmin && (
                    <div className="flex space-x-2 w-full">
                        <Button onClick={handleStartAuction} disabled={isAuctionActive} className="flex-grow">
                            Start Auction
                        </Button>
                        <Button onClick={handleStopAuction} disabled={!isAuctionActive} className="flex-grow">
                            Stop Auction
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
};

export default AuctionInterface;