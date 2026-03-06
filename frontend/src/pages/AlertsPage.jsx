import { useState, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/common/Button';
import { StatusBadge, ThreatBadge } from '../components/common/Badge';
import { useVideos } from '../hooks/useVideos';
import { Link } from 'react-router-dom';
import {
    Bell, CheckCircle2, Eye, RefreshCw, Mail,
    AlertTriangle, Shield, SlidersHorizontal, Search, Target
} from 'lucide-react';

export default function AlertsPage() {
    const { videos, loading, error, silentRefetch } = useVideos(20000);
    const [dismissed, setDismissed] = useState(new Set());
    const [emailStatus, setEmailStatus] = useState({}); // { videoId: 'sent' }

    // Filters
    const [confidenceThreshold, setConfidenceThreshold] = useState(50);
    const [selectedClasses, setSelectedClasses] = useState(['poacher', 'weapon', 'animal', 'ranger']);

    const toggleClass = (cls) => {
        setSelectedClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
        );
    };

    // Flatten all detections from all videos into a timeline of events
    const allEvents = useMemo(() => {
        const events = [];
        videos.forEach(video => {
            if (video.status !== 'completed' || !video.detections) return;

            video.detections.forEach((det, idx) => {
                const confPct = typeof det.confidence === 'number' ? det.confidence * 100 : 0;
                const detClass = det.detected_class?.toLowerCase() || 'unknown';

                // Apply Filters
                if (confPct >= confidenceThreshold && selectedClasses.includes(detClass)) {
                    events.push({
                        id: `${video._id || video.id}-${idx}`,
                        videoId: video._id || video.id,
                        videoName: (video.filename || '').replace(/^[\w-]+_/, '').split('.')[0],
                        timestamp: det.timestamp || new Date(video.uploaded_at).toLocaleTimeString(),
                        date: new Date(video.uploaded_at).toLocaleDateString(),
                        uploaded_at: video.uploaded_at,
                        detected_class: detClass,
                        confidence: confPct,
                        isCritical: ['poacher', 'weapon'].includes(detClass)
                    });
                }
            });
        });

        // Sort by most recent
        return events
            .filter(e => !dismissed.has(e.id))
            .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    }, [videos, confidenceThreshold, selectedClasses, dismissed]);

    const criticalCount = allEvents.filter(e => e.isCritical).length;
    const warningCount = allEvents.length - criticalCount;

    const handleDismiss = (id) => setDismissed(prev => new Set(prev).add(id));

    const simulateEmailSent = (id) => {
        setEmailStatus(prev => ({ ...prev, [id]: 'sending' }));
        setTimeout(() => {
            setEmailStatus(prev => ({ ...prev, [id]: 'sent' }));
        }, 1500);
    };

    return (
        <AppLayout
            title="Threat Dispatch center"
            subtitle="Real-time telemetry and aggregated alert dashboard"
            actions={
                <button onClick={silentRefetch} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-emerald-400 transition-colors">
                    <RefreshCw className="h-5 w-5" />
                </button>
            }
        >
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-100">

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <AlertTriangle className="w-24 h-24 text-red-500" />
                        </div>
                        <p className="text-red-400 font-mono text-xs mb-2 tracking-widest uppercase relative z-10">Critical Incidents</p>
                        <p className="text-4xl font-bold text-white relative z-10">{criticalCount}</p>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Target className="w-24 h-24 text-emerald-500" />
                        </div>
                        <p className="text-emerald-400 font-mono text-xs mb-2 tracking-widest uppercase relative z-10">Standard Detections</p>
                        <p className="text-4xl font-bold text-white relative z-10">{warningCount}</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Bell className="w-24 h-24 text-white" />
                        </div>
                        <p className="text-emerald-100/50 font-mono text-xs mb-2 tracking-widest uppercase relative z-10">Total Active Events</p>
                        <p className="text-4xl font-bold text-white relative z-10">{allEvents.length}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Filter Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 sticky top-6 hover:border-emerald-500/30 transition-colors">
                            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-6 uppercase tracking-wider">
                                <SlidersHorizontal className="h-4 w-4" />
                                Telemetry Filters
                            </h3>

                            {/* Class Filters */}
                            <div className="space-y-3 mb-8">
                                <p className="text-xs text-white/40 font-mono tracking-widest uppercase mb-4">Entity Classes</p>
                                {[
                                    { id: 'poacher', label: 'Poacher', color: 'text-red-400', border: 'border-red-500/30 ring-red-500' },
                                    { id: 'weapon', label: 'Weapon', color: 'text-orange-400', border: 'border-orange-500/30 ring-orange-500' },
                                    { id: 'animal', label: 'Animal', color: 'text-emerald-400', border: 'border-emerald-500/30 ring-emerald-500' },
                                    { id: 'ranger', label: 'Ranger', color: 'text-blue-400', border: 'border-blue-500/30 ring-blue-500' },
                                ].map(cls => {
                                    const active = selectedClasses.includes(cls.id);
                                    return (
                                        <button
                                            key={cls.id}
                                            onClick={() => toggleClass(cls.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${active ? `bg-white/10 ${cls.border} ring-1` : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                        >
                                            <span className={`text-sm font-medium ${active ? cls.color : 'text-slate-300'}`}>{cls.label}</span>
                                            {active && <CheckCircle2 className={`h-4 w-4 ${cls.color}`} />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Confidence Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Min. Confidence</p>
                                    <span className="text-emerald-400 font-mono text-xs">{confidenceThreshold}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="95"
                                    step="5"
                                    value={confidenceThreshold}
                                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                                    className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between mt-2 text-[10px] text-white/30 font-mono">
                                    <span>10%</span>
                                    <span>95%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline / Event List */}
                    <div className="lg:col-span-3">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden min-h-[500px]">
                            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                                <h3 className="text-sm font-semibold text-white tracking-widest uppercase flex items-center gap-2">
                                    <Search className="w-4 h-4 text-emerald-400" /> Event Logs
                                </h3>
                                <span className="text-xs text-emerald-500/50 font-mono">{allEvents.length} records found</span>
                            </div>

                            <div className="p-6">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-20 bg-white/5 border border-white/5 rounded-2xl animate-pulse"></div>
                                        ))}
                                    </div>
                                ) : allEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-emerald-500/50">
                                        <Shield className="h-16 w-16 mb-6 opacity-20" />
                                        <p className="text-lg font-medium text-emerald-100/70 mb-2">No Active Alerts</p>
                                        <p className="text-sm">Adjust filters or await new surveillance data.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {allEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all hover:-translate-y-1 ${event.isCritical ? 'bg-red-500/10 border-red-500/30 hover:shadow-[0_10px_30px_rgba(239,68,68,0.1)]' : 'bg-black/40 border-white/5 hover:border-emerald-500/30 hover:shadow-[0_10px_30px_rgba(52,211,153,0.05)]'}`}
                                            >
                                                {/* Left Info */}
                                                <div className="flex items-center gap-4 mb-4 md:mb-0">
                                                    <div className={`p-3 rounded-xl shrink-0 ${event.isCritical ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                        {event.isCritical ? <AlertTriangle className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex gap-2 items-center mb-1">
                                                            <ThreatBadge label={event.detected_class} />
                                                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/50 text-slate-300 border border-white/10">
                                                                {event.confidence.toFixed(1)}% CONF
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-white line-clamp-1">{event.videoName}</p>
                                                        <p className="text-xs text-emerald-100/40 font-mono mt-1">{event.date} • {event.timestamp}</p>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {event.isCritical && (
                                                        <div className="mr-2 hidden md:block">
                                                            {emailStatus[event.id] ? (
                                                                <p className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest ${emailStatus[event.id] === 'sent' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                                                                    <Mail className="h-3 w-3" />
                                                                    {emailStatus[event.id] === 'sent' ? 'Dispatched' : 'Sending...'}
                                                                </p>
                                                            ) : (
                                                                <button
                                                                    onClick={() => simulateEmailSent(event.id)}
                                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                                                                >
                                                                    <Mail className="h-3 w-3" /> Email Alert
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    <Link to={`/detections/${event.videoId}`}>
                                                        <button className="p-2 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/50 rounded-lg transition-all">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </Link>

                                                    <button
                                                        onClick={() => handleDismiss(event.id)}
                                                        className="p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 rounded-lg transition-all"
                                                        title="Dismiss Alert"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
