import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    MapPin,
    IndianRupee,
    Star,
    Construction,
    Briefcase,
    Search,
    X,
    Building2,
    Eye,
    MessageSquare,
    Edit3,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Lock
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { ProjectStatus, type Project, type ProjectReviewsResponse } from '../types';

const STATUS_OPTIONS: ProjectStatus[] = ['Started', 'Ongoing', 'Completed', 'Delayed', 'Cancelled'];

const GovernmentProjects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);
    const [selectedProjectForStatus, setSelectedProjectForStatus] = useState<Project | null>(null);
    const [selectedProjectForReviews, setSelectedProjectForReviews] = useState<Project | null>(null);

    // Status Update State
    const [targetStatus, setTargetStatus] = useState<ProjectStatus>('Started');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);

    // Reviews State
    const [reviewsData, setReviewsData] = useState<ProjectReviewsResponse | null>(null);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [reviewsError, setReviewsError] = useState<string | null>(null);

    // Citizen Review Submission State
    const [citizenScore, setCitizenScore] = useState<number>(5);
    const [citizenFeedback, setCitizenFeedback] = useState<string>('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<string | null>(null);
    const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

    // Project Creation Form Data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: '',
        status: 'Started' as ProjectStatus,
        location: '',
        department: 'Public Works'
    });

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error('Failed to load projects', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    // Check if the current user has rights to update this project's status
    const canManageProject = (project: Project): boolean => {
        if (!user) return false;
        if (user.role === 'Admin') return true;
        if (user.role === 'Officer') {
            return (user.department?.trim().toLowerCase() === project.department?.trim().toLowerCase());
        }
        return false;
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/projects', formData);
            setShowForm(false);
            setFormData({
                title: '',
                description: '',
                budget: '',
                status: 'Started',
                location: '',
                department: user?.department || 'Public Works'
            });
            fetchProjects();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to create project');
        }
    };

    // Open Status Modal
    const handleOpenStatusModal = (project: Project) => {
        setSelectedProjectForStatus(project);
        setTargetStatus(project.status);
        setStatusSuccess(null);
        setStatusError(null);
    };

    // Submit Status Update
    const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectForStatus) return;

        setUpdatingStatus(true);
        setStatusSuccess(null);
        setStatusError(null);

        try {
            const res = await api.patch(`/projects/${selectedProjectForStatus._id}/status`, {
                status: targetStatus
            });

            const updatedProject: Project = res.data.project || res.data;
            setStatusSuccess('Project status updated successfully.');

            // Update in-memory projects state immediately
            setProjects(prev => prev.map(p => p._id === updatedProject._id ? updatedProject : p));

            // Also update selected details if open
            if (selectedProjectForDetails?._id === updatedProject._id) {
                setSelectedProjectForDetails(updatedProject);
            }

            // Close modal after brief success confirmation
            setTimeout(() => {
                setSelectedProjectForStatus(null);
                setStatusSuccess(null);
            }, 1200);
        } catch (err: any) {
            setStatusError(err.response?.data?.message || 'Failed to update project status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Open Reviews Modal
    const handleOpenReviewsModal = async (project: Project) => {
        setSelectedProjectForReviews(project);
        setLoadingReviews(true);
        setReviewsError(null);
        setReviewSubmitSuccess(null);
        setReviewSubmitError(null);

        // Pre-fill user review if already submitted
        const myRating = project.ratings?.find(r => {
            if (typeof r.userId === 'object' && r.userId !== null) {
                return (r.userId as any)._id === user?.id;
            }
            return r.userId === user?.id;
        });

        if (myRating) {
            setCitizenScore(myRating.score || 5);
            setCitizenFeedback(myRating.feedback || '');
        } else {
            setCitizenScore(5);
            setCitizenFeedback('');
        }

        try {
            const res = await api.get(`/projects/${project._id}/reviews`);
            setReviewsData(res.data);
        } catch (err: any) {
            console.warn('Dedicated review endpoint error, falling back to project data', err);
            // Fallback to project embedded ratings if needed
            const total = project.ratings?.length || 0;
            const avg = total > 0 ? Number((project.ratings.reduce((a, b) => a + (b.score || 0), 0) / total).toFixed(1)) : 0;
            setReviewsData({
                projectId: project._id,
                title: project.title,
                averageRating: avg,
                totalReviews: total,
                reviews: (project.ratings || []).map(r => ({
                    _id: r._id,
                    score: r.score,
                    feedback: r.feedback || '',
                    createdAt: r.createdAt || project.updatedAt || '',
                    reviewer: {
                        name: typeof r.userId === 'object' && r.userId !== null ? (r.userId as any).name || 'Citizen' : 'Citizen',
                        role: typeof r.userId === 'object' && r.userId !== null ? (r.userId as any).role || 'Citizen' : 'Citizen'
                    }
                }))
            });
        } finally {
            setLoadingReviews(false);
        }
    };

    // Submit Citizen Review
    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectForReviews) return;

        setSubmittingReview(true);
        setReviewSubmitSuccess(null);
        setReviewSubmitError(null);

        try {
            await api.patch(`/projects/${selectedProjectForReviews._id}/rate`, {
                score: citizenScore,
                feedback: citizenFeedback
            });

            setReviewSubmitSuccess('Thank you! Your review has been recorded.');

            // Refresh reviews data
            const res = await api.get(`/projects/${selectedProjectForReviews._id}/reviews`);
            setReviewsData(res.data);

            // Refresh project listing so average rating updates immediately
            fetchProjects();
        } catch (err: any) {
            setReviewSubmitError(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    const filteredProjects = projects.filter(p => {
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchesSearch =
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <AppLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            <span>Civic Works</span>
                            <span>/</span>
                            <span className="text-blue-600 dark:text-blue-400">Development Projects</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            Public Infrastructure Projects
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                            Track municipal civil works, inspect citizen ratings, and manage project progress transparently.
                        </p>
                    </div>

                    {(user?.role === 'Officer' || user?.role === 'Admin') && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary flex items-center gap-2 self-start sm:self-auto text-xs"
                        >
                            <Plus size={16} />
                            <span>Register New Public Project</span>
                        </button>
                    )}
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search projects, wards, departments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="saas-input pl-9 pr-3 py-1.5 text-xs w-64"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="saas-input py-1.5 px-3 text-xs w-36 cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <span className="text-xs text-slate-500 font-medium">
                        Showing {filteredProjects.length} of {projects.length} public initiatives
                    </span>
                </div>

                {/* Project Creation Modal */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="saas-card max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Construction className="w-5 h-5 text-blue-600" />
                                    Register New Public Project
                                </h3>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Project Title
                                    </label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Jaipur - Delhi Main Road Reconstruction"
                                        className="saas-input"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Description & Objectives
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Outline scope, contractor information, and target impact..."
                                        className="saas-input"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Budget Allocated
                                        </label>
                                        <input
                                            required
                                            value={formData.budget}
                                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                            placeholder="e.g. ₹25,00,000"
                                            className="saas-input"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Location / Ward
                                        </label>
                                        <input
                                            required
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="e.g. Ward 42, Jaipur"
                                            className="saas-input"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Department
                                        </label>
                                        <input
                                            required
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            placeholder="e.g. Public Works"
                                            className="saas-input"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Initial Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                                            className="saas-input cursor-pointer"
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="submit" className="flex-1 btn-primary text-xs">
                                        Submit for Public Record
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="btn-secondary text-xs"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Status Update Modal */}
                {selectedProjectForStatus && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="saas-card max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Edit3 className="w-5 h-5 text-blue-600" />
                                        Update Project Status
                                    </h3>
                                    <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                                        {selectedProjectForStatus.title}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedProjectForStatus(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {statusSuccess && (
                                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-2">
                                    <CheckCircle2 size={16} className="shrink-0" />
                                    <span>{statusSuccess}</span>
                                </div>
                            )}

                            {statusError && (
                                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-400 text-xs flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{statusError}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Select Current Status
                                    </label>
                                    <select
                                        value={targetStatus}
                                        onChange={(e) => setTargetStatus(e.target.value as ProjectStatus)}
                                        className="saas-input cursor-pointer"
                                        disabled={updatingStatus}
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-500">
                                        Department: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedProjectForStatus.department}</span>
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={updatingStatus}
                                        className="flex-1 btn-primary text-xs flex items-center justify-center gap-2"
                                    >
                                        {updatingStatus ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Saving to Database...</span>
                                            </>
                                        ) : (
                                            <span>Confirm Status Change</span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProjectForStatus(null)}
                                        disabled={updatingStatus}
                                        className="btn-secondary text-xs"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Project Details Modal */}
                {selectedProjectForDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="saas-card max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                                <div className="space-y-1 pr-4">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={selectedProjectForDetails.status} />
                                        <span className="text-xs text-slate-500 font-medium">
                                            {selectedProjectForDetails.department}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mt-1">
                                        {selectedProjectForDetails.title}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelectedProjectForDetails(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5 text-xs">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Budget
                                    </span>
                                    <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-sm">
                                        <IndianRupee size={13} className="text-emerald-600" />
                                        <span>{selectedProjectForDetails.budget}</span>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Ward / Location
                                    </span>
                                    <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white truncate">
                                        <MapPin size={13} className="text-rose-600 shrink-0" />
                                        <span className="truncate">{selectedProjectForDetails.location}</span>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Department
                                    </span>
                                    <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white truncate">
                                        <Briefcase size={13} className="text-blue-600 shrink-0" />
                                        <span className="truncate">{selectedProjectForDetails.department}</span>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Citizen Rating
                                    </span>
                                    <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                                        <Star size={13} className="text-amber-500 fill-amber-500" />
                                        <span>
                                            {selectedProjectForDetails.ratings?.length
                                                ? `${(selectedProjectForDetails.ratings.reduce((a, b) => a + (b.score || 0), 0) / selectedProjectForDetails.ratings.length).toFixed(1)} (${selectedProjectForDetails.ratings.length})`
                                                : 'No ratings'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Description & Objectives */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Description & Objectives
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-[#0f172a] p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                    {selectedProjectForDetails.description}
                                </p>
                            </div>

                            {/* Timestamps */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 dark:border-white/5 pt-3">
                                {selectedProjectForDetails.createdAt && (
                                    <div className="flex items-center gap-1">
                                        <Calendar size={13} />
                                        <span>Registered: {new Date(selectedProjectForDetails.createdAt).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {selectedProjectForDetails.updatedAt && (
                                    <div className="flex items-center gap-1">
                                        <Calendar size={13} />
                                        <span>Last Updated: {new Date(selectedProjectForDetails.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions inside modal */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                <button
                                    onClick={() => {
                                        const p = selectedProjectForDetails;
                                        setSelectedProjectForDetails(null);
                                        handleOpenReviewsModal(p);
                                    }}
                                    className="btn-secondary text-xs flex items-center gap-1.5"
                                >
                                    <MessageSquare size={14} className="text-blue-600" />
                                    <span>Read Citizen Reviews ({selectedProjectForDetails.ratings?.length || 0})</span>
                                </button>

                                {canManageProject(selectedProjectForDetails) ? (
                                    <button
                                        onClick={() => {
                                            const p = selectedProjectForDetails;
                                            setSelectedProjectForDetails(null);
                                            handleOpenStatusModal(p);
                                        }}
                                        className="btn-primary text-xs flex items-center gap-1.5"
                                    >
                                        <Edit3 size={14} />
                                        <span>Update Status</span>
                                    </button>
                                ) : user?.role === 'Officer' ? (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                                        <Lock size={12} />
                                        <span>Managed by {selectedProjectForDetails.department}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                {/* Citizen Reviews Modal */}
                {selectedProjectForReviews && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="saas-card max-w-xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <span>Citizen Reviews</span>
                                        <span>•</span>
                                        <span className="text-blue-600 dark:text-blue-400">{selectedProjectForReviews.department}</span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                        {selectedProjectForReviews.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedProjectForReviews(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Average Rating Scorecard */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                        {reviewsData?.averageRating?.toFixed(1) || '0.0'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star
                                                    key={star}
                                                    size={16}
                                                    className={`${
                                                        (reviewsData?.averageRating || 0) >= star
                                                            ? 'text-amber-500 fill-amber-500'
                                                            : 'text-slate-300 dark:text-slate-700'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {reviewsData?.totalReviews || 0} {reviewsData?.totalReviews === 1 ? 'Citizen Review' : 'Citizen Reviews'}
                                        </span>
                                    </div>
                                </div>
                                <StatusBadge status={selectedProjectForReviews.status} size="sm" />
                            </div>

                            {/* Reviews List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Citizen Feedback & Comments
                                </h4>

                                {loadingReviews ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="text-xs font-medium mt-2">Loading citizen reviews...</p>
                                    </div>
                                ) : reviewsError ? (
                                    <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                                        {reviewsError}
                                    </div>
                                ) : !reviewsData?.reviews || reviewsData.reviews.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                                        <MessageSquare className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            No citizen reviews yet.
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Be the first to share your evaluation on this public infrastructure initiative.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                        {reviewsData.reviews.map((rev, idx) => (
                                            <div
                                                key={rev._id || idx}
                                                className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0f172a] space-y-2"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px]">
                                                            {rev.reviewer?.name ? rev.reviewer.name.charAt(0).toUpperCase() : 'C'}
                                                        </div>
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {rev.reviewer?.name || 'Citizen'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                            {rev.reviewer?.role || 'Citizen'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <Star
                                                                key={s}
                                                                size={12}
                                                                className={s <= rev.score ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {rev.feedback ? (
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 italic pl-1 leading-relaxed">
                                                        "{rev.feedback}"
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-slate-400 italic pl-1">
                                                        No written comment provided.
                                                    </p>
                                                )}

                                                {rev.createdAt && (
                                                    <p className="text-[10px] text-slate-500 text-right">
                                                        {new Date(rev.createdAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Citizen Submission Box */}
                            {user?.role === 'Citizen' && (
                                <form onSubmit={handleSubmitReview} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                            Rate & Review this Project
                                        </h5>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star
                                                    key={star}
                                                    size={18}
                                                    className={`cursor-pointer transition-transform hover:scale-110 ${
                                                        citizenScore >= star ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'
                                                    }`}
                                                    onClick={() => setCitizenScore(star)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <textarea
                                        rows={2}
                                        placeholder="Share constructive feedback or road conditions..."
                                        value={citizenFeedback}
                                        onChange={(e) => setCitizenFeedback(e.target.value)}
                                        className="saas-input text-xs"
                                    />

                                    {reviewSubmitSuccess && (
                                        <p className="text-xs text-emerald-600 font-medium">{reviewSubmitSuccess}</p>
                                    )}
                                    {reviewSubmitError && (
                                        <p className="text-xs text-rose-600 font-medium">{reviewSubmitError}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submittingReview}
                                        className="btn-primary text-xs w-full py-1.5"
                                    >
                                        {submittingReview ? 'Submitting...' : 'Post Citizen Review'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* Projects Grid */}
                {loading ? (
                    <div className="saas-card p-12 text-center text-slate-500">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm font-medium mt-3">Loading infrastructure initiatives...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="saas-card p-12 text-center border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                        <Construction className="w-10 h-10 text-slate-400 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No projects found.
                        </p>
                        <p className="text-xs text-slate-500">
                            No ongoing municipal initiatives match the current filter criteria.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map(project => {
                            const ratingsCount = project.ratings?.length || 0;
                            const avgRating = ratingsCount
                                ? (project.ratings.reduce((a, b) => a + (b.score || 0), 0) / ratingsCount).toFixed(1)
                                : null;
                            const canManage = canManageProject(project);

                            return (
                                <div
                                    key={project._id}
                                    className="saas-card p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                                                    {project.title}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                    <Briefcase size={12} />
                                                    <span>{project.department}</span>
                                                </div>
                                            </div>
                                            <StatusBadge status={project.status} size="sm" />
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                            {project.description}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-slate-100 dark:border-white/5 text-xs">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                    Budget
                                                </p>
                                                <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                                                    <IndianRupee size={12} className="text-emerald-600" />
                                                    <span>{project.budget}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                    Ward / Area
                                                </p>
                                                <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white truncate">
                                                    <MapPin size={12} className="text-rose-600 shrink-0" />
                                                    <span className="truncate">{project.location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sentiment & Ratings Summary */}
                                        <div className="flex items-center justify-between text-xs pt-1">
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star
                                                        key={star}
                                                        size={13}
                                                        className={
                                                            Number(avgRating) >= star
                                                                ? 'text-amber-500 fill-amber-500'
                                                                : 'text-slate-300 dark:text-slate-700'
                                                        }
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[11px] text-slate-500 font-semibold">
                                                {ratingsCount ? `${avgRating} (${ratingsCount} ${ratingsCount === 1 ? 'review' : 'reviews'})` : 'No reviews'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Area: [View Details] [Update Status] [View Reviews] */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-1">
                                            <button
                                                onClick={() => setSelectedProjectForDetails(project)}
                                                className="btn-secondary text-[11px] py-1.5 px-2.5 flex items-center gap-1 flex-1 justify-center"
                                                title="View detailed project specifications"
                                            >
                                                <Eye size={12} />
                                                <span>Details</span>
                                            </button>

                                            <button
                                                onClick={() => handleOpenReviewsModal(project)}
                                                className="btn-secondary text-[11px] py-1.5 px-2.5 flex items-center gap-1 flex-1 justify-center"
                                                title="Read citizen reviews and feedback"
                                            >
                                                <MessageSquare size={12} />
                                                <span>Reviews</span>
                                            </button>
                                        </div>

                                        {canManage ? (
                                            <button
                                                onClick={() => handleOpenStatusModal(project)}
                                                className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
                                                title="Change status for this project"
                                            >
                                                <Edit3 size={12} />
                                                <span>Update Status</span>
                                            </button>
                                        ) : user?.role === 'Officer' ? (
                                            <span
                                                className="text-[10px] text-slate-400 flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/5"
                                                title={`Only ${project.department} officers can update this project`}
                                            >
                                                <Lock size={10} />
                                                <span>{project.department}</span>
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default GovernmentProjects;
