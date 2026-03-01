import { useState, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { videoService } from '../api/services';
import {
    UploadCloud, CheckCircle2, AlertTriangle, X,
    FileVideo, Gauge, RefreshCw
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
            // Clear after 4 seconds on success
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
            <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

                {/* Result banners */}
                {result === 'success' && (
                    <AlertBanner
                        type="success"
                        title="Feed transmitted successfully"
                        message="Your video has been queued for analysis. Detection results will appear in the incident logs shortly."
                        emailSent={true}
                        onDismiss={() => setResult(null)}
                    />
                )}
                {result === 'error' && (
                    <AlertBanner
                        type="critical"
                        title="Transmission failed"
                        message={errorMsg}
                        onDismiss={() => { setResult(null); setErrorMsg(''); }}
                    />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Upload Area (left 3 cols) */}
                    <div className="lg:col-span-3">
                        <form onSubmit={handleUpload} className="space-y-4">
                            {/* Drop zone */}
                            {!file ? (
                                <div
                                    className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-12 cursor-pointer transition-all duration-200 min-h-[320px] ${isDragging
                                            ? 'border-forest-400 bg-forest-900/30 scale-[1.01]'
                                            : 'border-forest-700/50 hover:border-forest-600 hover:bg-forest-900/20 bg-forest-950/30'
                                        }`}
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
                                    <div className={`p-5 rounded-2xl mb-5 transition-colors ${isDragging ? 'bg-forest-700' : 'bg-forest-900'}`}>
                                        <UploadCloud className={`h-10 w-10 transition-colors ${isDragging ? 'text-forest-300' : 'text-forest-500'}`} />
                                    </div>
                                    <p className="text-lg font-semibold text-slate-200 mb-2">
                                        {isDragging ? 'Release to upload' : 'Drop video feed here'}
                                    </p>
                                    <p className="text-sm text-forest-400 mb-4">or click to browse files</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {['MP4', 'WebM', 'AVI', 'MOV'].map(f => (
                                            <span key={f} className="badge badge-gray text-[10px] uppercase tracking-wider">{f}</span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-forest-500 mt-3">Max {MAX_SIZE_MB}MB per file</p>

                                    {errorMsg && (
                                        <div className="mt-4 flex items-center gap-2 text-alert-400 text-xs bg-alert-950/50 border border-alert-800/50 rounded-lg px-3 py-2">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            {errorMsg}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Preview area */
                                <div className="glass-panel rounded-2xl overflow-hidden">
                                    <div className="relative bg-black aspect-video flex items-center justify-center">
                                        <video
                                            src={previewUrl}
                                            className="max-h-full max-w-full object-contain"
                                            controls
                                        />
                                        {!uploading && (
                                            <button
                                                type="button"
                                                onClick={clearSelection}
                                                className="absolute top-3 right-3 p-1.5 bg-alert-900/80 hover:bg-alert-700 text-white rounded-full border border-alert-600/50 backdrop-blur-sm transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-forest-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                                                <div className="h-12 w-12 border-4 border-forest-800 border-t-forest-400 rounded-full animate-spin" />
                                                <p className="text-forest-300 font-medium text-sm animate-pulse">
                                                    Encrypting & transmitting...
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* File metadata + upload button */}
                                    <div className="p-4 flex items-center gap-4 bg-forest-900">
                                        <FileVideo className="h-8 w-8 text-forest-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                                            <p className="text-xs text-forest-400">{formatFileSize(file.size)}</p>
                                        </div>
                                        <Button type="submit" disabled={uploading} loading={uploading} className="shrink-0">
                                            <UploadCloud className="h-4 w-4" />
                                            {uploading ? 'Transmitting...' : 'Initiate Scan'}
                                        </Button>
                                    </div>

                                    {/* Progress bar */}
                                    {uploading && (
                                        <div className="px-4 pb-4 bg-forest-900">
                                            <div className="flex justify-between text-xs text-forest-400 mb-1">
                                                <span>Upload progress</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-forest-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!file && !uploading && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadCloud className="h-4 w-4" />
                                    Browse Files
                                </Button>
                            )}
                        </form>
                    </div>

                    {/* Info Panel (right 2 cols) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="glass-panel rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-forest-400" />
                                Detection Capabilities
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Poacher Detection', desc: 'Human presence in restricted zones', color: 'text-alert-400' },
                                    { label: 'Weapon Identification', desc: 'Firearms, traps & snares detection', color: 'text-alert-400' },
                                    { label: 'Wildlife Tracking', desc: 'Animal species identification', color: 'text-forest-400' },
                                    { label: 'Vehicle Detection', desc: 'Unauthorized vehicle tracking', color: 'text-amber-400' },
                                ].map(({ label, desc, color }) => (
                                    <div key={label} className="flex gap-3">
                                        <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{label}</p>
                                            <p className="text-xs text-forest-400">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-panel rounded-xl p-5 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-200">Processing Pipeline</h3>
                            <ol className="space-y-2">
                                {[
                                    'Video uploaded & encrypted',
                                    'Frame extraction & preprocessing',
                                    'YOLOv8 detection model inference',
                                    'Threat classification & scoring',
                                    'Alert triggered if threats found',
                                    'Results stored & indexed',
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start gap-3 text-xs text-forest-400">
                                        <span className="shrink-0 h-4.5 w-4.5 rounded-full bg-forest-800 border border-forest-700 flex items-center justify-center text-[10px] font-bold text-forest-300">
                                            {i + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
