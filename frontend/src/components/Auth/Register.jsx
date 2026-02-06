import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Loader, CheckCircle } from 'lucide-react';

const Register = ({ onLoginClick }) => {
    const { register } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [recoveryKey, setRecoveryKey] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        setError('');
        const res = await register(username, password, confirmPassword);
        if (!res.success) {
            setError(res.error);
        } else {
            // success, usually auto-login or redirect
            // success, show recovery key
            if (res.recovery_key) {
                setRecoveryKey(res.recovery_key);
            } else {
                if (onLoginClick) onLoginClick();
            }
        }
        setLoading(false);
    };

    if (recoveryKey) {
        return <RecoveryKeyDisplay recoveryKey={recoveryKey} onContinue={onLoginClick} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse delay-1000"></div>
            <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-emerald-600 rounded-full mix-blend-multiply filter blur-[96px] opacity-20 animate-pulse"></div>

            <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl relative z-10 transition-all hover:border-slate-600">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-purple-500 mb-2 text-center tracking-tight">Join SnappyChat</h1>
                <p className="text-slate-400 text-center mb-8">Create your account</p>

                {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm text-center border border-red-500/20">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Choose a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div className="relative group">
                        <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="password"
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        {loading ? <Loader className="animate-spin w-5 h-5" /> : 'Register'}
                    </button>
                </form>

                <div className="mt-6 text-center text-slate-400 text-sm">
                    Already have an account? <span onClick={onLoginClick} className="text-emerald-400 cursor-pointer hover:underline font-medium hover:text-emerald-300 transition-colors">Login</span>
                </div>
            </div>
        </div>
    );
};

const RecoveryKeyDisplay = ({ recoveryKey, onContinue }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(recoveryKey);
        alert("Copied to clipboard!");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse delay-1000"></div>
            <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-emerald-600 rounded-full mix-blend-multiply filter blur-[96px] opacity-20 animate-pulse"></div>

            <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-red-500/30 w-full max-w-md shadow-2xl relative z-10 transition-all">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-2 text-center tracking-tight">Recovery Key</h1>

                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg mb-6">
                    <p className="text-red-400 text-sm font-semibold mb-2">⚠️ IMPORTANT</p>
                    <p className="text-slate-300 text-sm">
                        This is the <strong>ONLY</strong> way to recover your account if you forget your password.
                        SnappyChat does not collect your email or phone number.
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl mb-6 relative group cursor-pointer" onClick={handleCopy}>
                    <code className="block text-center text-xl text-emerald-400 font-mono tracking-widest break-all">
                        {recoveryKey}
                    </code>
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                        <span className="text-white font-medium">Click to Copy</span>
                    </div>
                </div>

                <p className="text-slate-400 text-center text-sm mb-6">
                    Please modify this key and store it in a safe place (like a password manager).
                </p>

                <button
                    onClick={onContinue}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    I have saved my key
                </button>
            </div>
        </div>
    );
};
export default Register;
