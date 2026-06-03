import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/common/Button';
import { StatusBadge, ThreatBadge } from '../components/common/Badge';
import { useVideos } from '../hooks/useVideos';
import { videoService } from '../api/services';
import {
    ArrowLeft, ImageIcon, Crosshair, Target, Clock, ChevronRight,
    AlertTriangle, Shield, Eye, Camera, Maximize, AlertOctagon
} from 'lucide-react';

/**
 * DetectionResults - Full-page view for tracking YOLOv8 inference outputs.
 */
export default function DetectionResults() {
    const { id } = useParams();
    const location = useLocation();
    const { videos, loading, error, clearAll } = useVideos(0);
    
    // Check for ?filter=... in the URL
    const searchParams = new URLSearchParams(location.search);
    const initialFilter = searchParams.get('filter') || 'All';
    const [filterClass, setFilterClass] = useState(initialFilter);

    // If the URL changes while we are on the page, update the filter
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filter = params.get('filter') || 'All';
        setFilterClass(filter);
    }, [location.search]);

    const availableClasses = useMemo(() => {
        return ['All', 'Animal', 'poacher', 'Ranger', 'Weapons'];
    }, []);

    const filteredVideos = useMemo(() => {
        if (filterClass === 'All') return videos;
        const targetCls = filterClass === 'Weapons' ? 'weapon' : filterClass.toLowerCase();

        return videos.filter(v => 
            v.detections?.some(d => {
                let cls = (d.detected_class || d.object_type || '').toLowerCase();
                if (cls === 'weapons') cls = 'weapon';
                return cls === targetCls;
            })
        );
    }, [videos, filterClass]);

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
        <AppLayout title="Surveillance Database" subtitle="Complete registry of AI-analyzed images">
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

                {/* ─── Clear All Button ─── */}
                {!loading && videos.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={async () => {
                                if (window.confirm("WARNING: Are you sure you want to permanently delete all detection records? This cannot be undone.")) {
                                    await clearAll();
                                }
                            }}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-full text-sm font-semibold transition-all border border-red-500/20 hover:border-red-500/40 flex items-center gap-2"
                        >
                            <AlertOctagon className="w-4 h-4" /> Clear All Detections
                        </button>
                    </div>
                )}

                {/* ─── Filter UI ─── */}
                {!loading && videos.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md gap-4">
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                            <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider shrink-0">Filter Threat:</span>
                            <div className="flex gap-2">
                                {availableClasses.map(cls => {
                                    return (
                                    <button
                                        key={cls}
                                        onClick={() => setFilterClass(cls)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filterClass === cls 
                                            ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(52,211,153,0.4)]' 
                                            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'}`}
                                    >
                                        {cls}
                                    </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="text-sm text-emerald-100/50 font-mono shrink-0 pl-2">
                            Showing {filteredVideos.length} of {videos.length}
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
                        <p className="text-emerald-100/50 mb-8 max-w-sm text-center">No surveillance images have been processed by the neural network yet.</p>
                        <Link to="/upload">
                            <button className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-105">
                                Upload First Image
                            </button>
                        </Link>
                    </div>
                ) : filteredVideos.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center p-20 text-emerald-400">
                        <Target className="h-20 w-20 mb-6 opacity-20" />
                        <p className="text-xl font-medium text-white mb-2">No Matches Found</p>
                        <p className="text-emerald-100/50 mb-8 max-w-sm text-center">There are no detections matching the filter "{filterClass}".</p>
                        <button onClick={() => setFilterClass('All')} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-105">
                            Clear Filter
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVideos.map(video => <VideoCard key={video._id || video.id} video={video} />)}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function VideoCard({ video }) {
    const hasRanger = video.detections?.some(d => (d.detected_class || d.object_type)?.toLowerCase() === 'ranger');
    const hasCritical = video.detections?.some(d => {
        const cls = (d.detected_class || d.object_type)?.toLowerCase();
        if (cls === 'poacher') return true;
        if (cls === 'weapon' && !hasRanger) return true;
        return false;
    });

    return (
        <Link to={`/detections/${video._id || video.id}`} className="block group">
            <div className={`bg-white/5 border rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl ${hasCritical
                ? 'border-red-500/30 group-hover:border-red-500/60 group-hover:shadow-[0_10px_40px_rgba(239,68,68,0.2)]'
                : 'border-white/10 group-hover:border-emerald-500/40 group-hover:shadow-[0_10px_40px_rgba(52,211,153,0.1)]'
                }`}>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-3 rounded-2xl flex items-center justify-center ${hasCritical ? 'bg-red-500/20 text-red-400 group-hover:bg-red-500 mt-1 group-hover:text-white' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'} transition-colors`}>
                            {hasCritical ? <AlertTriangle className="h-6 w-6 relative z-10" /> : <ImageIcon className="h-6 w-6 relative z-10" />}
                        </div>
                        <StatusBadge status={video.status} />
                    </div>

                    {/* Image Preview Thumbnail */}
                    <div className="w-full h-32 mb-4 rounded-xl overflow-hidden bg-black/40 border border-white/5 relative">
                        {video.image_url ? (
                            <img 
                                src={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${video.image_url}`} 
                                alt={video.filename} 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-emerald-500/20">
                                <ImageIcon className="h-8 w-8" />
                            </div>
                        )}
                        {hasCritical && <div className="absolute inset-0 ring-2 ring-inset ring-red-500/50 rounded-xl pointer-events-none" />}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 truncate" title={video.filename}>
                        {(video.filename || '').replace(/^[\w-]+_/, '').split('.')[0]}
                    </h3>
                    <p className="text-sm font-mono text-emerald-100/40 mb-6 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(video.uploaded_at).toLocaleDateString()}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6 min-h-[28px]">
                        {[...new Set(video.detections?.map(d => d.detected_class || d.object_type) || [])].slice(0, 3).map(cls => (
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
    const navigate = useNavigate();
    const hasRanger = video.detections?.some(d => (d.detected_class || d.object_type)?.toLowerCase() === 'ranger');
    const hasCritical = video.detections?.some(d => {
        const cls = (d.detected_class || d.object_type)?.toLowerCase();
        if (cls === 'poacher') return true;
        if (cls === 'weapon' && !hasRanger) return true;
        return false;
    });
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
    const imageUrl = video.image_url ? `${apiBase}${video.image_url}` : null;

    return (
        <AppLayout
            title="Forensic Detail"
            subtitle={`${video.filename?.replace(/^[\w-]+_/, '')}`}
        >
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-100">
                {/* ─── Back Navigation Bar ─── */}
                <div className="flex items-center gap-4">
                    <Link to="/detections" className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400 rounded-full text-emerald-300 hover:text-white text-sm font-medium transition-all flex items-center gap-2 shadow-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Detection Results
                    </Link>
                </div>

                {hasCritical && (
                    <div className="bg-red-500/10 border border-red-500 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-[0_0_40px_rgba(239,68,68,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                        <div className="absolute right-0 top-0 w-64 h-64 bg-red-500/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>

                        <div className="p-4 bg-red-500/20 rounded-full shrink-0 relative">
                            <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                        </div>
                        <div className="flex-1 relative z-10 text-center md:text-left">
                            <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Critical Threat Confirmed</h2>
                            <p className="text-red-200/80">YOLOv8 inference has detected unauthorized personnel or weapons in this image. Field teams have been notified.</p>
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
                                    {[...new Set(video.detections.map(d => d.detected_class || d.object_type))].map(cls => (
                                        <ThreatBadge key={cls} label={cls} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Image Preview, Frame Previews & Table */}
                    <div className="xl:col-span-3 space-y-8">
                        {/* ─── Original Uploaded Image Preview ─── */}
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Camera className="h-4 w-4 text-emerald-400" />
                                    Uploaded Surveillance Image
                                </h3>
                                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400/60 bg-emerald-500/10 px-3 py-1 rounded-full">
                                    {video.filename?.split('.').pop()?.toUpperCase() || 'IMG'}
                                </span>
                            </div>
                            <div className="bg-[#020804] flex items-center justify-center min-h-[300px] max-h-[500px]">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={video.filename || 'Uploaded image'}
                                        className="w-full h-full object-contain max-h-[500px]"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-emerald-500/40">
                                        <ImageIcon className="w-16 h-16 mb-3" />
                                        <p className="text-sm font-mono">Image preview not available</p>
                                        <p className="text-xs text-emerald-600/50 mt-1">Upload a new image to see the preview</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detection Frames */}
                        {video.status === 'completed' && video.detections?.length > 0 && (
                            <DetectionOverlaysGrid video={video} apiBase={apiBase} imageUrl={imageUrl} hasRanger={hasRanger} />
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
                                    <button 
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to cancel this scan?')) {
                                                try {
                                                    await videoService.delete(video.id || video._id);
                                                    navigate('/detections');
                                                } catch (e) {
                                                    console.error('Failed to cancel scan:', e);
                                                }
                                            }
                                        }}
                                        className="mt-4 px-6 py-2 border border-red-500/50 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-full text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                                    >
                                        <AlertTriangle className="w-4 h-4" /> Cancel Scan
                                    </button>
                                </div>
                            ) : (
                                <DetectionTimeline detections={video.detections || []} status={video.status} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function DetectionTimeline({ detections, status }) {
    const hasRanger = detections.some(d => (d.detected_class || d.object_type)?.toLowerCase() === 'ranger');

    if (status === 'completed' && detections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
                <Shield className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium text-emerald-100/70">No target entities identified in footage.</p>
            </div>
        );
    }

    return (
        <div className="p-6 relative">
            <div className="absolute left-[39px] top-6 bottom-6 w-px bg-forest-800/50" />

            <div className="space-y-6">
                {detections.map((det, i) => {
                    const detClass = det.detected_class || det.object_type;
                    const detConf = det.confidence || det.confidence_score;
                    const isCritical = detClass?.toLowerCase() === 'poacher' || 
                                       (detClass?.toLowerCase() === 'weapon' && !hasRanger);
                    const confPct = typeof detConf === 'number' ? `${(detConf * 100).toFixed(0)}%` : detConf || '—';

                    return (
                        <div key={i} className="relative flex items-start gap-6 group hover:bg-white/5 p-3 -mx-3 rounded-xl transition-colors cursor-pointer">
                            {/* Timeline Node */}
                            <div className="relative z-10 flex flex-col items-center mt-1 w-8 shrink-0">
                                <div className={`h-3 w-3 rounded-full border-2 border-[#06140b] ${isCritical ? 'bg-alert-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] scale-125' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                    } transition-transform group-hover:scale-150`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono text-sm px-2 py-0.5 rounded ${isCritical ? 'bg-alert-500/10 text-alert-400' : 'bg-emerald-500/10 text-emerald-400'
                                            }`}>
                                            {det.timestamp || det.detected_at || '00:00:00'}
                                        </span>
                                        <ThreatBadge label={detClass} />
                                    </div>
                                        <span className="text-xs text-forest-400 font-mono hidden sm:block">
                                        CONF: {confPct}
                                    </span>
                                </div>

                                <p className={`text-sm ${isCritical ? 'text-alert-100 font-medium' : 'text-slate-300'}`}>
                                    {detClass === 'poacher' ? 'Suspicious human signature detected in sector.' :
                                        detClass === 'weapon' ? 'Weapon signature detected → ALERT SENT' :
                                        detClass === 'ranger' ? 'Ranger/patrol unit identified in vicinity.' :
                                        detClass === 'animal' ? 'Wildlife movement registered — species tracked.' :
                                            `${detClass} detected in surveillance feed.`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DetectionOverlaysGrid({ video, apiBase, imageUrl, hasRanger }) {
    const [enlargedIndex, setEnlargedIndex] = useState(null);
    const hoverTimeouts = useRef({});

    const handleMouseEnter = (index) => {
        // Clear any existing timeout for this index just in case
        if (hoverTimeouts.current[index]) clearTimeout(hoverTimeouts.current[index]);
        
        // Set a new timeout to enlarge the image after 2 seconds
        hoverTimeouts.current[index] = setTimeout(() => {
            setEnlargedIndex(index);
        }, 2000);
    };

    const handleMouseLeave = (index) => {
        // Clear the timeout if the user stops hovering before 2 seconds
        if (hoverTimeouts.current[index]) {
            clearTimeout(hoverTimeouts.current[index]);
            delete hoverTimeouts.current[index];
        }
    };

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (enlargedIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [enlargedIndex]);

    return (
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden p-6 relative">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-6">
                <Eye className="h-4 w-4 text-emerald-400" />
                Detection Overlays
                <span className="ml-2 text-xs text-emerald-500/50 font-normal">(Hover & hold 2s to enlarge)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {video.detections.slice(0, 6).map((det, i) => {
                    const detClass = det.detected_class || det.object_type;
                    const detConf = det.confidence || det.confidence_score;
                    const isCritical = detClass?.toLowerCase() === 'poacher' || 
                                       (detClass?.toLowerCase() === 'weapon' && !hasRanger);
                    const detImageUrl = (det.image_url || det.frame_image_path) ? `${apiBase}${det.image_url || det.frame_image_path}` : null;
                    const activeImage = detImageUrl || imageUrl;

                    return (
                        <div 
                            key={i} 
                            onMouseEnter={() => handleMouseEnter(i)}
                            onMouseLeave={() => handleMouseLeave(i)}
                            onClick={() => setEnlargedIndex(i)}
                            className={`relative aspect-video rounded-xl bg-black border border-white/10 overflow-hidden group cursor-pointer hover:scale-[1.02] ${isCritical ? 'hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'} transition-all`}
                        >
                            {activeImage ? (
                                <img src={activeImage} alt="Detection" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-40 bg-[#06140b] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 to-black">
                                    <ImageIcon className="w-8 h-8 text-emerald-500/50" />
                                </div>
                            )}

                            {/* Bounding Box Info */}
                            <div className="absolute inset-x-8 top-6 bottom-4 border-2 rounded pointer-events-none opacity-80 group-hover:scale-[1.02] transition-transform" style={{ borderColor: isCritical ? '#ef4444' : '#10b981' }}>
                                <div className={`absolute -top-4 left-0 px-2 flex items-center gap-1 text-[10px] uppercase font-bold text-white rounded-tr rounded-bl tracking-widest ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                    {detClass} {(detConf * 100).toFixed(0)}%
                                </div>
                            </div>

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                <Maximize className="text-white w-8 h-8 drop-shadow-lg" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal for Enlarged View */}
            {enlargedIndex !== null && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 cursor-zoom-out animate-fade-in"
                    onClick={() => setEnlargedIndex(null)}
                >
                    {(() => {
                        const det = video.detections[enlargedIndex];
                        const detClass = det.detected_class || det.object_type;
                        const detConf = det.confidence || det.confidence_score;
                        const detImageUrl = (det.image_url || det.frame_image_path) ? `${apiBase}${det.image_url || det.frame_image_path}` : null;
                        const activeImage = detImageUrl || imageUrl;
                        const isCritical = detClass?.toLowerCase() === 'poacher' || 
                                           (detClass?.toLowerCase() === 'weapon' && !hasRanger);

                        return (
                            <div className="relative max-w-7xl max-h-[90vh] w-full flex flex-col items-center justify-center pointer-events-none">
                                <div 
                                    className="absolute -top-12 left-0 right-0 flex justify-between items-center px-4 pointer-events-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2 ${isCritical ? 'bg-red-600/80 border border-red-500' : 'bg-emerald-600/80 border border-emerald-500'}`}>
                                        {isCritical ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                        {detClass} - {(detConf * 100).toFixed(1)}% Confidence
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEnlargedIndex(null);
                                        }}
                                        className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-md transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft className="w-5 h-5 rotate-180" />
                                    </button>
                                </div>
                                
                                <div 
                                    className="w-full h-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {activeImage && (
                                        <img 
                                            src={activeImage} 
                                            alt="Enlarged Detection" 
                                            className="w-auto h-auto max-w-full max-h-[85vh] object-contain bg-black border-2 border-white/10 rounded-2xl" 
                                        />
                                    )}
                                </div>
                                <p className="text-white/50 text-sm mt-4 tracking-widest uppercase font-mono drop-shadow-md pointer-events-auto">Click anywhere outside to close</p>
                            </div>
                        );
                    })()}
                </div>,
                document.body
            )}
        </div>
    );
}
