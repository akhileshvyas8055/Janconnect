import React, { useEffect, useState } from 'react';
import ImageLightbox, { ClickableImage } from '../components/ImageLightbox';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Complaint } from '../types';
import {
    FileText,
    AlertCircle,
    RefreshCw,
    CheckCircle2,
    Loader2,
    MapPin,
    User,
    UserCheck,
    Clock,
    ThumbsUp,
    Mic,
    Search,
    Shield
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

const OfficerDashboard = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [officerNameInputs, setOfficerNameInputs] = useState<Record<string, string>>({});
    const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const response = await api.get('/complaints/my');
            setComplaints(response.data);
        } catch (err) {
            console.error('Failed to fetch officer complaints', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            setUpdatingId(id);
            await api.patch(`/complaints/${id}/status`, { status: newStatus });
            await fetchComplaints();
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update status. Please try again.');
        } finally {
            setUpdatingId(null);
        }
    };

    const assignOfficer = async (id: string) => {
        const name = officerNameInputs[id]?.trim();
        if (!name) return;
        try {
            setAssigningId(id);
            await api.patch(`/complaints/${id}/assign`, { officerName: name });
            await fetchComplaints();
        } catch (err) {
            console.error('Failed to assign officer', err);
            alert('Failed to assign officer. Please try again.');
        } finally {
            setAssigningId(null);
        }
    };

    const filteredComplaints = complaints.filter(c => {
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              c.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              c.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const criticalCount = complaints.filter(c => c.severity === 'Critical').length;
    const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
    const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

    return (
        <AppLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Header Context Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            <span>Civic Command</span>
                            <span>/</span>
                            <span className="text-blue-600 dark:text-blue-400">{user?.department || 'Department'} Operations</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            Officer Command Board
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                            Triaged civic grievances, priority queue management, and field assignment.
                        </p>
                    </div>

                    <button
                        onClick={fetchComplaints}
                        className="btn-secondary flex items-center gap-2 self-start sm:self-auto text-xs"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh Queue</span>
                    </button>
                </div>

                {/* KPI Metrics Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <OfficerStatCard
                        title="Department Tasks"
                        value={complaints.length}
                        sub="Total incidents assigned"
                        icon={<FileText className="text-blue-600" size={20} />}
                        accent="blue"
                    />
                    <OfficerStatCard
                        title="Critical Priority"
                        value={criticalCount}
                        sub="Requires urgent action"
                        icon={<AlertCircle className="text-rose-600" size={20} />}
                        accent="rose"
                    />
                    <OfficerStatCard
                        title="In Active Progress"
                        value={inProgressCount}
                        sub="Field operations ongoing"
                        icon={<RefreshCw className="text-amber-600" size={20} />}
                        accent="amber"
                    />
                    <OfficerStatCard
                        title="Resolved This Period"
                        value={resolvedCount}
                        sub="Completed & closed"
                        icon={<CheckCircle2 className="text-emerald-600" size={20} />}
                        accent="emerald"
                    />
                </div>

                {/* Task Board Management */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Grievance Task Queue</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {filteredComplaints.length} items
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Assigned to {user?.department || 'your unit'} with SLA tracking
                            </p>
                        </div>

                        {/* Search & Status Filters */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search task board..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="saas-input pl-9 pr-3 py-1.5 text-xs w-48 focus:w-64 transition-all"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="saas-input py-1.5 px-3 text-xs w-36 cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="saas-card p-12 text-center text-slate-500 space-y-3">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                            <p className="text-sm font-medium">Loading departmental tasks...</p>
                        </div>
                    ) : filteredComplaints.length === 0 ? (
                        <div className="saas-card p-12 text-center border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                No active tasks match your filter.
                            </p>
                            <p className="text-xs text-slate-500">
                                The task queue is currently clear for your departmental parameters.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredComplaints.map(complaint => (
                                <div
                                    key={complaint._id}
                                    className="saas-card p-5 hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-4"
                                >
                                    {/* Task Card Header */}
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-slate-500">
                                                    #{complaint.complaintId}
                                                </span>
                                                <StatusBadge status={complaint.status} size="sm" />
                                                <PriorityBadge priority={complaint.severity} size="sm" />
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                                    <ThumbsUp size={10} />
                                                    {(complaint as any).upvotes || 0} Upvotes
                                                </span>
                                            </div>

                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                                {complaint.title}
                                            </h3>

                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {complaint.description}
                                            </div>

                                            {/* Details & Citizen Info */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">
                                                        {complaint.location?.address || `${complaint.location?.lat?.toFixed(4)}, ${complaint.location?.lng?.toFixed(4)}`}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <User size={14} className="text-slate-400 shrink-0" />
                                                    <span>
                                                        Reporter: {typeof complaint.userId === 'object' ? (complaint.userId as any).name : 'Citizen'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Media Attachments Preview */}
                                            {(complaint.imageUrl || complaint.voiceUrl) && (
                                                <div className="flex items-center gap-3 pt-2">
                                                    {complaint.imageUrl && (
                                                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shrink-0">
                                                            <ClickableImage
                                                                src={complaint.imageUrl}
                                                                alt={complaint.title}
                                                                className="w-full h-full object-cover"
                                                                onClick={() => setLightbox({ src: complaint.imageUrl!, alt: complaint.title })}
                                                            />
                                                        </div>
                                                    )}
                                                    {complaint.voiceUrl && (
                                                        <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-lg">
                                                            <Mic size={14} className="text-purple-600 dark:text-purple-400" />
                                                            <audio src={complaint.voiceUrl} controls className="h-6 w-44" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Officer Action & Status Controls */}
                                        <div className="w-full lg:w-72 shrink-0 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-3">
                                            {/* Officer Assignment */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                                    Assigned Officer
                                                </label>
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        placeholder={complaint.assignedOfficerName || "Enter officer name..."}
                                                        value={officerNameInputs[complaint._id] || ''}
                                                        onChange={e => setOfficerNameInputs(prev => ({ ...prev, [complaint._id]: e.target.value }))}
                                                        className="saas-input text-xs py-1.5 px-2.5 flex-1"
                                                    />
                                                    <button
                                                        onClick={() => assignOfficer(complaint._id)}
                                                        disabled={assigningId === complaint._id || !officerNameInputs[complaint._id]?.trim()}
                                                        className="btn-secondary text-xs px-2.5 py-1.5 shrink-0"
                                                    >
                                                        {assigningId === complaint._id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={14} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Status Progression Buttons */}
                                            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                                    Update Lifecycle
                                                </label>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button
                                                        onClick={() => updateStatus(complaint._id, 'Assigned')}
                                                        disabled={updatingId === complaint._id || complaint.status === 'Assigned'}
                                                        className={`text-xs py-1.5 px-2 rounded font-semibold border transition-all text-center ${
                                                            complaint.status === 'Assigned'
                                                                ? 'bg-indigo-600 text-white border-transparent'
                                                                : 'btn-secondary text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        Assigned
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(complaint._id, 'In Progress')}
                                                        disabled={updatingId === complaint._id || complaint.status === 'In Progress'}
                                                        className={`text-xs py-1.5 px-2 rounded font-semibold border transition-all text-center ${
                                                            complaint.status === 'In Progress'
                                                                ? 'bg-amber-600 text-white border-transparent'
                                                                : 'btn-secondary text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        In Progress
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(complaint._id, 'Resolved')}
                                                        disabled={updatingId === complaint._id || complaint.status === 'Resolved'}
                                                        className={`text-xs py-1.5 px-2 rounded font-semibold border transition-all text-center col-span-2 ${
                                                            complaint.status === 'Resolved'
                                                                ? 'bg-emerald-600 text-white border-transparent'
                                                                : 'btn-secondary text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        Mark Resolved
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Timestamp footer */}
                                            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-1">
                                                <Clock size={12} />
                                                <span>Filed: {new Date(complaint.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {lightbox && (
                <ImageLightbox
                    src={lightbox.src}
                    alt={lightbox.alt}
                    onClose={() => setLightbox(null)}
                />
            )}
        </AppLayout>
    );
};

const OfficerStatCard: React.FC<{
    title: string;
    value: number;
    sub: string;
    icon: React.ReactNode;
    accent: 'blue' | 'rose' | 'amber' | 'emerald';
}> = ({ title, value, sub, icon, accent }) => {
    const borders = {
        blue: 'border-l-4 border-l-blue-600',
        rose: 'border-l-4 border-l-rose-600',
        amber: 'border-l-4 border-l-amber-500',
        emerald: 'border-l-4 border-l-emerald-600',
    };

    return (
        <div className={`saas-card p-5 flex items-start justify-between ${borders[accent]}`}>
            <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {title}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {value}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                    {sub}
                </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                {icon}
            </div>
        </div>
    );
};

export default OfficerDashboard;
