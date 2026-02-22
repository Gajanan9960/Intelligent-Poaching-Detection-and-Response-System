import { useState } from 'react';
import api from '../api/axios';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function VideoUpload({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage('');
        setError('');
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await api.post('/video/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage('Video uploaded successfully! Processing started.');
            setFile(null);
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            setError('Failed to upload video.');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Upload Surveillance Footage</h3>
            <form onSubmit={handleUpload} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="h-12 w-12 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">
                            {file ? file.name : 'Click to select or drag and drop video file'}
                        </span>
                    </label>
                </div>

                {uploading && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full w-2/3 animate-pulse"></div>
                    </div>
                )}

                {message && (
                    <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" /> {message}
                    </div>
                )}

                {error && (
                    <div className="flex items-center text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" /> {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!file || uploading}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${!file || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {uploading ? 'Uploading...' : 'Upload Video'}
                </button>
            </form>
        </div>
    );
}
