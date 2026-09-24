import React, { useState, useRef } from 'react';
import api from '../services/api';
import { Loader2, Camera, Mic, MapPin, Send, Check, X, Sparkles, AlertCircle } from 'lucide-react';

interface ComplaintFormProps {
    onSuccess: () => void;
    onClose: () => void;
}

const ComplaintForm: React.FC<ComplaintFormProps> = ({ onSuccess, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: { lat: 0, lng: 0, address: '' },
        imageUrl: '',
        voiceUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [recording, setRecording] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiMessage, setAiMessage] = useState('');
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const handleGetLocation = () => {
        setLocating(true);
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData({
                    ...formData,
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        address: 'Detected via GPS'
                    }
                });
                setLocating(false);
            },
            () => {
                setError('Unable to retrieve your location');
                setLocating(false);
            }
        );
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                setFormData(prev => ({ ...prev, imageUrl: base64 }));
                
                // Trigger AI analysis
                setAiAnalyzing(true);
                setAiMessage('Analyzing evidence photo with Gemini AI...');
                try {
                    const res = await api.post('/ai/analyze-image', { imageBase64: base64 });
                    if (res.data.title && !res.data.error) {
                        setFormData(prev => ({
                            ...prev,
                            imageUrl: base64,
                            title: res.data.title || prev.title,
                            description: res.data.description || prev.description,
                        }));
                        setAiMessage(`AI identified: ${res.data.category || 'Civic Issue'} — Title & description auto-filled.`);
                    } else {
                        setAiMessage('AI auto-classification unavailable. Please describe manually.');
                    }
                } catch {
                    setAiMessage('AI analysis skipped. Please fill details manually.');
                } finally {
                    setAiAnalyzing(false);
                    setTimeout(() => setAiMessage(''), 6000);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, voiceUrl: reader.result as string }));
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setRecording(true);
            setError('');
        } catch (err) {
            setError('Microphone access denied or not available.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.location.lat === 0) {
            setError('Please capture your location using the GPS button below');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/complaints', formData);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit grievance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-xl saas-card p-0 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            Report Civic Grievance
                        </h2>
                        <p className="text-xs text-slate-500">
                            Our AI will categorize and route this to the appropriate department.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* AI Status Banner */}
                    {aiMessage && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
                            aiAnalyzing
                                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
                        }`}>
                            {aiAnalyzing ? <Loader2 size={14} className="animate-spin text-purple-600" /> : <Sparkles size={14} />}
                            <span>{aiMessage}</span>
                        </div>
                    )}

                    {/* Image Preview Box */}
                    {formData.imageUrl && (
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 h-36">
                            <img src={formData.imageUrl} alt="Attached Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full p-1 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Issue Summary / Title
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Deep pothole causing hazard near main market"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="saas-input"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Detailed Description
                        </label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Describe severity, location specifics, and context for municipal officers..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="saas-input"
                        />
                    </div>

                    {/* Multimedia & Geolocation Actions */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            ref={fileInputRef}
                            onChange={handleImageChange}
                        />

                        {/* Camera/Photo Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                                formData.imageUrl
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
                                    : 'btn-secondary'
                            }`}
                        >
                            {aiAnalyzing ? (
                                <Loader2 size={16} className="animate-spin text-purple-600" />
                            ) : formData.imageUrl ? (
                                <Check size={16} className="text-blue-600" />
                            ) : (
                                <Camera size={16} className="text-slate-500" />
                            )}
                            <span className="text-[11px]">
                                {aiAnalyzing ? 'Analyzing' : formData.imageUrl ? 'Photo Set' : 'Attach Photo'}
                            </span>
                        </button>

                        {/* Voice Memo Button */}
                        <button
                            type="button"
                            onClick={recording ? stopRecording : startRecording}
                            className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                                recording
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                                    : formData.voiceUrl
                                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
                                        : 'btn-secondary'
                            }`}
                        >
                            {recording ? (
                                <Mic size={16} className="text-rose-600" />
                            ) : formData.voiceUrl ? (
                                <Check size={16} className="text-purple-600" />
                            ) : (
                                <Mic size={16} className="text-slate-500" />
                            )}
                            <span className="text-[11px]">
                                {recording ? 'Recording...' : formData.voiceUrl ? 'Voice Memo' : 'Record Audio'}
                            </span>
                        </button>

                        {/* GPS Location Button */}
                        <button
                            type="button"
                            disabled={locating}
                            onClick={handleGetLocation}
                            className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                                formData.location.lat !== 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                                    : 'btn-secondary'
                            }`}
                        >
                            {locating ? (
                                <Loader2 size={16} className="animate-spin text-emerald-600" />
                            ) : formData.location.lat !== 0 ? (
                                <Check size={16} className="text-emerald-600" />
                            ) : (
                                <MapPin size={16} className="text-slate-500" />
                            )}
                            <span className="text-[11px]">
                                {locating ? 'Locating...' : formData.location.lat !== 0 ? 'Geo-Tagged' : 'Tag GPS'}
                            </span>
                        </button>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 text-xs"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} />
                                    <span>Submitting to Department...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={14} />
                                    <span>Dispatch Grievance</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary text-xs px-4"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComplaintForm;
