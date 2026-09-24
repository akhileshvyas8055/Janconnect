import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Complaint } from '../types';
import api from '../services/api';
import L from 'leaflet';
import { Filter } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

const MapView = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'All',
        priority: 'All',
        department: 'All'
    });

    useEffect(() => {
        const fetchAllComplaints = async () => {
            try {
                const response = await api.get('/complaints/my');
                setComplaints(response.data);
                setFilteredComplaints(response.data);
            } catch (err) {
                console.error('Failed to fetch complaints for map', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllComplaints();
    }, []);

    useEffect(() => {
        let result = complaints;
        if (filters.status !== 'All') result = result.filter(c => c.status === filters.status);
        if (filters.priority !== 'All') result = result.filter(c => c.priorityLevel === filters.priority);
        if (filters.department !== 'All') result = result.filter(c => c.department === filters.department);
        setFilteredComplaints(result);
    }, [filters, complaints]);

    const getMarkerIcon = (status: string) => {
        let color = '#2563eb';
        if (status === 'Resolved') color = '#10b981';
        if (status === 'Escalated' || status === 'Critical') color = '#ef4444';
        if (status === 'In Progress') color = '#f59e0b';

        return L.divIcon({
            className: 'custom-map-marker',
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
    };

    const UserLocationCenterer = () => {
        const map = useMap();
        useEffect(() => {
            navigator.geolocation?.getCurrentPosition(pos => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 13);
            });
        }, [map]);
        return null;
    };

    if (loading) return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading Geospatial Incident Map...</p>
        </div>
    );

    return (
        <div className="h-full w-full relative">
            {/* Filter Float Panel */}
            <div className="absolute top-4 right-4 z-[1000]">
                <div className="saas-card p-4 space-y-3 min-w-[210px] shadow-lg">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-white/5">
                        <Filter size={14} className="text-blue-600" />
                        <span>Map Filters</span>
                    </div>

                    <div className="space-y-2">
                        <FilterSelect
                            label="Status"
                            value={filters.status}
                            options={['All', 'Submitted', 'In Progress', 'Resolved', 'Escalated']}
                            onChange={(v: string) => setFilters({ ...filters, status: v })}
                        />
                        <FilterSelect
                            label="Priority"
                            value={filters.priority}
                            options={['All', 'Low', 'Medium', 'High', 'Critical']}
                            onChange={(v: string) => setFilters({ ...filters, priority: v })}
                        />
                        <FilterSelect
                            label="Department"
                            options={['All', 'Public Works', 'Health', 'Education', 'Sanitation', 'Water Authority']}
                            value={filters.department}
                            onChange={(v: string) => setFilters({ ...filters, department: v })}
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between text-[11px] text-slate-500 font-semibold">
                        <span>Visible:</span>
                        <span className="text-blue-600 font-bold">{filteredComplaints.length} markers</span>
                    </div>
                </div>
            </div>

            {/* Legend Float Panel */}
            <div className="absolute bottom-4 left-4 z-[1000] saas-card p-3 space-y-1.5 text-xs shadow-md">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Status Legend
                </div>
                <LegendItem color="#2563eb" label="Submitted" />
                <LegendItem color="#f59e0b" label="In Progress" />
                <LegendItem color="#10b981" label="Resolved" />
                <LegendItem color="#ef4444" label="Critical / Overdue" />
            </div>

            <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <UserLocationCenterer />
                {filteredComplaints.map(complaint => (
                    complaint.location?.lat && complaint.location?.lng && (
                        <Marker
                            key={complaint._id}
                            position={[complaint.location.lat, complaint.location.lng]}
                            icon={getMarkerIcon(complaint.status)}
                        >
                            <Popup>
                                <div className="p-1 space-y-2 min-w-[200px] text-slate-900">
                                    {complaint.imageUrl && (
                                        <img
                                            src={complaint.imageUrl}
                                            alt={complaint.title}
                                            className="w-full h-24 object-cover rounded-md"
                                        />
                                    )}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <StatusBadge status={complaint.status} size="sm" />
                                            <PriorityBadge priority={complaint.priorityLevel} size="sm" />
                                        </div>
                                        <p className="font-bold text-xs">{complaint.title}</p>
                                        <p className="text-[11px] text-slate-600 line-clamp-2">{complaint.description}</p>
                                    </div>
                                    <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                                        <span className="font-semibold text-blue-600">{complaint.department}</span>
                                        <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
};

const FilterSelect = ({ label, value, options, onChange }: any) => (
    <div className="space-y-0.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="saas-input py-1 px-2 text-xs cursor-pointer"
        >
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const LegendItem = ({ color, label }: { color: string, label: string }) => (
    <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">{label}</span>
    </div>
);

export default MapView;
