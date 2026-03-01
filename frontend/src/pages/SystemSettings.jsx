import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { AlertBanner } from '../components/common/AlertBanner';
import { useAuth } from '../context/AuthContext';
import { Settings, ShieldCheck, Bell, Moon, Globe, Save, Key } from 'lucide-react';

export default function SystemSettings() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [darkMode, setDarkMode] = useState(true);
    const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1');
    const [saved, setSaved] = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <AppLayout
            title="System Settings"
            subtitle="Configure your GuardianAI command center preferences"
        >
            <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
                {saved && (
                    <AlertBanner type="success" title="Settings saved successfully" onDismiss={() => setSaved(false)} />
                )}

                {/* Profile section */}
                <section className="glass-panel rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-forest-800 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-forest-400" />
                        <h2 className="text-sm font-semibold text-slate-200">Authentication Profile</h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wider">Field Operative Name</label>
                            <div className="h-10 flex items-center px-3 bg-forest-900/50 rounded-md border border-forest-700/50 text-sm text-slate-200">
                                {user?.full_name || 'Field Agent'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wider">Secure Channel (Email)</label>
                            <div className="h-10 flex items-center px-3 bg-forest-900/50 rounded-md border border-forest-700/50 text-sm text-slate-200">
                                {user?.email || '—'}
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wider">
                                Clearance Level
                            </label>
                            <div className="h-10 flex items-center px-3 bg-forest-900/50 rounded-md border border-forest-700/50 text-sm">
                                <span className="badge badge-green">LEVEL 5 — FULL ACCESS</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* API configuration */}
                <section className="glass-panel rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-forest-800 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-forest-400" />
                        <h2 className="text-sm font-semibold text-slate-200">API Configuration</h2>
                    </div>
                    <form onSubmit={handleSave} className="p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wider">
                                Backend API Endpoint
                            </label>
                            <Input
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                placeholder="http://localhost:8000/api/v1"
                                icon={Globe}
                            />
                            <p className="text-xs text-forest-500 mt-1">
                                Set via <code className="text-forest-400 bg-forest-900 px-1 rounded">VITE_API_URL</code> environment variable for production.
                            </p>
                        </div>
                        <Button type="submit" size="sm">
                            <Save className="h-4 w-4" />
                            Save Configuration
                        </Button>
                    </form>
                </section>

                {/* Preferences */}
                <section className="glass-panel rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-forest-800 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-forest-400" />
                        <h2 className="text-sm font-semibold text-slate-200">Alert Preferences</h2>
                    </div>
                    <div className="p-5 space-y-3">
                        {[
                            {
                                icon: Bell, label: 'System Notifications',
                                desc: 'Receive in-app alerts for threat detections.',
                                value: notifications, onChange: setNotifications
                            },
                            {
                                icon: Key, label: 'Email Alert Dispatch',
                                desc: 'Auto-send email to response team on critical detections.',
                                value: emailAlerts, onChange: setEmailAlerts
                            },
                            {
                                icon: Moon, label: 'Dark Mode',
                                desc: 'Optimized for command center low-light environments.',
                                value: darkMode, onChange: setDarkMode
                            },
                        ].map(({ icon: Icon, label, desc, value, onChange }) => (
                            <div key={label} className="flex items-center justify-between p-4 bg-forest-900/30 rounded-lg border border-forest-800/40 hover:border-forest-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-forest-800/50 rounded-lg text-forest-400">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">{label}</p>
                                        <p className="text-xs text-forest-400">{desc}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={value}
                                    onClick={() => onChange(v => !v)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 ${value ? 'bg-forest-500' : 'bg-forest-800'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
