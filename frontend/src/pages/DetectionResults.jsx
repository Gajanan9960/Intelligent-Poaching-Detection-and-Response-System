import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { StatusBadge, ThreatBadge } from '../components/common/Badge';
import { LoadingRow } from '../components/common/Spinner';
import { useVideos } from '../hooks/useVideos';
import {
    ArrowLeft, Video, Crosshair, Clock, ChevronDown,
    ChevronUp, AlertTriangle, Shield, Eye
} from 'lucide-react';

/**
 * DetectionResults - Full-page view for a single video's detection results.
 * If no ID in params, shows the full list of all detection results.
 */
export default function DetectionResults() {
    const { id } = useParams();
    const { videos, loading, error } = useVideos(0); // no polling on this page
    const [expandedId, setExpandedId] = useState(id || null);

    const selectedVideo = id ? videos.find(v => (v._id || v.id) === id) : null;

    // ─── Single video detail view ─────────────────────────
    if (id) {
        if (loading) return (
            <AppLayout title="Detection Results" subtitle="Analysis output for surveillance footage">
                <LoadingRow message="Loading detection data..." />
            </AppLayout>
        );

        if (!selectedVideo) return (
            <AppLayout title="Detection Results" subtitle="">
                <div className="p-6">
                    <AlertBanner type="warning" title="Video not found" message="This feed may have been deleted or the ID is invalid." />
                    <Link to="/detections" className="mt-4 inline-flex">
                        <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" />Back to All Results</Button>
                    </Link>
                </div>
            </AppLayout>
        );

        return <VideoDetailView video={selectedVideo} />;
    }

    // ─── All detections list view ─────────────────────────
    return (
        <AppLayout title="Detection Results" subtitle="Review all analyzed surveillance footage">
            <div className="p-6 space-y-4 animate-fade-in">
                {error === 'backend_offline' && (
                    <AlertBanner type="warning" title="Backend Offline" message="Cannot load detection data. Check server status." />
                )}

                {loading ? (
                    <LoadingRow message="Loading incident database..." />
                ) : videos.length === 0 ? (
                    <div className="glass-panel rounded-xl flex flex-col items-center justify-center py-20 text-forest-500">
                        <Shield className="h-12 w-12 mb-3 opacity-40" />
                        <p className="text-sm font-medium text-forest-300">No analysis data available</p>
                        <p className="text-xs mt-1 mb-4">Submit footage to begin detection analysis.</p>
                        <Link to="/upload"><Button variant="outline" size="sm">Upload Footage</Button></Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {videos.map(video => (
                            <VideoRow
                                key={video._id || video.id}
                                video={video}
                                expanded={expandedId === (video._id || video.id)}
                                onToggle={() => setExpandedId(prev =>
                                    prev === (video._id || video.id) ? null : (video._id || video.id)
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

// ─── VideoRow - collapsible row in the list ────────────────
function VideoRow({ video, expanded, onToggle }) {
    const hasCritical = video.detections?.some(d => {
        const c = d.detected_class?.toLowerCase();
        return c === 'poacher' || c === 'weapon';
    });

    return (
        <div className={`glass-panel rounded-xl overflow-hidden transition-all ${hasCritical ? 'border-alert-800/40' : ''}`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-4 hover:bg-forest-800/20 transition-colors text-left"
            >
                {hasCritical && (
                    <span className="h-2 w-2 rounded-full bg-alert-500 animate-pulse shrink-0" />
                )}
                <div className="p-2 bg-forest-800/60 rounded-lg shrink-0">
                    <Video className="h-4 w-4 text-forest-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 text-sm truncate">
                        {(video.filename || '').replace(/^[\w-]+_/, '').split('.')[0]}
                    </p>
                    <p className="text-xs text-forest-400">
                        {new Date(video.uploaded_at).toLocaleString()}
                    </p>
                </div>
                <StatusBadge status={video.status} />
                <div className="flex gap-1 ml-2">
                    {[...new Set(video.detections?.map(d => d.detected_class) || [])].slice(0, 3).map(cls => (
                        <ThreatBadge key={cls} label={cls} />
                    ))}
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-forest-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-forest-500 shrink-0" />}
            </button>

            {expanded && (
                <div className="border-t border-forest-800 animate-slide-up">
                    <DetectionTable detections={video.detections || []} status={video.status} />
                    <div className="p-4 flex justify-end">
                        <Link to={`/detections/${video._id || video.id}`}>
                            <Button variant="outline" size="sm">
                                <Eye className="h-3.5 w-3.5" />
                                Full Detail View
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── VideoDetailView - full single-video page ──────────────
function VideoDetailView({ video }) {
    const hasCritical = video.detections?.some(d => {
        const c = d.detected_class?.toLowerCase();
        return c === 'poacher' || c === 'weapon';
    });

    return (
        <AppLayout
            title="Detection Detail"
            subtitle={video.filename?.replace(/^[\w-]+_/, '') || 'Surveillance Feed'}
            actions={
                <Link to="/detections">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </Link>
            }
        >
            <div className="p-6 space-y-5 animate-fade-in">
                {hasCritical && (
                    <AlertBanner
                        type="critical"
                        title="⚠ CRITICAL THREAT DETECTED"
                        message="This footage contains high-confidence detection of poachers or weapons. Immediate response team notification has been dispatched."
                        emailSent={true}
                    />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Summary panel */}
                    <div className="glass-panel rounded-xl p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            <Crosshair className="h-4 w-4 text-forest-400" />
                            Detection Summary
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-forest-400">Status</span>
                                <StatusBadge status={video.status} />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-forest-400">Submitted</span>
                                <span className="text-slate-300 text-xs">
                                    {new Date(video.uploaded_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-forest-400">Total Detections</span>
                                <span className={`font-bold ${video.detections?.length > 0 ? 'text-slate-100' : 'text-forest-600'}`}>
                                    {video.detections?.length ?? 0}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-forest-400">Threat Level</span>
                                <span className={`font-semibold text-xs ${hasCritical ? 'text-alert-400' : 'text-forest-400'}`}>
                                    {hasCritical ? '🔴 CRITICAL' : '🟢 CLEAR'}
                                </span>
                            </div>
                        </div>

                        {/* Unique detection types */}
                        {video.detections?.length > 0 && (
                            <div className="border-t border-forest-800 pt-3">
                                <p className="text-xs text-forest-400 uppercase tracking-wider mb-2">Detected Objects</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[...new Set(video.detections.map(d => d.detected_class))].map(cls => (
                                        <ThreatBadge key={cls} label={cls} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detection table */}
                    <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-forest-800">
                            <h3 className="text-sm font-semibold text-slate-200">Frame-Level Detections</h3>
                        </div>
                        {video.status === 'processing' ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="h-8 w-8 border-4 border-amber-700 border-t-amber-400 rounded-full animate-spin" />
                                <p className="text-amber-400 text-sm font-medium">Model analysis in progress...</p>
                                <p className="text-xs text-forest-400">Results will appear here automatically when complete.</p>
                            </div>
                        ) : (
                            <DetectionTable detections={video.detections || []} status={video.status} />
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ─── DetectionTable - reusable table ──────────────────────
function DetectionTable({ detections, status }) {
    if (status === 'completed' && detections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-forest-500">
                <Shield className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No threats detected in this footage.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Object Type</th>
                        <th>Confidence</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {detections.map((det, i) => {
                        const isCritical = ['poacher', 'weapon'].includes(det.detected_class?.toLowerCase());
                        const conf = typeof det.confidence === 'number'
                            ? `${(det.confidence * 100).toFixed(1)}%`
                            : det.confidence || '—';
                        return (
                            <tr key={i} className={isCritical ? 'bg-alert-950/10' : ''}>
                                <td className="text-forest-600 text-xs w-8">{i + 1}</td>
                                <td>
                                    <ThreatBadge label={det.detected_class} />
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-forest-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isCritical ? 'bg-alert-500' : 'bg-forest-500'}`}
                                                style={{ width: conf }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${isCritical ? 'text-alert-400' : 'text-slate-300'}`}>
                                            {conf}
                                        </span>
                                    </div>
                                </td>
                                <td className="text-forest-400 text-xs">
                                    {det.timestamp ? (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {det.timestamp}
                                        </span>
                                    ) : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
