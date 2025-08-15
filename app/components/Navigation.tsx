'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/app/contexts/AuthContext';

export function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
            <Link href="/" className="text-xl font-bold">
                Football Draft
            </Link>
            <div className="flex items-center space-x-2">
                <Link href="/teams" passHref>
                    <Button variant="ghost">Teams</Button>
                </Link>
                
                {/* Player Status Links */}
                <div className="hidden md:flex items-center space-x-1">
                    <Link href="/players-won" passHref>
                        <Button variant="ghost" size="sm">Players Won</Button>
                    </Link>
                    <Link href="/players-remaining" passHref>
                        <Button variant="ghost" size="sm">Players Remaining</Button>
                    </Link>
                    <Link href="/players-not-bid-on" passHref>
                        <Button variant="ghost" size="sm">Players Not Bid On</Button>
                    </Link>
                </div>
                
                {/* Mobile dropdown menu for player status */}
                <div className="md:hidden">
                    <select 
                        onChange={(e) => {
                            if (e.target.value) {
                                window.location.href = e.target.value;
                            }
                        }}
                        className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm"
                        defaultValue=""
                    >
                        <option value="" disabled>Players</option>
                        <option value="/players-won">Players Won</option>
                        <option value="/players-remaining">Players Remaining</option>
                        <option value="/players-not-bid-on">Players Not Bid On</option>
                    </select>
                </div>
                
                {isAuthenticated ? (
                    <>
                        <span className="mr-4">Welcome, {user?.username}!</span>
                        {user?.isAdmin && (
                            <>
                                <Link href="/admin" passHref>
                                    <Button variant="ghost" className="mr-2">Admin</Button>
                                </Link>
                                <Link href="/admin/user-management" passHref>
                                    <Button variant="ghost" className="mr-2" size="sm">Users</Button>
                                </Link>
                            </>
                        )}
                        <Button variant="ghost" onClick={handleLogout}>Logout</Button>
                    </>
                ) : (
                    <>
                        {pathname !== '/login' && (
                            <Link href="/login" passHref>
                                <Button variant="ghost" className="mr-2">Login</Button>
                            </Link>
                        )}
                        {pathname !== '/register' && (
                            <Link href="/register" passHref>
                                <Button variant="ghost">Register</Button>
                            </Link>
                        )}
                    </>
                )}
            </div>
        </nav>
    );
}