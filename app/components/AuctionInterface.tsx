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
        const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
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
            // Display winner information
        });

        newSocket.on('newBid', (bid: Bid) => {
            setCurrentBid(bid);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const handleBid = () => {
        if (socket && isAuthenticated && user) {
            const bid = {
                amount: parseFloat(bidAmount),
                bidder: user.username
            };
            socket.emit('placeBid', bid);
            setBidAmount('');
        }
    };

    const handleStartAuction = () => {
        if (socket && isAuthenticated && user && user.isAdmin) {
            socket.emit('startAuction', currentPlayer);
        }
    };

    const handleStopAuction = () => {
        if (socket && isAuthenticated && user && user.isAdmin) {
            socket.emit('stopAuction');
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

    if (!currentPlayer) {
        return <div>Waiting for auction to start...</div>;
    }

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>{currentPlayer.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <img src={currentPlayer.player_image} alt={currentPlayer.name} className="w-full h-48 object-cover" />
                <p>Club: {currentPlayer.club}</p>
                <p>Position: {currentPlayer.position}</p>
                <p>Current Bid: {currentBid ? `${currentBid.amount} by ${currentBid.bidder}` : 'No bids yet'}</p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
                {isAuctionActive ? (
                    <div className="flex space-x-2">
                        <Input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="Enter bid amount"
                        />
                        <Button onClick={handleBid}>Place Bid</Button>
                    </div>
                ) : (
                    <p>Auction is not active</p>
                )}
                {user && user.isAdmin && (
                    <div className="flex space-x-2">
                        <Button onClick={handleStartAuction}>Start Auction</Button>
                        <Button onClick={handleStopAuction}>Stop Auction</Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
};

export default AuctionInterface;