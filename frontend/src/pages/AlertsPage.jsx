import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { AlertBanner } from '../components/common/AlertBanner';
import { Button } from '../components/common/Button';
import { StatusBadge, ThreatBadge } from '../components/common/Badge';
import { LoadingRow } from '../components/common/Spinner';
import { useVideos } from '../hooks/useVideos';
import { Bell, CheckCircle2, Eye, RefreshCw, Mail, AlertTriangle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AlertsPage() {
    const { videos, loading, error, silentRefetch } = useVideos(20000);
    const [dismissed, setDismissed] = useState(new Set());
    const [emailStatus, setEmailStatus] = useState({}); // { videoId: 'sent' }

    // Filter only videos with critical detections that haven't been dismissed
    const alerts = useMemo(() => {
        return videos
            .filter(v => v.status === 'completed' &&
                v.detections?.some(d => {
                    const c = d.detected_class?.toLowerCase();
                    return c === 'poacher' || c === 'weapon';
                })
            )
            .filter(v => !dismissed.has(v._id || v.id))
            .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    }, [videos, dismissed]);

    const warnings = useMemo(() => {
        return videos
            .filter(v => v.status === 'completed' &&
                v.detections?.length > 0 &&
                !v.detections.some(d => {
                    const c = d.detected_class?.toLowerCase();
                    return c === 'poacher' || c === 'weapon';
                })
            )
            .filter(v => !dismissed.has(v._id || v.id))
            .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    }, [videos, dismissed]);

    const handleDismiss = (id) => setDismissed(prev => new Set(prev).add(id));

    const simulateEmailSent = (id) => {
        setEmailStatus(prev => ({ ...prev, [id]: 'sending' }));
        setTimeout(() => {
            setEmailStatus(prev => ({ ...prev, [id]: 'sent' }));
        }, 1500);
    };

    return (
        <AppLayout
            title="Active Alerts"
            subtitle="Threat notification center — review and respond to flagged incidents"
            actions={
                <Button onClick={silentRefetch} variant="ghost" size="icon-sm">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            }
        >
            <div className="p-6 space-y-6 animate-fade-in">
                {/* Summary header */}
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${alerts.length > 0 ? 'bg-alert-950/40 border-alert-800/50 text-alert-300' : 'glass-panel text-forest-300'
                        }`}>
                        <Bell className={`h-4 w-4 ${alerts.length > 0 ? 'text-alert-400' : 'text-forest-400'}`} />
                        <span className="text-sm font-semibold">{alerts.length} Critical</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel text-amber-300 border border-amber-800/30">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-semibold">{warnings.length} Warning</span>
                    </div>
                </div>

                {error === 'backend_offline' && (
                    <AlertBanner type="warning" title="Backend Offline" message="Cannot load alert data. Check server status." />
                )}

                {loading ? (
                    <LoadingRow message="Scanning incident database..." />
                ) : (
                    <>
                        {/* ─── Critical Alerts ─── */}
                        {alerts.length > 0 && (
                            <section>
                                <h2 className="text-sm font-semibold text-alert-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-alert-500 animate-pulse" />
                                    Critical Incidents — Immediate Action Required
                                </h2>
                                <div className="space-y-3">
                                    {alerts.map(video => {
                                        const id = video._id || video.id;
                                        const criticalDets = video.detections?.filter(d => {
                                            const c = d.detected_class?.toLowerCase();
                                            return c === 'poacher' || c === 'weapon';
                                        }) || [];

                                        return (
                                            <div key={id} className="glass-panel rounded-xl border border-alert-800/40 overflow-hidden alert-glow">
                                                <div className="p-4 flex items-start gap-4">
                                                    <div className="p-2 bg-alert-900/50 rounded-lg shrink-0">
                                                        <AlertTriangle className="h-5 w-5 text-alert-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-slate-100">
                                                                {(video.filename || '').replace(/^[\w-]+_/, '').split('.')[0]}
                                                            </p>
                                                            <StatusBadge status={video.status} />
                                                        </div>
                                                        <p className="text-xs text-forest-400 mt-0.5">
                                                            Submitted: {new Date(video.uploaded_at).toLocaleString()}
                                                        </p>
                                                        <div className="flex gap-1.5 flex-wrap mt-2">
                                                            {criticalDets.map((d, i) => (
                                                                <ThreatBadge key={i} label={d.detected_class} />
                                                            ))}
                                                        </div>
                                                        {emailStatus[id] && (
                                                            <p className={`flex items-center gap-1.5 text-xs mt-2 ${emailStatus[id] === 'sent' ? 'text-forest-400' : 'text-amber-400 animate-pulse'
                                                                }`}>
                                                                <Mail className="h-3 w-3" />
                                                                {emailStatus[id] === 'sent' ? 'Response team notified via email.' : 'Sending notification...'}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        {!emailStatus[id] && (
                                                            <Button
                                                                variant="amber"
                                                                size="sm"
                                                                onClick={() => simulateEmailSent(id)}
                                                            >
                                                                <Mail className="h-3.5 w-3.5" />
                                                                Notify Team
                                                            </Button>
                                                        )}
                                                        <Link to={`/detections/${id}`}>
                                                            <Button variant="danger-outline" size="sm">
                                                                <Eye className="h-3.5 w-3.5" />
                                                                Review
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDismiss(id)}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Acknowledge
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ─── Warnings ─── */}
                        {warnings.length > 0 && (
                            <section>
                                <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    Suspicious Activity — Review Recommended
                                </h2>
                                <div className="space-y-2">
                                    {warnings.map(video => {
                                        const id = video._id || video.id;
                                        return (
                                            <div key={id} className="glass-panel rounded-xl border border-amber-900/30 p-4 flex items-center gap-4">
                                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-200 truncate">
                                                        {(video.filename || '').replace(/^[\w-]+_/, '').split('.')[0]}
                                                    </p>
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {[...new Set(video.detections?.map(d => d.detected_class) || [])].map(cls => (
                                                            <ThreatBadge key={cls} label={cls} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Link to={`/detections/${id}`}>
                                                        <Button variant="amber-outline" size="sm">
                                                            <Eye className="h-3.5 w-3.5" />
                                                            Review
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDismiss(id)}>
                                                        Dismiss
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ─── All Clear ─── */}
                        {alerts.length === 0 && warnings.length === 0 && !loading && (
                            <div className="glass-panel rounded-xl flex flex-col items-center justify-center py-20 text-forest-500">
                                <Shield className="h-12 w-12 mb-3 opacity-40" />
                                <p className="text-sm font-medium text-forest-300">All Clear — No Active Threats</p>
                                <p className="text-xs mt-1">Surveillance perimeter is secure. No incidents require attention.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
