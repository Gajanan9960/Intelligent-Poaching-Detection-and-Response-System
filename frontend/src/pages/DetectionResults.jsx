import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/common/Button';
import { StatusBadge, ThreatBadge } from '../components/common/Badge';
import { useVideos } from '../hooks/useVideos';
import {
    ArrowLeft, Video, Crosshair, Clock, ChevronRight,
    AlertTriangle, Shield, Eye, Camera, Maximize, AlertOctagon
} from 'lucide-react';

/**
 * DetectionResults - Full-page view for tracking YOLOv8 inference outputs.
 */
export default function DetectionResults() {
    const { id } = useParams();
    const { videos, loading, error } = useVideos(0);

    const selectedVideo = id ? videos.find(v => (v._id || v.id) === id) : null;

    if (id) {
        if (loading) return (
            <AppLayout title="Forensic Analysis" subtitle="Neural network outputs">
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 border-4 border-emerald-900 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-transparent border-t-emerald-400 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-emerald-400 font-mono tracking-widest uppercase text-sm animate-pulse">Decrypting Analysis...</p>
                </div>
            </AppLayout>
        );

        if (!selectedVideo) return (
            <AppLayout title="Forensic Analysis" subtitle="">
                <div className="p-8 max-w-4xl mx-auto">
                    <div className="bg-red-500/10 border border-red-500/40 text-red-100 rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_40px_rgba(239,68,68,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
                        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Record Not Found</h2>
                        <p className="text-red-200/70 mb-8 max-w-md">The requested surveillance analysis does not exist or has been purged from the active database.</p>
                        <Link to="/detections">
                            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-red-500/30 hover:border-red-500 text-white rounded-full transition-all flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" /> Return to Database
                            </button>
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );

        return <VideoDetailView video={selectedVideo} />;
    }

    // LIST VIEW
    return (
        <AppLayout title="Surveillance Database" subtitle="Complete registry of AI-analyzed footage">
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-100">
                {error === 'backend_offline' && (
                    <div className="bg-orange-500/10 border border-orange-500/40 text-orange-100 rounded-xl p-4 flex gap-4 items-center mb-6">
                        <AlertOctagon className="w-6 h-6 text-orange-400 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-orange-300">Uplink Offline</h4>
                            <p className="text-sm mt-0.5 opacity-80">Cannot connect to the central inference database.</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-white/5 border border-white/5 rounded-3xl animate-pulse"></div>
                        ))}
                    </div>
                ) : videos.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center p-20 text-emerald-400">
                        <Shield className="h-20 w-20 mb-6 opacity-20" />
                        <p className="text-xl font-medium text-white mb-2">Database Empty</p>
                        <p className="text-emerald-100/50 mb-8 max-w-sm text-center">No surveillance footage has been processed by the neural network yet.</p>
                        <Link to="/upload">
                            <button className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-105">
                                Upload First Feed
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map(video => <VideoCard key={video._id || video.id} video={video} />)}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function VideoCard({ video }) {
    const hasCritical = video.detections?.some(d => ['poacher', 'weapon'].includes(d.detected_class?.toLowerCase()));

    return (
        <Link to={`/detections/${video._id || video.id}`} className="block group">
            <div className={`bg-white/5 border rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl ${hasCritical
                    ? 'border-red-500/30 group-hover:border-red-500/60 group-hover:shadow-[0_10px_40px_rgba(239,68,68,0.2)]'
                    : 'border-white/10 group-hover:border-emerald-500/40 group-hover:shadow-[0_10px_40px_rgba(52,211,153,0.1)]'
                }`}>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-3 rounded-2xl flex items-center justify-center ${hasCritical ? 'bg-red-500/20 text-red-400 group-hover:bg-red-500 mt-1 group-hover:text-white' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'} transition-colors`}>
                            {hasCritical ? <AlertTriangle className="h-6 w-6 relative z-10" /> : <Video className="h-6 w-6 relative z-10" />}
                        </div>
                        <StatusBadge status={video.status} />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 truncate">
                        {(video.filename || '').replace(/^[\w-]+_/, '').split('.')[0]}
                    </h3>
                    <p className="text-sm font-mono text-emerald-100/40 mb-6 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(video.uploaded_at).toLocaleDateString()}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6 min-h-[28px]">
                        {[...new Set(video.detections?.map(d => d.detected_class) || [])].slice(0, 3).map(cls => (
                            <ThreatBadge key={cls} label={cls} />
                        ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/70 group-hover:text-emerald-400 transition-colors">
                            {hasCritical ? 'Critical Threats' : 'Clear Scan'}
                        </span>
                        <ChevronRight className="w-5 h-5 text-emerald-500/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── VideoDetailView ──────────────────────────────────────
function VideoDetailView({ video }) {
    const hasCritical = video.detections?.some(d => ['poacher', 'weapon'].includes(d.detected_class?.toLowerCase()));

    return (
        <AppLayout
            title="Forensic Detail"
            subtitle={`${video.filename?.replace(/^[\w-]+_/, '')}`}
            actions={
                <Link to="/detections">
                    <button className="px-4 py-2 bg-black/40 hover:bg-black/80 border border-white/10 rounded-full text-white text-sm font-medium transition-colors flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Registry
                    </button>
                </Link>
            }
        >
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-100">
                {hasCritical && (
                    <div className="bg-red-500/10 border border-red-500 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-[0_0_40px_rgba(239,68,68,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                        <div className="absolute right-0 top-0 w-64 h-64 bg-red-500/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>

                        <div className="p-4 bg-red-500/20 rounded-full shrink-0 relative">
                            <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                        </div>
                        <div className="flex-1 relative z-10 text-center md:text-left">
                            <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Critical Threat Confirmed</h2>
                            <p className="text-red-200/80">YOLOv8 inference has detected unauthorized personnel or weapons in this footage. Field teams have been notified.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Left Panel: Statistics */}
                    <div className="xl:col-span-1 space-y-6">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6">
                            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-6 uppercase tracking-wider">
                                <Crosshair className="h-4 w-4" />
                                Inference Data
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs text-white/40 font-mono mb-1">NETWORK STATUS</p>
                                    <StatusBadge status={video.status} />
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 font-mono mb-1">TIMESTAMP</p>
                                    <p className="text-sm font-medium text-white">{new Date(video.uploaded_at).toLocaleString()}</p>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-xs text-white/40 font-mono mb-1">TOTAL DETECTIONS</p>
                                    <p className={`text-4xl font-bold ${video.detections?.length > 0 ? 'text-white' : 'text-emerald-600'}`}>
                                        {video.detections?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {video.detections?.length > 0 && (
                            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6">
                                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-4 uppercase tracking-wider">
                                    <Target className="h-4 w-4" />
                                    Entities Identified
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {[...new Set(video.detections.map(d => d.detected_class))].map(cls => (
                                        <ThreatBadge key={cls} label={cls} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Frame Previews & Table */}
                    <div className="xl:col-span-3 space-y-8">
                        {/* Frame Previews */}
                        {video.status === 'completed' && video.detections?.length > 0 && (
                            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden p-6">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-6">
                                    <Camera className="h-4 w-4 text-emerald-400" />
                                    Forensic Frames
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {video.detections.slice(0, 3).map((det, i) => {
                                        const isCritical = ['poacher', 'weapon'].includes(det.detected_class?.toLowerCase());
                                        const color = isCritical ? 'border-red-500' : 'border-emerald-500';

                                        return (
                                            <div key={i} className={`relative aspect-video rounded-xl bg-black border border-white/10 overflow-hidden group cursor-pointer hover:scale-[1.02] ${isCritical ? 'hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'} transition-all`}>
                                                {/* Image Placeholder */}
                                                {det.frame_url ? (
                                                    <img src={det.frame_url} alt="Frame" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center opacity-40 bg-[#06140b] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 to-black">
                                                        <Video className="w-8 h-8 text-emerald-500/50" />
                                                    </div>
                                                )}

                                                {/* Simulated Bounding Box */}
                                                <div className="absolute inset-x-8 top-6 bottom-4 border-2 rounded pointer-events-none opacity-80 group-hover:scale-[1.02] transition-transform" style={{ borderColor: isCritical ? '#ef4444' : '#10b981' }}>
                                                    <div className={`absolute -top-4 left-0 px-2 flex items-center gap-1 text-[10px] uppercase font-bold text-white rounded-tr rounded-bl tracking-widest ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                                        {det.detected_class} {(det.confidence * 100).toFixed(0)}%
                                                    </div>
                                                </div>

                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                                    <Maximize className="text-white w-8 h-8 drop-shadow-lg" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                                <h3 className="text-sm font-semibold text-white tracking-widest uppercase">Inference Timeline</h3>
                            </div>

                            {video.status === 'processing' ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-6">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 border-4 border-emerald-900 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-transparent border-t-emerald-400 rounded-full animate-spin"></div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-emerald-400 font-mono tracking-widest text-sm uppercase animate-pulse">Running YOLOv8 Scan</p>
                                        <p className="text-emerald-100/40 text-xs mt-2">Detections will stream here in real-time.</p>
                                    </div>
                                </div>
                            ) : (
                                <DetectionTable detections={video.detections || []} status={video.status} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function DetectionTable({ detections, status }) {
    if (status === 'completed' && detections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
                <Shield className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium text-emerald-100/70">No target entities identified in footage.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-black/40 border-b border-white/10 text-[10px] text-emerald-500/80 font-mono tracking-widest uppercase">
                        <th className="px-6 py-4"># Frame</th>
                        <th className="px-6 py-4">Classification</th>
                        <th className="px-6 py-4 w-48">Confidence Score</th>
                        <th className="px-6 py-4">Timecode</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {detections.map((det, i) => {
                        const isCritical = ['poacher', 'weapon'].includes(det.detected_class?.toLowerCase());
                        const confPct = typeof det.confidence === 'number' ? `${(det.confidence * 100).toFixed(1)}%` : det.confidence || '—';
                        return (
                            <tr key={i} className={`hover:bg-white/5 transition-colors group ${isCritical ? 'bg-red-950/10' : ''}`}>
                                <td className="px-6 py-4 text-emerald-600 font-mono text-xs">{String(i + 1).padStart(3, '0')}</td>
                                <td className="px-6 py-4">
                                    <ThreatBadge label={det.detected_class} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden border border-white/5 relative">
                                            <div
                                                className={`absolute left-0 top-0 h-full rounded-full transition-all ${isCritical ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                                                style={{ width: confPct }}
                                            />
                                        </div>
                                        <span className={`text-xs font-mono w-10 text-right ${isCritical ? 'text-red-400 group-hover:text-red-300' : 'text-emerald-500 group-hover:text-emerald-300'} transition-colors`}>
                                            {confPct}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-emerald-100/50 font-mono text-xs flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    {det.timestamp || '00:00:00'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
