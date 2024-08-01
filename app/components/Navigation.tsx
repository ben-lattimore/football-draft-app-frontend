'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";

export function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
            <Link href="/" className="text-xl font-bold">
                Football Draft
            </Link>
            <div>
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
            </div>
        </nav>
    );
}