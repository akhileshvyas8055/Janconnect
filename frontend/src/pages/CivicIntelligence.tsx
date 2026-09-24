import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AxiosError } from 'axios';
import {
    AlertCircle, BrainCircuit, ChevronDown, ChevronUp, FileUp,
    Image as ImageIcon, Loader2, MapPin, Mic, RefreshCw, ShieldCheck,
    Sparkles, Upload, X,
} from 'lucide-react';
import api from '../services/api';
import AppLayout from '../components/AppLayout';
import MapView from './MapView';
import type { CivicCluster, CivicDatasetSummary, CivicPriority, CivicRecord, CivicValidationError } from '../types';

interface DatasetDetailResponse {
    dataset: CivicDatasetSummary & { records: CivicRecord[]; validationErrors: CivicValidationError[] };
    clusters: CivicCluster[];
}

const priorities: Array<'All' | CivicPriority> = ['All', 'Critical', 'High', 'Medium', 'Low'];
const priorityColors: Record<CivicPriority, string> = {
    Critical: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    High: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
    Low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
};

const errorMessage = (error: unknown): string => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message || (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
};

const formatDate = (date?: string) => date ? new Date(date).toLocaleString() : 'Not available';
const priorityPill = (priority: CivicPriority) => <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-bold ${priorityColors[priority]}`}>{priority}</span>;

export default function CivicIntelligence() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [datasets, setDatasets] = useState<CivicDatasetSummary[]>([]);
    const [dataset, setDataset] = useState<(CivicDatasetSummary & { records: CivicRecord[]; validationErrors: CivicValidationError[] }) | null>(null);
    const [clusters, setClusters] = useState<CivicCluster[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState<'All' | CivicPriority>('All');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [detailCluster, setDetailCluster] = useState<CivicCluster | null>(null);

    const loadDataset = async (datasetId: string) => {
        const response = await api.get<DatasetDetailResponse>(`/civic-intelligence/datasets/${datasetId}`);
        setDataset(response.data.dataset);
        setClusters(response.data.clusters);
        setSelectedId(datasetId);
    };

    const refresh = async (preferredId?: string) => {
        try {
            setLoadingHistory(true);
            setError(null);
            const response = await api.get<{ datasets: CivicDatasetSummary[] }>('/civic-intelligence/datasets');
            setDatasets(response.data.datasets);
            const nextId = preferredId || selectedId || response.data.datasets[0]?.id;
            if (nextId) await loadDataset(nextId);
            else {
                setDataset(null);
                setClusters([]);
            }
        } catch (requestError) {
            setError(errorMessage(requestError));
        } finally {
            setLoadingHistory(false);
        }
    };

    // The initial history request deliberately runs once; later refreshes are user initiated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void refresh(); }, []);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target.files?.[0] ?? null);
        setError(null);
    };

    const uploadDataset = async () => {
        if (!selectedFile) {
            setError('Choose a CSV file before uploading.');
            return;
        }
        if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
            setError('Only CSV files are supported.');
            return;
        }
        try {
            setUploading(true);
            setError(null);
            const csv = await selectedFile.text();
            const response = await api.post<{ dataset: CivicDatasetSummary }>('/civic-intelligence/dataset', csv, {
                headers: { 'Content-Type': 'text/csv', 'X-Filename': selectedFile.name, 'X-Dataset-Source': 'User Uploaded Dataset' },
            });
            setSelectedFile(null);
            if (inputRef.current) inputRef.current.value = '';
            await refresh(response.data.dataset.id);
            setShowValidation(true);
        } catch (requestError) {
            setError(errorMessage(requestError));
        } finally {
            setUploading(false);
        }
    };

    const analyze = async () => {
        if (!dataset || analyzing || dataset.processingStatus === 'Analyzing') return;
        try {
            setAnalyzing(true);
            setError(null);
            await api.post(`/civic-intelligence/analyze/${dataset.id}`);
            await refresh(dataset.id);
        } catch (requestError) {
            setError(errorMessage(requestError));
        } finally {
            setAnalyzing(false);
        }
    };

    const departments = useMemo(() => [...new Set(clusters.map(cluster => cluster.department).filter(Boolean) as string[])].sort(), [clusters]);
    const categories = useMemo(() => [...new Set(clusters.map(cluster => cluster.category).filter(Boolean) as string[])].sort(), [clusters]);
    const filteredClusters = useMemo(() => clusters.filter(cluster =>
        (priorityFilter === 'All' || cluster.priorityLevel === priorityFilter) &&
        (departmentFilter === 'All' || cluster.department === departmentFilter) &&
        (categoryFilter === 'All' || cluster.category === categoryFilter),
    ), [clusters, priorityFilter, departmentFilter, categoryFilter]);
    const overview = useMemo(() => ({
        totalComplaints: dataset?.validRecords ?? 0,
        incidents: clusters.length,
        clusteredComplaints: clusters.filter(cluster => cluster.complaintCount > 1).reduce((sum, cluster) => sum + cluster.complaintCount, 0),
        Critical: clusters.filter(cluster => cluster.priorityLevel === 'Critical').length,
        High: clusters.filter(cluster => cluster.priorityLevel === 'High').length,
        Medium: clusters.filter(cluster => cluster.priorityLevel === 'Medium').length,
        Low: clusters.filter(cluster => cluster.priorityLevel === 'Low').length,
    }), [clusters, dataset]);

    return (
        <AppLayout>
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-7">
                <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">Civic Command / Intelligence</p>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2"><BrainCircuit className="text-violet-600" /> Civic Intelligence</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analyze repeated civic complaints and identify actionable real-world incidents.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => inputRef.current?.click()} className="btn-primary flex items-center gap-2 text-xs"><Upload size={15} /> Upload Dataset</button>
                        <button onClick={() => void refresh()} disabled={loadingHistory} className="btn-secondary flex items-center gap-2 text-xs"><RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} /> Refresh</button>
                    </div>
                </header>

                <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
                {selectedFile && (
                    <section className="saas-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between border-violet-200 dark:border-violet-900/50">
                        <div className="flex items-center gap-3 min-w-0"><FileUp className="text-violet-600 shrink-0" /><div><p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedFile.name}</p><p className="text-xs text-slate-500">{Math.ceil(selectedFile.size / 1024)} KB · ready for server validation</p></div></div>
                        <button onClick={() => void uploadDataset()} disabled={uploading} className="btn-primary text-xs flex items-center justify-center gap-2">{uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{uploading ? 'Uploading dataset…' : 'Upload CSV'}</button>
                    </section>
                )}

                {error && <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/60 p-3 text-sm text-rose-700 dark:text-rose-300 flex gap-2"><AlertCircle size={17} className="shrink-0" />{error}</div>}

                {loadingHistory ? <LoadingCard text="Loading Civic Intelligence datasets…" /> : !dataset ? (
                    <section className="saas-card p-12 text-center border-dashed border-slate-300 dark:border-slate-700"><BrainCircuit className="w-10 h-10 mx-auto text-slate-400 mb-3" /><h2 className="font-bold text-slate-900 dark:text-white">No civic dataset analyzed yet.</h2><p className="text-sm text-slate-500 mt-1">Upload a normalized CSV dataset to begin.</p><button onClick={() => inputRef.current?.click()} className="btn-primary text-xs mt-4">Upload Dataset</button></section>
                ) : <>
                    <section className="saas-card p-5 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dataset source</p><h2 className="font-bold text-slate-900 dark:text-white">{dataset.filename}</h2></div><select value={selectedId} onChange={(event) => void loadDataset(event.target.value)} className="saas-input text-xs py-2 px-3 md:w-72"><option value="">Select dataset</option>{datasets.map(item => <option key={item.id} value={item.id}>{item.filename} · {formatDate(item.uploadedAt)}</option>)}</select></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 text-xs">
                            <DatasetFact label="Records" value={dataset.recordCount} /><DatasetFact label="Valid records" value={dataset.validRecords} /><DatasetFact label="Invalid records" value={dataset.invalidRecords} /><DatasetFact label="Source" value={dataset.source} /><DatasetFact label="Uploaded" value={formatDate(dataset.uploadedAt)} /><DatasetFact label="Analysis status" value={dataset.processingStatus} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button onClick={() => setShowValidation(!showValidation)} className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">{showValidation ? <ChevronUp size={14} /> : <ChevronDown size={14} />} View validation details ({dataset.validationErrors.length})</button>
                            {dataset.validRecords > 0 && <button onClick={() => void analyze()} disabled={analyzing || dataset.processingStatus === 'Analyzing'} className="btn-primary text-xs flex items-center gap-2">{analyzing || dataset.processingStatus === 'Analyzing' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{analyzing || dataset.processingStatus === 'Analyzing' ? 'Analyzing Civic Data…' : dataset.processingStatus === 'Analyzed' ? 'Re-run Analysis' : 'Analyze Dataset'}</button>}
                            {dataset.processingStatus === 'Analyzed' && <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><ShieldCheck size={15} /> Analysis Complete</span>}
                            {dataset.analysisError && <span className="text-xs text-rose-600">{dataset.analysisError}</span>}
                        </div>
                        {showValidation && <ValidationDetails errors={dataset.validationErrors} duplicateCount={dataset.duplicateInputCount} />}
                    </section>

                    <section>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Intelligence overview</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3"><Metric label="Total complaints" value={overview.totalComplaints} /><Metric label="Detected incidents" value={overview.incidents} /><Metric label="Clustered complaints" value={overview.clusteredComplaints} /><Metric label="Critical" value={overview.Critical} accent="rose" /><Metric label="High" value={overview.High} accent="orange" /><Metric label="Medium" value={overview.Medium} accent="amber" /><Metric label="Low" value={overview.Low} accent="emerald" /></div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Civic incident clusters</p><h2 className="font-bold text-slate-900 dark:text-white">Derived incidents <span className="text-sm text-slate-400">({filteredClusters.length})</span></h2></div><div className="flex flex-wrap gap-2">{priorities.map(priority => <button key={priority} onClick={() => setPriorityFilter(priority)} className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${priorityFilter === priority ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}>{priority}</button>)}<select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="saas-input text-xs py-1.5 px-2"><option>All</option>{departments.map(value => <option key={value}>{value}</option>)}</select><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="saas-input text-xs py-1.5 px-2"><option>All</option>{categories.map(value => <option key={value}>{value}</option>)}</select></div></div>
                        {dataset.processingStatus !== 'Analyzed' ? <div className="saas-card p-8 text-center text-sm text-slate-500">Analyze this dataset to view derived civic incidents.</div> : filteredClusters.length === 0 ? <div className="saas-card p-8 text-center text-sm text-slate-500">No related civic incidents were detected in this dataset.</div> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{filteredClusters.map(cluster => <ClusterCard key={cluster.clusterId} cluster={cluster} onOpen={setDetailCluster} />)}</div>}
                    </section>

                    {dataset.processingStatus === 'Analyzed' && <section className="space-y-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Civic Intelligence map</p><h2 className="font-bold text-slate-900 dark:text-white">Optional incident layer</h2></div><div className="h-[560px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10"><MapView civicClusters={filteredClusters} initialCivicLayerVisible onViewIncident={setDetailCluster} /></div></section>}
                </>}
            </div>
            {detailCluster && dataset && <IncidentDetail cluster={detailCluster} records={dataset.records} onClose={() => setDetailCluster(null)} />}
        </AppLayout>
    );
}

const LoadingCard = ({ text }: { text: string }) => <div className="saas-card p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-3 text-violet-600 animate-spin" />{text}</div>;
const DatasetFact = ({ label, value }: { label: string; value: string | number }) => <div><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p><p className="font-semibold text-slate-700 dark:text-slate-200 mt-1 break-words">{value}</p></div>;
const Metric = ({ label, value, accent = 'blue' }: { label: string; value: number; accent?: 'blue' | 'rose' | 'orange' | 'amber' | 'emerald' }) => {
    const accentBorder = { blue: 'border-l-blue-500', rose: 'border-l-rose-500', orange: 'border-l-orange-500', amber: 'border-l-amber-500', emerald: 'border-l-emerald-500' }[accent];
    return <div className={`saas-card p-4 border-l-4 ${accentBorder}`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p></div>;
};

function ValidationDetails({ errors, duplicateCount }: { errors: CivicValidationError[]; duplicateCount: number }) {
    return <div className="border-t border-slate-100 dark:border-white/5 pt-3 text-xs"><p className="font-bold text-slate-700 dark:text-slate-200">Duplicate input rows: {duplicateCount}</p>{errors.length ? <div className="mt-2 max-h-48 overflow-auto space-y-1">{errors.map((error, index) => <p key={`${error.row}-${error.field}-${index}`} className="text-slate-500 dark:text-slate-400">Row {error.row} · <b>{error.field}</b> · {error.message}</p>)}</div> : <p className="mt-1 text-emerald-600">No row-level validation errors.</p>}</div>;
}

function ClusterCard({ cluster, onOpen }: { cluster: CivicCluster; onOpen: (cluster: CivicCluster) => void }) {
    return <article className="saas-card p-5 space-y-4 hover:border-violet-300 dark:hover:border-violet-800 transition-colors"><div className="flex justify-between gap-3"><div><div className="flex flex-wrap gap-2 items-center mb-2">{priorityPill(cluster.priorityLevel)}<span className="text-xs text-slate-500">Severity: {cluster.severity}</span></div><h3 className="font-bold text-slate-900 dark:text-white">{cluster.title}</h3><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cluster.summary}</p></div><p className="text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">{cluster.priorityScore}<span className="text-xs text-slate-400">/100</span></p></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-300"><span>{cluster.complaintCount} reports</span><span>{cluster.evidence.imageEvidenceCount} images</span><span>{cluster.evidence.audioEvidenceCount} audio</span><span>{Math.round(cluster.confidence * 100)}% confidence</span>{cluster.geographicRadiusMeters !== undefined && <span>Radius {Math.round(cluster.geographicRadiusMeters)} m</span>}{cluster.category && <span>{cluster.category}</span>}{cluster.department && <span>{cluster.department}</span>}</div><button onClick={() => onOpen(cluster)} className="text-xs font-bold text-violet-700 dark:text-violet-300">View Incident →</button></article>;
}

function IncidentDetail({ cluster, records, onClose }: { cluster: CivicCluster; records: CivicRecord[]; onClose: () => void }) {
    const [whyOpen, setWhyOpen] = useState(true);
    const sourceRecords = cluster.complaints.map(reference => records.find(record => record.sourceRow === reference.sourceRow)).filter((record): record is CivicRecord => Boolean(record));
    const factors = Object.entries(cluster.priorityFactors).filter(([, value]) => value > 0);
    return <div className="fixed inset-0 z-[2000] bg-slate-950/45 p-4 flex justify-end" onMouseDown={onClose}><aside className="w-full max-w-2xl h-full overflow-y-auto bg-white dark:bg-[#0f172a] shadow-2xl p-6 space-y-6" onMouseDown={event => event.stopPropagation()}><div className="flex justify-between gap-4"><div><div className="mb-2">{priorityPill(cluster.priorityLevel)}</div><h2 className="text-xl font-bold text-slate-900 dark:text-white">{cluster.title}</h2><p className="text-sm text-slate-500 mt-1">{cluster.summary}</p></div><button onClick={onClose} className="p-2 h-fit text-slate-500 hover:text-slate-900 dark:hover:text-white"><X /></button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"><DatasetFact label="Priority score" value={`${cluster.priorityScore}/100`} /><DatasetFact label="Confidence" value={`${Math.round(cluster.confidence * 100)}%`} /><DatasetFact label="Severity" value={cluster.severity} /><DatasetFact label="Reports" value={cluster.complaintCount} /></div><section className="border-y border-slate-200 dark:border-white/10 py-4"><button onClick={() => setWhyOpen(!whyOpen)} className="w-full flex justify-between items-center font-bold text-sm text-slate-900 dark:text-white">Why this priority? {whyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>{whyOpen && <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300"><p>{cluster.explanation}</p><div className="grid grid-cols-2 gap-2 text-xs">{factors.map(([name, value]) => <span key={name} className="rounded bg-slate-50 dark:bg-slate-800 p-2"><b>{name.replace(/([A-Z])/g, ' $1')}:</b> +{value}</span>)}</div></div>}</section><section className="space-y-3"><h3 className="font-bold text-slate-900 dark:text-white text-sm">Evidence</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><DatasetFact label="Text" value={cluster.evidence.descriptionCount} /><DatasetFact label="Images" value={cluster.evidence.imageEvidenceCount} /><DatasetFact label="Audio" value={cluster.evidence.audioEvidenceCount} /><DatasetFact label="Locations" value={cluster.evidence.locationEvidenceCount} /></div>{cluster.evidence.imageEvidenceCount === 0 && <p className="text-xs text-slate-500">No image evidence available.</p>}{cluster.evidence.audioEvidenceCount === 0 && <p className="text-xs text-slate-500">No audio evidence available.</p>}</section><section className="space-y-3"><h3 className="font-bold text-slate-900 dark:text-white text-sm">Related complaints</h3>{sourceRecords.map(record => <div key={record.sourceRow} className="rounded-lg border border-slate-200 dark:border-white/10 p-4 space-y-2"><div className="flex justify-between gap-3"><div><p className="font-bold text-sm text-slate-900 dark:text-white">{record.complaintId || `Source row ${record.sourceRow}`}</p>{record.title && <p className="text-xs text-slate-500">{record.title}</p>}</div>{record.severity && priorityPill(record.severity)}</div><p className="text-xs text-slate-600 dark:text-slate-300">{record.description}</p><div className="flex flex-wrap gap-3 text-[11px] text-slate-500">{record.category && <span>{record.category}</span>}{record.department && <span>{record.department}</span>}{record.createdAt && <span>{formatDate(record.createdAt)}</span>}{record.latitude !== undefined && record.longitude !== undefined && <span className="flex items-center gap-1"><MapPin size={11} />{record.latitude}, {record.longitude}</span>}</div>{record.imageUrl && <a href={record.imageUrl} target="_blank" rel="noreferrer" className="block space-y-1 text-xs font-bold text-violet-700 dark:text-violet-300"><span className="inline-flex items-center gap-1"><ImageIcon size={13} /> Source image</span><img src={record.imageUrl} alt={record.title || record.complaintId || 'Source complaint evidence'} className="max-h-44 w-full max-w-sm rounded-md object-cover border border-slate-200 dark:border-white/10" /></a>}{record.audioUrl && <div className="space-y-1"><span className="inline-flex gap-1 text-xs font-bold text-violet-700 dark:text-violet-300"><Mic size={13} /> Source audio</span><audio controls src={record.audioUrl} className="w-full h-8" /></div>}</div>)}{sourceRecords.length === 0 && <p className="text-xs text-slate-500">Source record details are unavailable for this cluster.</p>}</section></aside></div>;
}
