import PlayerNavigation from './components/PlayerNavigation';

async function getPlayers() {
    const res = await fetch(`${process.env.API_URL}/api/players`, { cache: 'no-store' });
    if (!res.ok) {
        throw new Error('Failed to fetch players');
    }
    return res.json();
}

export default async function Home() {
    const players = await getPlayers();

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <PlayerNavigation players={players} />
        </div>
    );
}