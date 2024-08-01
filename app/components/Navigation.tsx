'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/app/contexts/AuthContext';

export function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
            <Link href="/" className="text-xl font-bold">
                Football Draft
            </Link>
            <div>
                {isAuthenticated ? (
                    <>
                        <Link href="/profile" passHref>
                            <Button variant="ghost" className="mr-2">Profile</Button>
                        </Link>
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