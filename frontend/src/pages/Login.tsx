import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Mail, Lock, LogIn, ArrowRight, Shield } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;
            login(token, user);

            if (user.role === 'Officer') {
                navigate('/officer');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            const rawMsg = err.response?.data?.message || err.message || '';
            if (rawMsg.includes('buffering timed out') || rawMsg.includes('timed out')) {
                setError('Unable to reach the database server. Please ensure the database connection string and IP access rules are configured properly.');
            } else {
                setError(rawMsg || 'Invalid credentials. Please verify and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#090d16] p-4 transition-colors duration-200">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-[420px] space-y-6">
                {/* Branding Top */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-sm font-bold text-xl mb-1">
                        <Shield size={24} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        JanConnect Portal
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                        AI-Powered Civic Grievance & Public Works Platform
                    </p>
                </div>

                {/* Form Card */}
                <div className="saas-card p-6 md:p-8 space-y-6 shadow-sm">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Sign in to your account
                        </h2>
                        <p className="text-xs text-slate-500">
                            Enter your email and credentials to continue
                        </p>
                    </div>

                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    className="saas-input pl-9"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    className="saas-input pl-9"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={16} />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative pt-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                            <span className="bg-white dark:bg-[#0f172a] px-2 text-slate-400">
                                New to JanConnect?
                            </span>
                        </div>
                    </div>

                    <Link
                        to="/register"
                        className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                        <span>Create Citizen or Officer Account</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>

                <p className="text-center text-[11px] text-slate-400">
                    &copy; 2026 JanConnect CivicAI • Secure Government Service Portal
                </p>
            </div>
        </div>
    );
};

export default Login;
