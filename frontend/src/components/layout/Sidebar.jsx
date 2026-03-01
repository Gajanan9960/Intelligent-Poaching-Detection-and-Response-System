import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Video, Settings, LogOut, ShieldAlert } from 'lucide-react';

export default function Sidebar() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navigation = [
        { name: 'Command Center', href: '/', icon: LayoutDashboard },
        { name: 'Surveillance Feeds', href: '/#upload', icon: Video },
        { name: 'System Settings', href: '#', icon: Settings },
    ];

    return (
        <div className="flex h-full w-64 flex-col bg-forest-950 border-r border-forest-800">
            <div className="flex h-16 shrink-0 items-center justify-center border-b border-forest-800">
                <div className="flex items-center gap-2 text-forest-500">
                    <ShieldAlert size={24} />
                    <span className="text-lg font-bold tracking-widest text-slate-100">
                        GUARDIAN<span className="text-forest-500">AI</span>
                    </span>
                </div>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto pt-6 px-4">
                <nav className="flex-1 space-y-2">
                    {navigation.map((item) => {
                        // Very naive active state for demo purposes 
                        // In a real router setup, we'd use exact match or nested route active states.
                        const isActive = location.pathname === item.href || (location.pathname === '/' && item.href === '/');
                        return (
                            <a
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-all ${isActive
                                        ? 'bg-forest-800 text-white'
                                        : 'text-forest-300 hover:bg-forest-800/50 hover:text-white'
                                    }`}
                            >
                                <item.icon
                                    className={`h-5 w-5 shrink-0 ${isActive ? 'text-forest-400' : 'text-forest-500 group-hover:text-forest-400'
                                        }`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </a>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t border-forest-800 p-4">
                <div className="flex items-center gap-x-4 mb-4">
                    <div className="h-8 w-8 rounded-full bg-forest-800 flex items-center justify-center text-forest-300 font-bold border border-forest-700">
                        {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white truncate w-32">{user?.full_name || 'Agent Contact'}</span>
                        <span className="text-xs text-forest-400 truncate w-32">{user?.email || 'Secure Channel'}</span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="group flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-forest-300 hover:bg-alert-900/50 hover:text-alert-400 transition-all border border-transparent hover:border-alert-800/50"
                >
                    <LogOut className="h-5 w-5 shrink-0 text-forest-500 group-hover:text-alert-400" aria-hidden="true" />
                    Terminate Connection
                </button>
            </div>
        </div>
    );
}
