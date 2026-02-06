import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Loader } from 'lucide-react';

const Login = ({ onRegisterClick }) => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await login(username, password);
        if (!res.success) {
            setError(res.error);
        }
        setLoading(false);
    };



    if (showForgot) {
        return <ForgotPassword onBack={() => setShowForgot(false)} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 overflow-hidden relative">
            {/* Background blobs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-[96px] opacity-20 animate-pulse delay-700"></div>

            <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl relative z-10 transition-all hover:border-slate-600">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2 text-center tracking-tight">SnappyChat</h1>
                <p className="text-slate-400 text-center mb-8">Login to continue</p>

                {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm text-center border border-red-500/20">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                        />
                    </div>

                    <div className="text-right">
                        <span onClick={() => setShowForgot(true)} className="text-sm text-purple-400 cursor-pointer hover:text-purple-300 transition-colors">Forgot Password?</span>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                    >
                        {loading ? <Loader className="animate-spin w-5 h-5" /> : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center text-slate-400 text-sm">
                    Don't have an account? <span onClick={onRegisterClick} className="text-purple-400 cursor-pointer hover:underline font-medium hover:text-purple-300 transition-colors">Register</span>
                </div>
            </div>
        </div>
    );
};
export default Login;

const ForgotPassword = ({ onBack }) => {
    const { resetPassword } = useAuth();
    const [username, setUsername] = useState('');
    const [recoveryKey, setRecoveryKey] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        const res = await resetPassword(username, recoveryKey, newPassword, confirmPassword);
        if (res.success) {
            setSuccess("Password reset successfully! You can now login.");
            setTimeout(() => {
                onBack();
            }, 2000);
        } else {
            setError(res.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>

            <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Reset Password</h2>
                <p className="text-slate-400 text-center mb-6">Enter your recovery key to reset password</p>

                {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm text-center border border-red-500/20">{error}</div>}
                {success && <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-lg mb-4 text-sm text-center border border-emerald-500/20">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    />
                    <input
                        type="text"
                        placeholder="Recovery Key (XXXX-XXXX-XXXX-XXXX)"
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono"
                    />
                    <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    />
                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    />

                    <button
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader className="animate-spin w-5 h-5" /> : 'Reset Password'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <span onClick={onBack} className="text-slate-400 cursor-pointer hover:text-white transition-colors">Back to Login</span>
                </div>
            </div>
        </div>
    );
};
