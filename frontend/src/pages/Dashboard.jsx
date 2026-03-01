import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import VideoUpload from '../components/VideoUpload';
import DetectionList from '../components/DetectionList';
import api from '../api/axios';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchVideos = async () => {
        try {
            const response = await api.get('/video/list');
            setVideos(response.data);
        } catch (error) {
            console.error("Failed to fetch feeds", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
        const interval = setInterval(fetchVideos, 10000);
        return () => clearInterval(interval);
    }, []);

    // Calculate dynamic stats
    const stats = useMemo(() => {
        const totalVideos = videos.length;
        // Count videos that have at least one critical detection
        const activeAlerts = videos.filter(v =>
            v.status === 'completed' &&
            v.detections?.some(d => d.detected_class.toLowerCase() === 'poacher' || d.detected_class.toLowerCase() === 'weapon')
        ).length;

        const systemStatus = videos.some(v => v.status === 'processing') ? 'Analyzing' : 'Optimal';

        return { totalVideos, activeAlerts, systemStatus };
    }, [videos]);

    return (
        <div className="flex h-screen bg-forest-950 overflow-hidden">
            <Sidebar />

            <div className="flex-1 overflow-auto focus:outline-none relative">
                {/* Background ambient lighting */}
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-forest-800/10 to-transparent pointer-events-none" />

                <main className="flex-1 relative z-10 p-8">
                    {/* Header Row */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-100">Command Center</h1>
                            <p className="text-sm text-forest-300 mt-1">
                                Real-time monitoring and analytics dashboard.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 glass-panel px-4 py-2 rounded-full border border-forest-700/50">
                            <span className="flex h-2 w-2 relative">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${stats.systemStatus === 'Analyzing' ? 'bg-yellow-400' : 'bg-forest-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${stats.systemStatus === 'Analyzing' ? 'bg-yellow-500' : 'bg-forest-500'}`}></span>
                            </span>
                            <span className="text-xs font-medium text-forest-300 tracking-wider uppercase">System Live</span>
                        </div>
                    </div>

                    {/* Stat Cards Grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                        {/* Status Card 1 */}
                        <div className="glass-panel overflow-hidden rounded-xl bg-forest-900/40 p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-forest-800/80 p-3 rounded-lg border border-forest-700/50">
                                    <ShieldCheck className="h-6 w-6 text-forest-400" aria-hidden="true" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="truncate text-sm font-medium text-forest-400">Total Surveillance Videos</dt>
                                        <dd className="mt-1 flex items-baseline">
                                            <div className="text-3xl font-semibold text-slate-100">{stats.totalVideos}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        {/* Status Card 2 */}
                        <div className={`glass-panel overflow-hidden rounded-xl p-5 transition-colors ${stats.activeAlerts > 0 ? 'bg-alert-900/20 border-alert-800/50' : 'bg-forest-900/40'}`}>
                            <div className="flex items-center">
                                <div className={`flex-shrink-0 p-3 rounded-lg border flex items-center justify-center ${stats.activeAlerts > 0 ? 'bg-alert-900/50 border-alert-800/50 text-alert-500 animate-pulse' : 'bg-forest-800/80 border-forest-700/50 text-forest-500'}`}>
                                    <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className={`truncate text-sm font-medium ${stats.activeAlerts > 0 ? 'text-alert-400' : 'text-forest-400'}`}>Threat Anomalies</dt>
                                        <dd className="mt-1 flex items-baseline">
                                            <div className={`text-3xl font-semibold ${stats.activeAlerts > 0 ? 'text-alert-500' : 'text-slate-100'}`}>{stats.activeAlerts}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        {/* Status Card 3 */}
                        <div className="glass-panel overflow-hidden rounded-xl bg-forest-900/40 p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-forest-800/80 p-3 rounded-lg border border-forest-700/50">
                                    <Activity className={`h-6 w-6 ${stats.systemStatus === 'Analyzing' ? 'text-yellow-500' : 'text-forest-400'}`} aria-hidden="true" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="truncate text-sm font-medium text-forest-400">System Stability</dt>
                                        <dd className="mt-1 flex items-baseline">
                                            <div className="text-3xl font-semibold text-slate-100">{stats.systemStatus}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid (Split 1/3 and 2/3) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="upload">
                        {/* Video Upload Section (Left Column) */}
                        <div className="lg:col-span-1 space-y-6 flex flex-col h-full">
                            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 shrink-0">
                                <span className="bg-forest-800 w-1 h-6 rounded-full inline-block"></span>
                                Uplink Module
                            </h2>
                            <div className="glass-panel rounded-xl p-6 flex-1 flex flex-col border border-forest-700/30 shadow-2xl overflow-hidden min-h-[400px]">
                                <VideoUpload onUploadSuccess={fetchVideos} />
                            </div>
                        </div>

                        {/* Detection Results Section (Right Columns) */}
                        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
                            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 shrink-0">
                                <span className="bg-forest-800 w-1 h-6 rounded-full inline-block"></span>
                                Incident Logs
                            </h2>
                            <div className="glass-panel rounded-xl p-0 overflow-auto flex-1 flex flex-col max-h-[600px] border border-forest-700/30 shadow-2xl">
                                <DetectionList videos={videos} loading={loading} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
