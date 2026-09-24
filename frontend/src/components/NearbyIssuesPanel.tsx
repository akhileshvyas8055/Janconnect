import { useState, useEffect } from 'react';
import { MapPin, ThumbsUp, Loader2, LocateOff, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ImageLightbox, { ClickableImage } from './ImageLightbox';
import { StatusBadge, PriorityBadge } from './StatusBadge';

interface NearbyComplaint {
    _id: string;
    complaintId: string;
    title: string;
    description: string;
    department: string;
    status: string;
    priorityLevel: string;
    location: { lat: number; lng: number; address?: string };
    imageUrl?: string;
    upvotes: number;
    upvotedBy: string[];
    distanceKm: number;
}

interface NearbyIssuesPanelProps {
    radiusKm?: number;
}

const NearbyIssuesPanel = ({ radiusKm = 3 }: NearbyIssuesPanelProps) => {
    const { user } = useAuth();
    const [state, setState] = useState<'idle' | 'requesting' | 'loading' | 'denied' | 'done'>('idle');
    const [issues, setIssues] = useState<NearbyComplaint[]>([]);
    const [upvotedSet, setUpvotedSet] = useState<Set<string>>(new Set());
    const [lightboxSrc, setLightboxSrc] = useState<{ src: string; alt: string } | null>(null);

    useEffect(() => {
        setState('requesting');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setState('loading');
                try {
                    const res = await api.get(`/complaints/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
                    setIssues(res.data);
                    if (user) {
                        const myUpvotes = new Set<string>(
                            res.data
                                .filter((c: NearbyComplaint) => c.upvotedBy?.includes(user.id))
                                .map((c: NearbyComplaint) => c._id)
                        );
                        setUpvotedSet(myUpvotes);
                    }
                } catch (e) {
                    console.error('Failed to load nearby complaints', e);
                } finally {
                    setState('done');
                }
            },
            () => setState('denied')
        );
    }, [radiusKm, user]);

    const handleUpvote = async (id: string) => {
        if (!user) return;
        try {
            const res = await api.post(`/complaints/${id}/upvote`);
            setIssues(prev =>
                prev.map(c => c._id === id ? { ...c, upvotes: res.data.upvotes } : c)
            );
            setUpvotedSet(prev => {
                const next = new Set(prev);
                if (res.data.upvoted) next.add(id); else next.delete(id);
                return next;
            });
        } catch (e) {
            console.error('Upvote failed', e);
        }
    };

    if (state === 'idle' || state === 'requesting') {
        return (
            <div className="p-8 text-center text-slate-500 space-y-2">
                <Loader2 size={20} className="animate-spin text-blue-600 mx-auto" />
                <p className="text-xs font-medium">Detecting GPS location to find neighborhood grievances...</p>
            </div>
        );
    }

    if (state === 'denied') {
        return (
            <div className="p-6 border border-slate-200 dark:border-white/10 rounded-lg flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <LocateOff size={20} className="text-slate-400 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Location access required</p>
                    <p className="text-xs mt-0.5">Please allow location permissions in your browser to view issues near you.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-rose-600" />
                        <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                            Verified Incidents within {radiusKm} km
                        </h3>
                    </div>
                    {state === 'loading' && <Loader2 size={14} className="animate-spin text-blue-600" />}
                    <span className="text-xs text-slate-500 font-semibold">{issues.length} incidents found</span>
                </div>

                {issues.length === 0 && state === 'done' && (
                    <div className="p-8 text-center text-slate-500 text-xs">
                        No active issues currently reported within your area radius.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {issues.map(issue => (
                        <div
                            key={issue._id}
                            className="saas-card p-4 hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
                        >
                            {issue.imageUrl && (
                                <ClickableImage
                                    src={issue.imageUrl}
                                    alt={issue.title}
                                    className="h-28 w-full rounded-md object-cover"
                                    onClick={() => setLightboxSrc({ src: issue.imageUrl!, alt: issue.title })}
                                />
                            )}
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                                        {issue.title}
                                    </h4>
                                    <ArrowUpRight size={14} className="text-slate-400 shrink-0" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge status={issue.status} size="sm" />
                                    <PriorityBadge priority={issue.priorityLevel} size="sm" />
                                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                        <MapPin size={10} /> {issue.distanceKm} km away
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                                <span className="font-mono text-[10px] text-slate-400">
                                    #{issue.complaintId}
                                </span>
                                <button
                                    onClick={() => handleUpvote(issue._id)}
                                    disabled={!user}
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                                        upvotedSet.has(issue._id)
                                            ? 'bg-blue-600 text-white'
                                            : 'btn-secondary'
                                    } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={!user ? 'Login to upvote' : 'Upvote issue'}
                                >
                                    <ThumbsUp size={12} />
                                    <span>{issue.upvotes ?? 0}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {lightboxSrc && (
                <ImageLightbox
                    src={lightboxSrc.src}
                    alt={lightboxSrc.alt}
                    onClose={() => setLightboxSrc(null)}
                />
            )}
        </>
    );
};

export default NearbyIssuesPanel;
