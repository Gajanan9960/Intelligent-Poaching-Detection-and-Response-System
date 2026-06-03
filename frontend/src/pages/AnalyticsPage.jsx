import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { detectionService } from '../api/services';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, Crosshair, ArrowLeft, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { toast } from 'react-toastify';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#ec4899'];

const AnalyticsPage = () => {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDetections();
  }, []);

  const fetchDetections = async () => {
    try {
      const response = await detectionService.list();
      setDetections(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      toast.error('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  // --- Data Processing for Charts ---
  
  // 1. Detection Types (Pie Chart)
  const getDetectionTypeData = () => {
    const counts = {};
    detections.forEach(det => {
      const type = det.object_type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  };

  // 2. Detections Over Time (Bar Chart)
  const getDetectionsOverTimeData = () => {
    const dates = {};
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates[dateString] = { name: dateString, Animals: 0, Poachers: 0, Weapons: 0 };
    }

    detections.forEach(det => {
      const d = new Date(det.detected_at);
      const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (dates[dateString]) {
        const type = det.object_type;
        if (type && type.toLowerCase().includes('animal')) {
          dates[dateString].Animals += 1;
        } else if (type && (type.toLowerCase().includes('poacher') || type.toLowerCase().includes('person'))) {
          dates[dateString].Poachers += 1;
        } else if (type && type.toLowerCase().includes('weapon')) {
          dates[dateString].Weapons += 1;
        }
      }
    });

    return Object.values(dates);
  };

  const pieData = getDetectionTypeData();
  const barData = getDetectionsOverTimeData();

  const totalDetections = detections.length;
  const poachersCount = detections.filter(a => a.object_type?.toLowerCase().includes('poacher') || a.object_type?.toLowerCase().includes('person')).length;
  const weaponsCount = detections.filter(a => a.object_type?.toLowerCase().includes('weapon')).length;

  return (
    <AppLayout
      title="System Analytics"
      subtitle="Insights and trends from GuardianAI detections"
    >
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-100">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400 rounded-full text-emerald-300 hover:text-white text-sm font-medium transition-all flex items-center gap-2 shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 flex items-center space-x-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(59,130,246,0.15)] hover:border-blue-500/40 group">
            <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">Total Detections</p>
              <h3 className="text-4xl font-bold text-white">{loading ? '-' : totalDetections}</h3>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 flex items-center space-x-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(239,68,68,0.15)] hover:border-red-500/40 group">
            <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">Poacher Detections</p>
              <h3 className="text-4xl font-bold text-white">{loading ? '-' : poachersCount}</h3>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 flex items-center space-x-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 group">
            <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Crosshair className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">Weapon Detections</p>
              <h3 className="text-4xl font-bold text-white">{loading ? '-' : weaponsCount}</h3>
            </div>
          </div>
        </div>

        {/* Strategic Insights */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden p-6 relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 transition-colors group-hover:bg-emerald-400"></div>
            <h3 className="text-sm font-semibold text-emerald-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Strategic Insights & Trend Analysis
            </h3>
            <div className="text-slate-300 text-lg font-light leading-relaxed">
                {loading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-3 bg-white/10 rounded w-3/4"></div>
                            <div className="h-3 bg-white/10 rounded w-5/6"></div>
                            <div className="h-3 bg-white/10 rounded w-1/2"></div>
                        </div>
                    </div>
                ) : detections.length === 0 ? (
                    <p className="text-emerald-500/50 italic font-mono text-sm">Awaiting sufficient surveillance data to generate trend analysis.</p>
                ) : (
                    <p>
                        {(() => {
                            const types = [...pieData].sort((a, b) => b.value - a.value);
                            const mostCommon = types.length > 0 ? types[0].name : "Unknown";
                            const recentData = barData[barData.length - 1];
                            const todayTotal = recentData.Animals + recentData.Poachers + recentData.Weapons;
                            const pastAvg = barData.slice(0, 6).reduce((acc, curr) => acc + curr.Animals + curr.Poachers + curr.Weapons, 0) / 6;
                            
                            const trendStr = todayTotal > pastAvg 
                                ? <span className="text-red-400 font-medium">Elevated threat level detected</span>
                                : <span className="text-emerald-400 font-medium">Activity remains within normal parameters</span>;
                                
                            return (
                                <span>
                                    System diagnostics indicate a total of <strong className="text-white font-semibold">{totalDetections}</strong> documented encounters. 
                                    Currently, {trendStr} regarding recent activity compared to the 7-day trailing average. 
                                    The predominant entity identified across monitored sectors is <strong className="text-white uppercase tracking-wider text-sm bg-white/10 px-2 py-0.5 rounded ml-1">{mostCommon}</strong>. 
                                    {(poachersCount > 0 || weaponsCount > 0) && (
                                        <span className="block mt-4 text-red-200 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-base">
                                            <strong className="text-red-400 flex items-center gap-2 mb-1">
                                                <ShieldAlert className="w-5 h-5" /> High Priority Alert
                                            </strong>
                                            There have been <strong className="text-red-400 font-semibold">{poachersCount + weaponsCount}</strong> critical human/weapon signatures detected. Continuous monitoring is strictly advised.
                                        </span>
                                    )}
                                </span>
                            );
                        })()}
                    </p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Threat Type Breakdown */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h3 className="text-sm font-semibold text-white tracking-widest uppercase flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-400" />
                    Threat Type Breakdown
                </h3>
            </div>
            <div className="p-6 h-96">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={130}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={true}
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(2, 8, 4, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '16px', padding: '12px' }}
                      itemStyle={{ color: '#cbd5e1' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-emerald-500/40">
                  <PieChartIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-mono uppercase tracking-widest">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Detections Over Time */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h3 className="text-sm font-semibold text-white tracking-widest uppercase flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    Detections (Last 7 Days)
                </h3>
            </div>
            <div className="p-6 h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(2, 8, 4, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '16px', padding: '12px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Animals" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Poachers" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Weapons" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalyticsPage;
