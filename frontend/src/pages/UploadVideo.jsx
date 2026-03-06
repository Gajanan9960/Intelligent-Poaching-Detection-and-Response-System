import { useState, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { videoService } from '../api/services';
import {
    UploadCloud, CheckCircle2, AlertTriangle, X,
    FileVideo, Activity, Target
} from 'lucide-react';

const MAX_SIZE_MB = 200;
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/quicktime'];

export default function UploadVideo() {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null); // 'success' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    const fileInputRef = useRef(null);

    // ─── File validation ──────────────────────────────────
    const validateAndSetFile = (selected) => {
        setResult(null);
        setErrorMsg('');

        if (!selected) return;

        if (!ACCEPTED_TYPES.includes(selected.type)) {
            setErrorMsg('Invalid file type. Please upload a video file (MP4, WebM, OGG, AVI, MOV).');
            return;
        }

        if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
            setErrorMsg(`File size exceeds ${MAX_SIZE_MB}MB limit.`);
            return;
        }

        setFile(selected);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(selected));
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        validateAndSetFile(e.dataTransfer.files[0]);
    };

    const clearSelection = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setResult(null);
        setErrorMsg('');
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Upload handler ───────────────────────────────────
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setResult(null);

        try {
            await videoService.upload(file, (pct) => setProgress(pct));
            setProgress(100);
            setResult('success');
            setTimeout(clearSelection, 4000);
        } catch (err) {
            const msg = err.code === 'ERR_NETWORK'
                ? 'Cannot reach analysis server. Ensure the backend is running.'
                : err.response?.data?.detail || 'Upload failed. Please try again.';
            setErrorMsg(msg);
            setResult('error');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <AppLayout
            title="Upload Surveillance Footage"
            subtitle="Submit video feeds for AI-powered threat detection analysis"
        >
            <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in text-slate-100">

                {/* Result banners */}
                {result === 'success' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-100 rounded-xl p-4 flex gap-4 items-start shadow-[0_0_20px_rgba(52,211,153,0.15)]">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-emerald-300">Feed transmitted successfully</h4>
                            <p className="text-sm mt-1 opacity-80">Your video has been queued for analysis. Results will appear in the incident logs.</p>
                        </div>
                        <button onClick={() => setResult(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="w-5 h-5" /></button>
                    </div>
                )}
                {result === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-100 rounded-xl p-4 flex gap-4 items-start shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-red-300">Transmission failed</h4>
                            <p className="text-sm mt-1 opacity-80">{errorMsg}</p>
                        </div>
                        <button onClick={() => { setResult(null); setErrorMsg(''); }} className="ml-auto opacity-60 hover:opacity-100"><X className="w-5 h-5" /></button>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Upload Area (2 columns) */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleUpload}>
                            {!file ? (
                                <div
                                    className={`relative rounded-3xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center text-center p-12 cursor-pointer transition-all duration-300 min-h-[400px] ${isDragging
                                        ? 'border-emerald-400 bg-emerald-900/20 scale-[1.02] shadow-[0_0_40px_rgba(52,211,153,0.15)]'
                                        : 'border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-emerald-900/10'
                                        } backdrop-blur-sm`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    role="button"
                                    aria-label="Upload video"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => validateAndSetFile(e.target.files[0])}
                                    />
                                    <div className={`p-6 rounded-3xl mb-6 transition-colors shadow-inner ${isDragging ? 'bg-emerald-500/20' : 'bg-black/20'}`}>
                                        <UploadCloud className={`h-12 w-12 transition-colors ${isDragging ? 'text-emerald-300' : 'text-emerald-500/70'}`} />
                                    </div>
                                    <p className="text-xl font-medium text-white mb-2">
                                        {isDragging ? 'Release to encrypt & upload' : 'Drag & drop drone footage here'}
                                    </p>
                                    <p className="text-sm text-emerald-100/50 mb-6">or click to browse your encrypted drives</p>

                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {['MP4', 'WebM', 'AVI', 'MOV'].map(f => (
                                            <span key={f} className="px-3 py-1 bg-black/30 border border-white/5 rounded-full text-[10px] uppercase font-bold tracking-widest text-emerald-400/70">{f}</span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-white/30 mt-6 font-mono">MAX_PAYLOAD: {MAX_SIZE_MB}MB</p>

                                    {errorMsg && (
                                        <div className="absolute bottom-4 mx-auto flex items-center gap-2 text-red-400 text-xs bg-red-950/50 border border-red-800/50 rounded-full px-4 py-2">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            {errorMsg}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                                    <div className="relative bg-[#020804] aspect-video flex items-center justify-center border-b border-white/10">
                                        <video
                                            src={previewUrl}
                                            className="h-full w-full object-contain"
                                            controls
                                        />
                                        {!uploading && (
                                            <button
                                                type="button"
                                                onClick={clearSelection}
                                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white/70 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-all hover:scale-105"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-[#06140b]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-10">
                                                <div className="relative w-16 h-16">
                                                    <div className="absolute inset-0 border-4 border-emerald-900 rounded-full"></div>
                                                    <div className="absolute inset-0 border-4 border-transparent border-t-emerald-400 rounded-full animate-spin"></div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-emerald-400 font-mono text-sm tracking-wider uppercase mb-2 animate-pulse">Running Neural Analysis...</p>
                                                    <p className="text-emerald-100/50 text-xs font-mono">{progress}% COMPLETED</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 flex items-center gap-5 bg-black/20">
                                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                            <FileVideo className="h-6 w-6 text-emerald-400 shrink-0" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                                            <p className="text-xs text-emerald-400/70 font-mono mt-1">{formatFileSize(file.size)}</p>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={uploading}
                                            className={`px-6 py-3 rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center gap-2 ${uploading ? 'bg-emerald-800 text-emerald-400/50 cursor-not-allowed hidden' : 'bg-emerald-500 hover:bg-emerald-400 text-[#020804] hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.5)]'}`}
                                        >
                                            <Activity className="w-4 h-4" />
                                            Start YOLOv8 Scan
                                        </button>
                                    </div>

                                    {uploading && (
                                        <div className="px-6 pb-6 bg-black/20">
                                            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-green-300 rounded-full transition-all duration-300 relative"
                                                    style={{ width: `${progress}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 w-1/2 rounded-full blur-[2px] right-0 translate-x-1/2"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!file && !uploading && (
                                <div className="mt-6 flex justify-center">
                                    <button
                                        type="button"
                                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-medium text-emerald-100/70 hover:text-white transition-all backdrop-blur-md flex items-center gap-2"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <UploadCloud className="h-4 w-4" />
                                        Manual Selection
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Right: Info Panel (1 column) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute -inset-24 bg-gradient-to-br from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl z-0"></div>

                            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-6 tracking-wide uppercase relative z-10">
                                <Target className="h-4 w-4 text-emerald-400" />
                                Inference Model
                            </h3>

                            <div className="space-y-5 relative z-10">
                                {[
                                    { label: 'Poacher Detection', desc: 'Identifies unauthorized human presence', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                                    { label: 'Weapon Identification', desc: 'Rifles, snares & traps', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                                    { label: 'Wildlife Tracking', desc: 'Species cataloging & counting', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                    { label: 'Ranger Recognition', desc: 'Friendly personnel identification', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                ].map(({ label, desc, color, bg, border }) => (
                                    <div key={label} className="flex gap-4 items-start">
                                        <div className={`p-2 rounded-lg ${bg} ${border} border`}>
                                            <CheckCircle2 className={`h-4 w-4 ${color}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white mb-0.5">{label}</p>
                                            <p className="text-xs text-emerald-100/50 leading-relaxed">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-black/20 border border-emerald-900/30 rounded-3xl p-6">
                            <h3 className="text-xs font-mono tracking-widest text-emerald-400/50 uppercase mb-4">Pipeline Status</h3>
                            <div className="relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500/20 before:to-transparent">
                                {[
                                    'Secure Upload',
                                    'Frame Extraction',
                                    'YOLOv8 Inference',
                                    'Alert Dispatch',
                                ].map((step, i) => (
                                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-6 last:mb-0">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-emerald-500/30 bg-black text-emerald-400/50 group-hover:text-emerald-400 group-hover:border-emerald-400 shadow-[0_0_0_4px_rgba(6,20,11,1)] z-10 font-mono text-[10px] transition-colors">
                                            {i + 1}
                                        </div>
                                        <div className="w-[calc(100%-3rem)] text-xs text-emerald-100/40 group-hover:text-emerald-100/80 transition-colors ml-4 font-medium uppercase tracking-wider">
                                            {step}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
