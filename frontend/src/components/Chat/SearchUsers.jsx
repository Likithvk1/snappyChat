import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import clsx from 'clsx';
import { useWebSocket } from '../../context/WebSocketContext';

const SearchUsers = ({ onClose, currentUser, existingContacts }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const { onlineUsers, sendFriendRequest } = useWebSocket();

    useEffect(() => {
        if (!query || query.length < 1) {
            setResults([]);
            return;
        }

        // Debounce search
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();

                // Filter out current user and existing contacts
                const filtered = data.users.filter(
                    u => u !== currentUser && !existingContacts.includes(u)
                );
                setResults(filtered);
            } catch (e) {
                console.error('Search failed:', e);
            }
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, currentUser, existingContacts]);

    const handleSendRequest = async (username) => {
        const result = await sendFriendRequest(username);
        if (result.success) {
            alert(`Friend request sent to ${username}!`);
        } else {
            alert(`Error: ${result.error}`);
        }
    };

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                    autoFocus
                    type="text"
                    placeholder="Search users..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-2 pl-9 pr-9 text-sm focus:outline-none focus:border-purple-500 text-white"
                />
                <button
                    onClick={onClose}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Results Dropdown */}
            {query && (
                <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                    {loading ? (
                        <div className="p-4 text-center text-slate-500 text-sm">Searching...</div>
                    ) : results.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">No users found</div>
                    ) : (
                        results.map(username => (
                            <div
                                key={username}
                                className="flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-slate-200 font-medium text-sm">{username}</h4>
                                        <p className="text-xs flex items-center gap-1">
                                            {onlineUsers.has(username) ? (
                                                <>
                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                    <span className="text-green-400">Online</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                                                    <span className="text-slate-500">Offline</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSendRequest(username)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchUsers;
