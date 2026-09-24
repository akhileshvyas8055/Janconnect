import { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Bar,
    Doughnut
} from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js';
import {
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Users,
    Activity,
    Layers
} from 'lucide-react';
import AppLayout from '../components/AppLayout';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

const TransparencyDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/complaints/my');
                const data = res.data;

                const deptCounts: any = {};
                const statusCounts: any = { 'Resolved': 0, 'In Progress': 0, 'Submitted': 0, 'Escalated': 0 };

                data.forEach((c: any) => {
                    deptCounts[c.department] = (deptCounts[c.department] || 0) + 1;
                    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
                });

                setStats({
                    total: data.length,
                    resolved: statusCounts['Resolved'],
                    escalated: statusCounts['Escalated'],
                    deptLabels: Object.keys(deptCounts),
                    deptData: Object.values(deptCounts),
                    statusLabels: Object.keys(statusCounts),
                    statusData: Object.values(statusCounts),
                    avgResolution: '4.2 Days'
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const barData = {
        labels: stats?.deptLabels || [],
        datasets: [{
            label: 'Issues by Department',
            data: stats?.deptData || [],
            backgroundColor: '#3b82f6',
            borderRadius: 6,
        }]
    };

    const doughnutData = {
        labels: stats?.statusLabels || [],
        datasets: [{
            data: stats?.statusData || [],
            backgroundColor: [
                '#10b981',
                '#f59e0b',
                '#3b82f6',
                '#ef4444',
            ],
            borderWidth: 0,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                grid: { color: 'rgba(150, 150, 150, 0.1)' },
                ticks: { color: '#64748b' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#64748b' }
            }
        }
    };

    return (
        <AppLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Header Context */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            <span>Civic Portal</span>
                            <span>/</span>
                            <span className="text-blue-600 dark:text-blue-400">Public Accountability</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Activity className="w-6 h-6 text-blue-600" />
                            System Transparency & SLA Analytics
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                            Real-time resolution metrics and accountability data across municipal departments.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                            SLA Uptime: 99.9%
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="saas-card p-12 text-center text-slate-500 space-y-3">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm font-medium">Aggregating civic transparency metrics...</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard
                                label="Total Grievances"
                                value={stats.total}
                                trend="+12% this month"
                                icon={<TrendingUp size={20} className="text-blue-600" />}
                            />
                            <MetricCard
                                label="Resolution Rate"
                                value={`${stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%`}
                                trend="+5% SLA compliance"
                                icon={<CheckCircle2 size={20} className="text-emerald-600" />}
                            />
                            <MetricCard
                                label="SLA Escalations"
                                value={stats.escalated}
                                trend="-2% vs last cycle"
                                icon={<AlertCircle size={20} className="text-rose-600" />}
                            />
                            <MetricCard
                                label="Citizen Coverage"
                                value="1.2k"
                                trend="+8% participating"
                                icon={<Users size={20} className="text-indigo-600" />}
                            />
                        </div>

                        {/* Visual Analytics Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 saas-card p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                            Departmental Grievance Distribution
                                        </h3>
                                        <p className="text-xs text-slate-500">Incident volume across public works</p>
                                    </div>
                                    <Layers size={16} className="text-blue-600" />
                                </div>
                                <div className="h-64">
                                    <Bar data={barData} options={chartOptions} />
                                </div>
                            </div>

                            <div className="saas-card p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                            Status Lifecycle Breakdown
                                        </h3>
                                        <p className="text-xs text-slate-500">Active vs resolved cases</p>
                                    </div>
                                </div>
                                <div className="h-64 flex items-center justify-center">
                                    <Doughnut
                                        data={doughnutData}
                                        options={{
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: { color: '#64748b', boxWidth: 12, padding: 16 }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Breakdown Progress List */}
                        <div className="saas-card p-6 space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-100 dark:border-white/5 pb-3">
                                Department Volume Ratios
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {stats.deptLabels.map((label: string, idx: number) => (
                                    <div key={label} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                                                {stats.deptData[idx]} issues
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full"
                                                style={{ width: `${stats.total ? (stats.deptData[idx] / stats.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
};

const MetricCard = ({ label, value, trend, icon }: any) => (
    <div className="saas-card p-5 space-y-2">
        <div className="flex justify-between items-start">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                {icon}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {trend}
            </span>
        </div>
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {label}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                {value}
            </p>
        </div>
    </div>
);

export default TransparencyDashboard;
