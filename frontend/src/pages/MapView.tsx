import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { CivicCluster, CivicPriority, CivicRecord, Complaint } from '../types';
import api from '../services/api';
import L from 'leaflet';
import { BrainCircuit, Filter, Layers } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';

type MapPriorityFilter = 'All' | CivicPriority;

interface MapViewProps {
    civicClusters?: CivicCluster[];
    /** Normalized source complaints for the Civic Intelligence dataset. */
    civicRecords?: CivicRecord[];
    /** Keeps the Civic Intelligence severity control and source-report layer in sync. */
    civicPriorityFilter?: MapPriorityFilter;
    initialCivicLayerVisible?: boolean;
    onViewIncident?: (cluster: CivicCluster) => void;
}

interface MapComplaintMarker {
    key: string;
    source: 'JanConnect complaint' | 'Civic dataset complaint';
    complaintId?: string;
    sourceRow?: number;
    title: string;
    description: string;
    department?: string;
    status?: string;
    severity?: CivicPriority;
    latitude: number;
    longitude: number;
    imageUrl?: string;
    audioUrl?: string;
    createdAt?: string;
}

interface MapFilters {
    status: string;
    priority: MapPriorityFilter;
    department: string;
}

const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const normalizePriority = (value: unknown): CivicPriority | undefined => {
    const normalized = normalizeText(value);
    if (normalized === 'critical') return 'Critical';
    if (normalized === 'high') return 'High';
    if (normalized === 'medium') return 'Medium';
    if (normalized === 'low') return 'Low';
    return undefined;
};

const normalizeCoordinate = (value: unknown): number | undefined => {
    const coordinate = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
    return Number.isFinite(coordinate) ? coordinate : undefined;
};

const hasValidCoordinates = (latitude: number | undefined, longitude: number | undefined): latitude is number =>
    latitude !== undefined && longitude !== undefined &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

const asJanConnectMarker = (complaint: Complaint): MapComplaintMarker | undefined => {
    const latitude = normalizeCoordinate(complaint.location?.lat);
    const longitude = normalizeCoordinate(complaint.location?.lng);
    if (latitude === undefined || longitude === undefined || !hasValidCoordinates(latitude, longitude)) return undefined;

    return {
        key: `complaint-${complaint._id}`,
        source: 'JanConnect complaint',
        complaintId: complaint.complaintId,
        title: complaint.title,
        description: complaint.description,
        department: complaint.department,
        status: complaint.status,
        severity: normalizePriority(complaint.severity) ?? normalizePriority(complaint.priorityLevel),
        latitude,
        longitude,
        imageUrl: complaint.imageUrl,
        audioUrl: complaint.voiceUrl,
        createdAt: complaint.createdAt,
    };
};

const asCivicDatasetMarker = (record: CivicRecord): MapComplaintMarker | undefined => {
    const latitude = normalizeCoordinate(record.latitude);
    const longitude = normalizeCoordinate(record.longitude);
    if (latitude === undefined || longitude === undefined || !hasValidCoordinates(latitude, longitude)) return undefined;

    return {
        key: `civic-record-${record.sourceRow}`,
        source: 'Civic dataset complaint',
        complaintId: record.complaintId,
        sourceRow: record.sourceRow,
        title: record.title?.trim() || record.complaintId || `Source row ${record.sourceRow}`,
        description: record.description,
        department: record.department,
        status: record.status,
        severity: normalizePriority(record.severity) ?? normalizePriority(record.priority),
        latitude,
        longitude,
        imageUrl: record.imageUrl,
        audioUrl: record.audioUrl,
        createdAt: record.createdAt,
    };
};

const formatDate = (value?: string): string | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
};

const MapViewport = ({ markers }: { markers: MapComplaintMarker[] }) => {
    const map = useMap();

    useEffect(() => {
        if (markers.length) {
            const points = markers.map(marker => [marker.latitude, marker.longitude] as L.LatLngTuple);
            if (points.length === 1) {
                map.setView(points[0], 13);
            } else {
                map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 14 });
            }
            return;
        }

        let cancelled = false;
        navigator.geolocation?.getCurrentPosition(position => {
            if (!cancelled) map.setView([position.coords.latitude, position.coords.longitude], 13);
        });
        return () => { cancelled = true; };
    }, [map, markers]);

    return null;
};

