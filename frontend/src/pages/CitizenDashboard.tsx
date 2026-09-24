import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Complaint } from '../types';
import {
    PlusCircle,
    Clock,
    AlertCircle,
    CheckCircle2,
    User as UserIcon,
    AlertTriangle,
    Check,
    MapPin,
    BarChart3,
    Construction,
    Mic,
    Layers,
    Calendar,
    ArrowUpRight,
    Search
} from 'lucide-react';
import { Link } from 'react-router-dom';

import ComplaintForm from '../components/ComplaintForm';
import PublicWorksPanel from '../components/PublicWorksPanel';
import ImageLightbox from '../components/ImageLightbox';
import AppLayout from '../components/AppLayout';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

const stages = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Reopened', 'Escalated'];

const CitizenDashboard = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const response = await api.get('/complaints/my');
            setComplaints(response.data);
        } catch (err) {
            console.error('Failed to fetch complaints', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleConfirmResolution = async (id: string, confirmed: boolean) => {
        try {
            if (confirmed) {
                await api.patch(`/complaints/${id}/confirm`);
            } else {
                await api.patch(`/complaints/${id}/reopen`);
            }
            setConfirmingId(null);
            fetchComplaints();
        } catch (err) {
            console.error('Action failed', err);
        }
    };

    const getStatusIndex = (status: string) => stages.indexOf(status);

    // Filtering
    const filteredComplaints = complaints.filter(c => {
        const matchesFilter = filterStatus === 'All' || c.status === filterStatus;
        const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              c.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              c.department.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const activeCount = complaints.filter(c => !['Resolved'].includes(c.status)).length;
    const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
    const criticalCount = complaints.filter(c => c.priorityLevel === 'Critical').length;

    return (
        <AppLayout onOpenComplaintModal={() => setShowForm(true)}>
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                {showForm && (
                    <ComplaintForm
                        onSuccess={() => {
                            setShowForm(false);
                            fetchComplaints();
                        }}
                        onClose={() => setShowForm(false)}
                    />
                )}

                {selectedImage && (
                    <ImageLightbox
                        src={selectedImage}
                        onClose={() => setSelectedImage(null)}
                    />
                )}

                {/* Resolution Confirmation Modal */}
                {confirmingId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="saas-card max-w-md w-full p-6 space-y-5 text-center shadow-xl">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-500/20">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Resolution</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    Has the department resolved this issue to your satisfaction?
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleConfirmResolution(confirmingId, true)}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Check size={16} /> Yes, Resolved
                                </button>
                                <button
                                    onClick={() => handleConfirmResolution(confirmingId, false)}
                                    className="flex-1 py-2.5 btn-secondary text-sm flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50"
                                >
                                    <AlertTriangle size={16} /> Reopen Case
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Page Title & Breadcrumb Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                            <span>Civic Portal</span>
                            <span>/</span>
                            <span className="text-blue-600 dark:text-blue-400">Citizen Overview</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Welcome back, {user?.name || 'Citizen'}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                            Monitor community grievances, resolution timelines, and civic progress.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary flex items-center gap-2 self-start sm:self-auto shrink-0"
                    >
                        <PlusCircle size={18} />
                        <span>Submit New Grievance</span>
                    </button>
                </div>

                {/* KPI Metrics Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Raised"
                        value={complaints.length}
                        sub="All submitted issues"
                        icon={<Layers className="text-blue-600" size={20} />}
                        accent="blue"
                    />
                    <StatCard
                        title="Active Cases"
                        value={activeCount}
                        sub="In triage or assignment"
                        icon={<Clock className="text-amber-600" size={20} />}
                        accent="amber"
                    />
                    <StatCard
                        title="Resolved Successfully"
                        value={resolvedCount}
                        sub="Closed with verification"
                        icon={<CheckCircle2 className="text-emerald-600" size={20} />}
                        accent="emerald"
                    />
                    <StatCard
                        title="High / Critical"
                        value={criticalCount}
                        sub="Priority SLA monitoring"
                        icon={<AlertCircle className="text-rose-600" size={20} />}
                        accent="rose"
                    />
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <NavQuickCard
                        to="/nearby"
                        icon={<MapPin size={18} className="text-rose-600" />}
                        title="Issues Near You"
                        desc="Hyper-local civic community map"
                    />
                    <NavQuickCard
                        to="/map"
                        icon={<Layers size={18} className="text-blue-600" />}
                        title="Civic Map View"
                        desc="Geospatial strategic tracking"
                    />
                    <NavQuickCard
                        to="/transparency"
                        icon={<BarChart3 size={18} className="text-emerald-600" />}
                        title="SLA Transparency"
                        desc="Department efficiency analytics"
                    />
                    <NavQuickCard
                        to="/projects"
                        icon={<Construction size={18} className="text-amber-600" />}
                        title="Government Works"
                        desc="Public development initiatives"
                    />
                </div>

                {/* Active Tracking Grievances Section */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Grievance Tracking Board</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {filteredComplaints.length}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Real-time AI classification & lifecycle status
                            </p>
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search issues..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="saas-input pl-9 pr-3 py-1.5 text-xs w-48 focus:w-64 transition-all"
                                />
                            </div>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="saas-input py-1.5 px-3 text-xs w-36 cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                {stages.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="saas-card p-12 text-center text-slate-500 space-y-3">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm font-medium">Loading your grievance data...</p>
                        </div>
                    ) : filteredComplaints.length === 0 ? (
                        <div className="saas-card p-12 text-center border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                            <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
                                {complaints.length === 0
                                    ? "You have not submitted any grievances yet."
                                    : "No complaints match your active filter."}
                            </p>
                            {complaints.length === 0 && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="btn-primary text-xs"
                                >
                                    Report First Grievance
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredComplaints.map(complaint => (
                                <div
                                    key={complaint._id}
                                    className="saas-card p-5 hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-5"
                                >
                                    {/* Issue Header Info */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                                                    #{complaint.complaintId}
                                                </span>
                                                <StatusBadge status={complaint.status} size="sm" />
                                                <PriorityBadge priority={complaint.priorityLevel} size="sm" />
                                                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                    in {complaint.department}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                                {complaint.title}
                                            </h3>
                                        </div>

                                        {complaint.status === 'Resolved' && !complaint.history?.some(h => h.note?.includes('confirmed')) && (
                                            <button
                                                onClick={() => setConfirmingId(complaint._id)}
                                                className="btn-secondary text-xs px-3 py-1.5 self-start text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                            >
                                                Confirm Resolution
                                            </button>
                                        )}
                                    </div>

                                    {/* Stepper Progress Bar */}
                                    <div className="pt-2 pb-4">
                                        <div className="relative">
                                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-600 transition-all duration-500"
                                                    style={{ width: `${Math.max(10, ((getStatusIndex(complaint.status) + 1) / stages.length) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-2">
                                                {stages.map((stage, idx) => {
                                                    const currentIndex = getStatusIndex(complaint.status);
                                                    const isPassed = idx <= currentIndex;
                                                    const isCurrent = idx === currentIndex;
                                                    return (
                                                        <div key={stage} className="flex flex-col items-center">
                                                            <span className={`text-[10px] uppercase font-bold tracking-tight ${
                                                                isCurrent
                                                                    ? 'text-blue-600 dark:text-blue-400'
                                                                    : isPassed
                                                                        ? 'text-slate-600 dark:text-slate-400'
                                                                        : 'text-slate-600 dark:text-slate-400'
                                                            }`}>
                                                                {stage}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Issue Description / AI Summary */}
                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                        {complaint.description}
                                    </div>

                                    {/* Metadata Footer Details */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500">
                                        <div className="flex items-center gap-6 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <UserIcon size={14} className="text-slate-400" />
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                                    Officer: {complaint.assignedOfficerName || 'Awaiting assignment'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span>
                                                    Filed: {new Date(complaint.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-slate-400" />
                                                <span className={new Date(complaint.slaDeadline) < new Date() && complaint.status !== 'Resolved' ? 'text-rose-600 font-bold' : ''}>
                                                    SLA: {new Date(complaint.slaDeadline).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Image/Audio attachments thumbnail */}
                                        <div className="flex items-center gap-2">
                                            {complaint.imageUrl && (
                                                <button
                                                    onClick={() => setSelectedImage(complaint.imageUrl!)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                                >
                                                    View Evidence Photo
                                                </button>
                                            )}
                                            {complaint.voiceUrl && (
                                                <div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                                                    <Mic size={12} />
                                                    <span>Voice Memo</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Public Government Works Section */}
                <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                    <PublicWorksPanel />
                </div>
            </div>
        </AppLayout>
    );
};

const StatCard: React.FC<{
    title: string;
    value: number;
    sub: string;
    icon: React.ReactNode;
    accent: 'blue' | 'amber' | 'emerald' | 'rose';
}> = ({ title, value, sub, icon, accent }) => {
    const accentBorders = {
        blue: 'border-l-4 border-l-blue-600',
        amber: 'border-l-4 border-l-amber-500',
        emerald: 'border-l-4 border-l-emerald-600',
        rose: 'border-l-4 border-l-rose-600',
    };

    return (
        <div className={`saas-card p-5 flex items-start justify-between ${accentBorders[accent]}`}>
            <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {title}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {value}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    {sub}
                </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                {icon}
            </div>
        </div>
    );
};

const NavQuickCard: React.FC<{
    to: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
}> = ({ to, icon, title, desc }) => (
    <Link
        to={to}
        className="saas-card-interactive p-4 flex items-center justify-between group"
    >
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {title}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {desc}
                </p>
            </div>
        </div>
        <ArrowUpRight size={14} className="text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
    </Link>
);

export default CitizenDashboard;
