import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Check, ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

type Message = { type: 'bot' | 'user'; text: string; loading?: boolean };

const WhatsAppBotMock = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [awaitingId, setAwaitingId] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [chat, setChat] = useState<Message[]>([
        { type: 'bot', text: 'Namaste! 🙏 Welcome to JanConnect Official Support.\n\nReply with:\n1. Report New Issue\n2. Track Complaint Status\n3. Emergency Help' }
    ]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const addBotMessage = (text: string) => {
        setChat(prev => [...prev, { type: 'bot', text }]);
    };

    const lookupComplaint = async (complaintId: string) => {
        setFetching(true);
        setChat(prev => [...prev, { type: 'bot', text: '🔍 Fetching real-time data... (this may take ~30s if server is waking up)', loading: true }]);
        try {
            const res = await axios.get(`${API_BASE}/complaints/public-status/${complaintId.trim()}`, { timeout: 60000 });
            const c = res.data;

            const sla = c.slaDeadline ? new Date(c.slaDeadline).toLocaleDateString('en-IN') : 'N/A';
            const submitted = c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-IN') : 'N/A';
            const lastNote = c.lastUpdate?.note || 'No updates yet';

            const statusEmoji: Record<string, string> = {
                'Submitted': '📋', 'Under Review': '🔍', 'Assigned': '👤',
                'In Progress': '⚙️', 'Resolved': '✅', 'Reopened': '🔄', 'Escalated': '🚨'
            };
            const emoji = statusEmoji[c.status] || '📌';

            const reply =
                `${emoji} *Complaint: ${c.complaintId}*\n` +
                `Title: ${c.title}\n\n` +
                `📊 Status: *${c.status.toUpperCase()}*\n` +
                `🏢 Dept: ${c.department}\n` +
                `⚡ Priority: ${c.priorityLevel}\n` +
                `👮 Officer: ${c.assignedOfficer}\n` +
                `🗓️ SLA Due: ${sla}\n` +
                `📅 Filed: ${submitted}\n\n` +
                `📝 Last Update: ${lastNote}`;

            // Remove the loading placeholder and add real message
            setChat(prev => [...prev.filter(m => !m.loading), { type: 'bot', text: reply }]);
        } catch (err: any) {
            setChat(prev => [
                ...prev.filter(m => !m.loading),
                {
                    type: 'bot', text: err.response?.status === 404
                        ? `❌ No complaint found with ID "${complaintId.trim()}".\nPlease double-check the complaint ID and try again.`
                        : '⚠️ Failed to fetch complaint status. Backend may be offline. Please try again later.'
                }
            ]);
        } finally {
            setFetching(false);
            setAwaitingId(false);
        }
    };

    const handleSend = async () => {
        const text = message.trim();
        if (!text || fetching) return;

        setChat(prev => [...prev, { type: 'user', text }]);
        setMessage('');

        if (awaitingId || text.toUpperCase().includes('COMP-')) {
            await lookupComplaint(text);
            return;
        }

        setTimeout(() => {
            if (text === '1') {
                addBotMessage('To report a new issue, please login to the JanConnect portal and click "Submit New Grievance". Our AI will auto-categorize and assign your complaint. 🏛️');
            } else if (text === '2') {
                setAwaitingId(true);
                addBotMessage('Please enter your Complaint ID (e.g., COMP-1234567890-ABCD) to fetch real-time status.');
            } else if (text === '3') {
                addBotMessage('🚨 EMERGENCY ALERT\n\nFor life-threatening emergencies, call:\n📞 Police: 100\n🚒 Fire: 101\n🚑 Ambulance: 108\n\nFor urgent civic issues, call Civic Helpline: 1916');
            } else {
                addBotMessage("I didn't understand that. Please reply with:\n1 - Report Issue\n2 - Track Status\n3 - Emergency\n\nOr enter your COMP- ID directly to check status.");
            }
        }, 600);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[2000]">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-all hover:bg-emerald-600 relative"
                >
                    <MessageSquare size={28} />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
                    </span>
                </button>
            ) : (
                <div className="glass-card w-80 md:w-96 flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300">
                    {/* Header */}
                    <div className="bg-emerald-600 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <ShieldCheck className="text-white" size={24} />
                            </div>
                            <div>
                                <h4 className="text-white text-sm font-black">JanConnect Bot</h4>
                                <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-tighter">Live Status Tracking ✅</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white text-xl">&times;</button>
                    </div>

                    {/* Chat Area */}
                    <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/95 dark:bg-slate-950/90 scrollbar-hide">
                        {chat.map((msg, i) => (
                            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium whitespace-pre-line leading-relaxed
                                    ${msg.type === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : msg.loading
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-bl-none border border-slate-200 dark:border-white/5 animate-pulse'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-white/5'
                                    }`}
                                >
                                    {msg.loading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 size={12} className="animate-spin text-emerald-400" />
                                            <span>Fetching real-time status...</span>
                                        </div>
                                    ) : (
                                        msg.text
                                    )}
                                    {!msg.loading && (
                                        <div className="flex justify-end mt-1 opacity-40">
                                            <Check size={10} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 flex gap-2">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={awaitingId ? 'Enter Complaint ID...' : 'Type a message...'}
                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            disabled={fetching}
                        />
                        <button
                            onClick={handleSend}
                            disabled={fetching || !message.trim()}
                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {fetching ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppBotMock;
