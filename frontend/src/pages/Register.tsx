import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { User, Mail, Lock, UserPlus, ArrowRight, ShieldCheck, Building2, Shield } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Citizen',
        department: 'General Administration'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/register', formData);
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#090d16] p-4 transition-colors duration-200 py-8">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-[460px] space-y-6">
                {/* Branding Top */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-sm font-bold text-xl mb-1">
                        <Shield size={24} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Create Account
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                        Join JanConnect as a verified Citizen or Department Officer
                    </p>
                </div>

                {/* Form Card */}
                <div className="saas-card p-6 md:p-8 space-y-6 shadow-sm">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Registration details
                        </h2>
                        <p className="text-xs text-slate-500">
                            Fill in your profile details to register
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
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className="saas-input pl-9"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="saas-input pl-9"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="saas-input pl-9"
                                    placeholder="Create password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Account Role
                                </label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <select
                                        name="role"
                                        className="saas-input pl-9 cursor-pointer"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Citizen">Citizen</option>
                                        <option value="Officer">Officer</option>
                                    </select>
                                </div>
                            </div>

                            {formData.role === 'Officer' && (
                                <div className="space-y-1.5 animate-in fade-in">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Department
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <select
                                            name="department"
                                            className="saas-input pl-9 cursor-pointer"
                                            value={formData.department}
                                            onChange={handleInputChange}
                                        >
                                            <option value="General Administration">General Admin</option>
                                            <option value="Public Works">Public Works</option>
                                            <option value="Health">Health</option>
                                            <option value="Education">Education</option>
                                            <option value="Sanitation">Sanitation</option>
                                            <option value="Water Authority">Water Authority</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus size={16} />
                                    <span>Complete Registration</span>
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
                                Already registered?
                            </span>
                        </div>
                    </div>

                    <Link
                        to="/login"
                        className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                        <span>Sign in to existing account</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>

                <p className="text-center text-[11px] text-slate-400">
                    By registering, you agree to our Terms of Service & Privacy Policy.
                </p>
            </div>
        </div>
    );
};

export default Register;
