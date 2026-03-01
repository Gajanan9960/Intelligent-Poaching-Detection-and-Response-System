import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { StatCard } from '../components/common/StatCard';
import { AlertBanner } from '../components/common/AlertBanner';
import { Button } from '../components/common/Button';
import { StatusBadge, ThreatBadge } from '../components/common/Badge';
import { LoadingRow } from '../components/common/Spinner';
import { useVideos } from '../hooks/useVideos';
import {
    ShieldCheck, AlertTriangle, Video, PawPrint,
    Upload, Eye, RefreshCw, Server, Crosshair, Activity
} from 'lucide-react';

export default function Dashboard() {
    const { videos, loading, error, hasProcessing, silentRefetch } = useVideos(15000);

    // ─── Computed Statistics ───────────────────────────────
    const stats = useMemo(() => {
        const totalVideos = videos.length;
        const totalPoachers = videos.reduce((sum, v) =>
            sum + (v.detections?.filter(d => d.detected_class?.toLowerCase() === 'poacher').length || 0), 0);
        const totalWeapons = videos.reduce((sum, v) =>
            sum + (v.detections?.filter(d => d.detected_class?.toLowerCase() === 'weapon').length || 0), 0);
        const totalAnimals = videos.reduce((sum, v) =>
            sum + (v.detections?.filter(d => {
                const c = d.detected_class?.toLowerCase();
                return c && !['poacher', 'weapon'].includes(c);
            }).length || 0), 0);
        const activeAlerts = videos.filter(v =>
            v.status === 'completed' &&
            v.detections?.some(d => {
                const c = d.detected_class?.toLowerCase();
                return c === 'poacher' || c === 'weapon';
            })
        ).length;

        return { totalVideos, totalPoachers, totalWeapons, totalAnimals, activeAlerts };
    }, [videos]);

    const recentVideos = useMemo(() =>
        [...videos].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)).slice(0, 10)
        , [videos]);

    // ─── Backend offline error ─────────────────────────────
    if (error === 'backend_offline') {
        return (
            <AppLayout title="Command Center" subtitle="Real-time monitoring dashboard">
                <div className="p-8">
                    <AlertBanner
                        type="warning"
                        title="Backend Offline"
                        message="Cannot connect to analysis server. Ensure the backend is running on localhost:8000."
                    />
                    <div className="mt-6 flex items-center gap-3">
                        <Button onClick={silentRefetch} variant="outline">
                            <RefreshCw className="h-4 w-4" />
                            Retry Connection
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            title="Command Center"
            subtitle="Real-time surveillance analytics & threat monitoring"
            actions={
                <Button onClick={silentRefetch} variant="ghost" size="icon-sm" title="Refresh">
                    <RefreshCw className={`h-4 w-4 ${hasProcessing ? 'animate-spin text-amber-500' : ''}`} />
                </Button>
            }
        >
            <div className="p-6 space-y-6">

                {/* Critical alert banner when threats detected */}
                {stats.activeAlerts > 0 && (
                    <AlertBanner
                        type="critical"
                        title={`⚠ THREAT ALERT — ${stats.activeAlerts} incident${stats.activeAlerts > 1 ? 's' : ''} detected`}
                        message="High-confidence detections of poachers or weapons found. Immediate response recommended."
                        emailSent={true}
                    />
                )}

                {/* Processing banner */}
                {hasProcessing && (
                    <AlertBanner
                        type="info"
                        title="Analysis in progress"
                        message="One or more video feeds are currently being processed by the detection model."
                    />
                )}

                {/* ─── Stat Cards ─────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                    <StatCard
                        title="Videos Processed"
                        value={stats.totalVideos}
                        icon={Video}
                        loading={loading}
                        trend={hasProcessing ? 'Analysis running...' : 'All feeds scanned'}
                    />
                    <StatCard
                        title="Poachers Detected"
                        value={stats.totalPoachers}
                        icon={Crosshair}
                        variant={stats.totalPoachers > 0 ? 'critical' : 'default'}
                        loading={loading}
                        trend={stats.totalPoachers > 0 ? 'Immediate attention required' : 'No threats found'}
                    />
                    <StatCard
                        title="Weapons Detected"
                        value={stats.totalWeapons}
                        icon={AlertTriangle}
                        variant={stats.totalWeapons > 0 ? 'critical' : 'default'}
                        loading={loading}
                        trend={stats.totalWeapons > 0 ? 'Flagged for review' : 'Perimeter secure'}
                    />
                    <StatCard
                        title="Animals Detected"
                        value={stats.totalAnimals}
                        icon={PawPrint}
                        variant="info"
                        loading={loading}
                        trend="Wildlife activity logged"
                    />
                </div>

                {/* ─── Main Grid ──────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Quick Actions Panel */}
                    <div className="glass-panel rounded-xl p-5 space-y-3">
                        <h2 className="text-sm font-semibold text-forest-300 uppercase tracking-wider flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Quick Operations
                        </h2>
                        <div className="space-y-2">
                            <Link to="/upload" className="flex items-center gap-3 p-3 rounded-lg hover:bg-forest-800/50 transition-colors group border border-transparent hover:border-forest-700/50">
                                <div className="p-2 bg-forest-800/70 rounded-lg text-forest-400 group-hover:text-forest-300 transition-colors">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">Upload Surveillance Video</p>
                                    <p className="text-xs text-forest-400">Submit footage for AI analysis</p>
                                </div>
                            </Link>
                            <Link to="/detections" className="flex items-center gap-3 p-3 rounded-lg hover:bg-forest-800/50 transition-colors group border border-transparent hover:border-forest-700/50">
                                <div className="p-2 bg-forest-800/70 rounded-lg text-forest-400 group-hover:text-forest-300 transition-colors">
                                    <Eye className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">Review Detection Logs</p>
                                    <p className="text-xs text-forest-400">View all analysis results</p>
                                </div>
                            </Link>
                            <Link to="/alerts" className="flex items-center gap-3 p-3 rounded-lg hover:bg-forest-800/50 transition-colors group border border-transparent hover:border-forest-700/50">
                                <div className={`p-2 rounded-lg transition-colors ${stats.activeAlerts > 0 ? 'bg-alert-900/50 text-alert-400' : 'bg-forest-800/70 text-forest-400'} group-hover:text-forest-300`}>
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">Active Alerts</p>
                                    <p className="text-xs text-forest-400">
                                        {stats.activeAlerts > 0 ? `${stats.activeAlerts} unresolved incident${stats.activeAlerts > 1 ? 's' : ''}` : 'No active threats'}
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* System Status */}
                        <div className="border-t border-forest-800 pt-3 mt-3">
                            <h3 className="text-xs font-semibold text-forest-400 uppercase tracking-wider mb-3">System Status</h3>
                            <div className="space-y-2">
                                {[
                                    { label: 'Detection Model', status: 'online', icon: Server },
                                    { label: 'Alert Engine', status: 'online', icon: ShieldCheck },
                                    { label: 'Video Pipeline', status: hasProcessing ? 'busy' : 'idle', icon: Video },
                                ].map(({ label, status, icon: Icon }) => (
                                    <div key={label} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-forest-400">
                                            <Icon className="h-3 w-3" />
                                            <span>{label}</span>
                                        </div>
                                        <span className={`font-medium ${status === 'online' ? 'text-forest-400' :
                                                status === 'busy' ? 'text-amber-400' : 'text-charcoal-500'
                                            }`}>
                                            {status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Detections Table */}
                    <div className="xl:col-span-2 glass-panel rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-forest-800 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-200">Recent Incident Logs</h2>
                            <Link to="/detections" className="text-xs text-forest-400 hover:text-forest-300 transition-colors">
                                View all →
                            </Link>
                        </div>

                        {loading ? (
                            <LoadingRow message="Decrypting incident logs..." />
                        ) : recentVideos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-forest-500">
                                <ShieldCheck className="h-10 w-10 mb-3 opacity-40" />
                                <p className="text-sm font-medium text-forest-300">Surveillance perimeter is clear</p>
                                <p className="text-xs mt-1">No footage has been submitted for analysis yet.</p>
                                <Link to="/upload" className="mt-4">
                                    <Button variant="outline" size="sm">
                                        <Upload className="h-3.5 w-3.5" />
                                        Upload First Feed
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Feed</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                            <th>Detections</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentVideos.map((video) => {
                                            const hasCritical = video.detections?.some(d => {
                                                const c = d.detected_class?.toLowerCase();
                                                return c === 'poacher' || c === 'weapon';
                                            });
                                            const uniqueClasses = [...new Set(video.detections?.map(d => d.detected_class) || [])];

                                            return (
                                                <tr
                                                    key={video._id || video.id}
                                                    className={hasCritical ? 'bg-alert-950/10' : ''}
                                                >
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            {hasCritical && (
                                                                <span className="h-1.5 w-1.5 rounded-full bg-alert-500 animate-pulse shrink-0" />
                                                            )}
                                                            <span className="truncate max-w-[120px] text-slate-200 font-medium">
                                                                {(video.filename || '').replace(/^[\w-]+_/, '').split('.')[0]}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-forest-400">
                                                        {new Date(video.uploaded_at).toLocaleString(undefined, {
                                                            month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td><StatusBadge status={video.status} /></td>
                                                    <td>
                                                        {uniqueClasses.length > 0 ? (
                                                            <div className="flex gap-1 flex-wrap">
                                                                {uniqueClasses.slice(0, 3).map(cls => (
                                                                    <ThreatBadge key={cls} label={cls} />
                                                                ))}
                                                                {uniqueClasses.length > 3 && (
                                                                    <span className="badge badge-gray">+{uniqueClasses.length - 3}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-forest-600 italic">Clear</span>
                                                        )}
                                                    </td>
                                                    <td className="text-right">
                                                        <Link
                                                            to={`/detections/${video._id || video.id}`}
                                                            className="text-xs text-forest-400 hover:text-forest-300 transition-colors inline-flex items-center gap-1"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            View
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