const MapView = ({
    civicClusters,
    civicRecords,
    civicPriorityFilter,
    initialCivicLayerVisible = false,
    onViewIncident,
}: MapViewProps) => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<MapFilters>({ status: 'All', priority: 'All', department: 'All' });
    const [civicLayerVisible, setCivicLayerVisible] = useState(initialCivicLayerVisible);
    const [civicPriority, setCivicPriority] = useState<MapPriorityFilter>('All');

    useEffect(() => {
        const fetchAllComplaints = async () => {
            try {
                const response = await api.get<Complaint[]>('/complaints/my');
                setComplaints(response.data);
            } catch (error) {
                console.error('Failed to fetch complaints for map', error);
            } finally {
                setLoading(false);
            }
        };
        void fetchAllComplaints();
    }, []);

    useEffect(() => {
        if (civicPriorityFilter === undefined) return;
        setFilters(current => current.priority === civicPriorityFilter
            ? current
            : { ...current, priority: civicPriorityFilter });
    }, [civicPriorityFilter]);

    const mapMarkers = useMemo(() => [
        ...complaints.map(asJanConnectMarker).filter((marker): marker is MapComplaintMarker => marker !== undefined),
        ...(civicRecords ?? []).map(asCivicDatasetMarker).filter((marker): marker is MapComplaintMarker => marker !== undefined),
    ], [complaints, civicRecords]);

    const filteredMapMarkers = useMemo(() => mapMarkers.filter(marker =>
        (filters.status === 'All' || normalizeText(marker.status) === normalizeText(filters.status)) &&
        (filters.priority === 'All' || marker.severity === filters.priority) &&
        (filters.department === 'All' || normalizeText(marker.department) === normalizeText(filters.department)),
    ), [filters, mapMarkers]);

    const departments = useMemo(() => [...new Set(mapMarkers
        .map(marker => marker.department?.trim())
        .filter((department): department is string => Boolean(department)))].sort((a, b) => a.localeCompare(b)), [mapMarkers]);

    const filteredCivicClusters = useMemo(() => (civicClusters ?? []).filter(cluster =>
        civicPriority === 'All' || normalizePriority(cluster.priorityLevel) === civicPriority,
    ), [civicClusters, civicPriority]);

    const getMarkerIcon = (marker: MapComplaintMarker) => {
        const normalizedStatus = normalizeText(marker.status);
        const isCritical = marker.severity === 'Critical';
        const color = isCritical
            ? '#dc2626'
            : normalizedStatus === 'resolved' ? '#10b981'
                : normalizedStatus === 'escalated' ? '#ef4444'
                    : normalizedStatus === 'in progress' ? '#f59e0b' : '#2563eb';
        const size = isCritical ? 20 : 14;
        const border = isCritical ? 3 : 2.5;

        return L.divIcon({
            className: 'custom-map-marker',
            html: `<div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:${border}px solid white;box-shadow:0 2px 7px rgba(0,0,0,.38)"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    };

    const getCivicMarkerIcon = (priority: CivicPriority, count: number) => {
        const color = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' }[priority];
        return L.divIcon({
            className: 'civic-intelligence-marker',
            html: `<div style="background:${color};min-width:30px;height:30px;padding:0 7px;border-radius:999px;border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.35);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">${count}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
        });
    };

    if (loading) return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading Geospatial Incident Map...</p>
        </div>
    );

    return (
        <div className="h-full w-full relative">
            <div className="absolute top-4 right-4 z-[1000]">
                <div className="saas-card p-4 space-y-3 min-w-[210px] shadow-lg">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-white/5"><Filter size={14} className="text-blue-600" /><span>Map Filters</span></div>
                    <div className="space-y-2">
                        <FilterSelect label="Status" value={filters.status} options={['All', 'Submitted', 'In Progress', 'Resolved', 'Escalated']} onChange={status => setFilters(current => ({ ...current, status }))} />
                        <FilterSelect label="Priority" value={filters.priority} options={['All', 'Low', 'Medium', 'High', 'Critical']} onChange={priority => setFilters(current => ({ ...current, priority: priority as MapPriorityFilter }))} />
                        <FilterSelect label="Department" options={['All', ...departments]} value={filters.department} onChange={department => setFilters(current => ({ ...current, department }))} />
                        {civicClusters && <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5 space-y-2"><label className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300"><span className="flex items-center gap-1.5"><BrainCircuit size={13} className="text-violet-600" /> Civic Intelligence Data</span><input type="checkbox" checked={civicLayerVisible} onChange={event => setCivicLayerVisible(event.target.checked)} className="accent-violet-600" /></label>{civicLayerVisible && <FilterSelect label="Incident Priority" value={civicPriority} options={['All', 'Critical', 'High', 'Medium', 'Low']} onChange={priority => setCivicPriority(priority as MapPriorityFilter)} />}</div>}
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between text-[11px] text-slate-500 font-semibold"><span>Visible:</span><span className="text-blue-600 font-bold">{filteredMapMarkers.length} markers</span></div>
                    {civicClusters && civicLayerVisible && <div className="flex justify-between text-[11px] text-slate-500 font-semibold"><span>Incidents:</span><span className="text-violet-600 font-bold">{filteredCivicClusters.length} clusters</span></div>}
                </div>
            </div>

            <div className="absolute bottom-4 left-4 z-[1000] saas-card p-3 space-y-1.5 text-xs shadow-md">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Marker Legend</div>
                <LegendItem color="#2563eb" label="Submitted" /><LegendItem color="#f59e0b" label="In Progress" /><LegendItem color="#10b981" label="Resolved" /><LegendItem color="#dc2626" label="Critical severity" />
                {civicClusters && civicLayerVisible && <><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1 flex items-center gap-1"><Layers size={11} /> Intelligence Incidents</div><LegendItem color="#dc2626" label="Critical" /><LegendItem color="#ea580c" label="High" /><LegendItem color="#ca8a04" label="Medium" /><LegendItem color="#16a34a" label="Low" /></>}
            </div>

            <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} className="z-0">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapViewport markers={filteredMapMarkers} />
                {filteredMapMarkers.map(marker => <Marker key={marker.key} position={[marker.latitude, marker.longitude]} icon={getMarkerIcon(marker)} zIndexOffset={marker.severity === 'Critical' ? 1000 : 0}><Popup><div className="p-1 space-y-2 min-w-[200px] text-slate-900">{marker.imageUrl && <img src={marker.imageUrl} alt={marker.title} className="w-full h-24 object-cover rounded-md" />}<div className="space-y-1"><div className="flex items-center gap-1.5 flex-wrap">{marker.status && <StatusBadge status={marker.status} size="sm" />}{marker.severity && <PriorityBadge priority={marker.severity} size="sm" />}</div><p className="font-bold text-xs">{marker.title}</p><p className="text-[11px] text-slate-600 line-clamp-2">{marker.description}</p></div><div className="pt-1.5 border-t border-slate-100 space-y-1 text-[10px] text-slate-400"><div className="flex justify-between gap-2"><span className="font-semibold text-blue-600">{marker.department || marker.source}</span><span>{formatDate(marker.createdAt)}</span></div><p>{marker.complaintId || `Source row ${marker.sourceRow}`} · {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}</p></div>{marker.audioUrl && <audio controls src={marker.audioUrl} className="w-full h-8" />}</div></Popup></Marker>)}
                {civicLayerVisible && filteredCivicClusters.map(cluster => cluster.centroid && <Marker key={cluster.clusterId} position={[cluster.centroid.latitude, cluster.centroid.longitude]} icon={getCivicMarkerIcon(cluster.priorityLevel, cluster.complaintCount)}><Popup><div className="p-1 space-y-2 min-w-[210px] text-slate-900"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Civic Incident</p><p className="font-bold text-sm leading-tight">{cluster.title}</p><div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600"><span>Priority: <b>{cluster.priorityLevel}</b></span><span>Severity: <b>{cluster.severity}</b></span><span>Reports: <b>{cluster.complaintCount}</b></span><span>Confidence: <b>{Math.round(cluster.confidence * 100)}%</b></span><span>Images: <b>{cluster.evidence.imageEvidenceCount}</b></span><span>Audio: <b>{cluster.evidence.audioEvidenceCount}</b></span></div><p className="text-[10px] text-slate-500">{cluster.centroid.latitude.toFixed(5)}, {cluster.centroid.longitude.toFixed(5)}</p>{onViewIncident && <button onClick={() => onViewIncident(cluster)} className="text-xs font-bold text-violet-700 hover:text-violet-900">View Incident</button>}</div></Popup></Marker>)}
            </MapContainer>
        </div>
    );
};

interface FilterSelectProps {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
}

const FilterSelect = ({ label, value, options, onChange }: FilterSelectProps) => <div className="space-y-0.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</label><select value={value} onChange={event => onChange(event.target.value)} className="saas-input py-1 px-2 text-xs cursor-pointer">{options.map(option => <option key={option} value={option}>{option}</option>)}</select></div>;

const LegendItem = ({ color, label }: { color: string; label: string }) => <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">{label}</span></div>;

export default MapView;
