import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import VideoUpload from '../components/VideoUpload';
import api from '../api/axios';
import { LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchVideos = async () => {
        try {
            // We need to implement this endpoint in backend
            const response = await api.get('/video/list');
            setVideos(response.data);
        } catch (error) {
            console.error("Failed to fetch videos", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
        const interval = setInterval(fetchVideos, 10000); // Polling for updates
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center">
                        <div className="flex items-center">
                            <ShieldAlert className="h-8 w-8 text-indigo-600" />
                            <span className="ml-2 text-xl font-bold text-gray-900">PoachingDetection</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-700">Welcome, {user?.full_name}</span>
                            <button
                                onClick={logout}
                                className="flex items-center text-gray-500 hover:text-gray-700"
                            >
                                <LogOut className="h-5 w-5 mr-1" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <VideoUpload onUploadSuccess={fetchVideos} />
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Detections & Logs</h3>

                        {loading ? (
                            <p>Loading...</p>
                        ) : videos.length === 0 ? (
                            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                                No videos uploaded yet.
                            </div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {videos.map((video) => (
                                        <li key={video._id || video.id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-indigo-600 truncate">{video.filename}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Status: <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${video.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                video.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {video.status}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-400">{new Date(video.uploaded_at).toLocaleString()}</p>
                                                </div>
                                                {video.detections && video.detections.length > 0 && (
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-900">Detections:</p>
                                                        <div className="flex gap-1 justify-end flex-wrap">
                                                            {video.detections.map((d, i) => (
                                                                <span key={i} className={`text-xs px-2 py-0.5 rounded ${d.detected_class === 'poacher' || d.detected_class === 'weapon' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                                                    }`}>
                                                                    {d.detected_class}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
