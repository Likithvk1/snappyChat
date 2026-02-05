import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const { user, token, logout } = useAuth();
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState({}); // { contact: [msg1, msg2] }
    const [contacts, setContacts] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
    const [pendingRequests, setPendingRequests] = useState([]); // Incoming friend requests
    const [blockedUsers, setBlockedUsers] = useState([]); // Blocked users

    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const shouldReconnectRef = useRef(true); // Track if we should auto-reconnect


    // Load message history from server on mount
    useEffect(() => {
        if (!user) return;

        const loadHistory = async () => {
            try {
                // Load friends and pending requests
                const friendsResponse = await fetch(`/api/friend-request/list/${user.username}`);
                const friendsData = await friendsResponse.json();

                // Remove duplicates using Set
                setContacts([...new Set(friendsData.friends || [])]);
                setPendingRequests(friendsData.pending || []);

                // Load blocked users
                const blockedResponse = await fetch(`/api/friend/blocked/${user.username}`);
                const blockedData = await blockedResponse.json();
                setBlockedUsers(blockedData.blocked || []);

                // Load message history
                const response = await fetch(`/api/history/${user.username}`);
                const data = await response.json();

                if (data.messages && data.messages.length > 0) {
                    // Build contacts list and messages map
                    const contactsSet = new Set();
                    const messagesMap = {};

                    data.messages.forEach(msg => {
                        const { sender, recipient, message, timestamp } = msg;
                        const isSent = sender === user.username;
                        const contact = isSent ? recipient : sender;

                        contactsSet.add(contact);

                        // Parse timestamp (UTC fix)
                        let finalTimestamp = timestamp || new Date().toISOString();
                        if (typeof finalTimestamp === 'string' && !finalTimestamp.includes('T') && !finalTimestamp.endsWith('Z')) {
                            finalTimestamp = finalTimestamp.replace(' ', 'T') + 'Z';
                        }

                        if (!messagesMap[contact]) messagesMap[contact] = [];
                        messagesMap[contact].push({
                            sender: isSent ? 'You' : sender,
                            message: message,
                            isSent: isSent,
                            timestamp: finalTimestamp
                        });
                    });

                    setContacts(Array.from(contactsSet));
                    setMessages(messagesMap);
                    console.log('Loaded history:', messagesMap);
                }
            } catch (e) {
                console.error("Failed to load history from server", e);
            }
        };

        loadHistory();
    }, [user]);

    // Save persistence on change (backup to localStorage)
    useEffect(() => {
        localStorage.setItem('contacts', JSON.stringify(contacts));
    }, [contacts]);

    useEffect(() => {
        localStorage.setItem('messageHistory', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        if (!user || !token) {
            // Clear online users when logged out
            shouldReconnectRef.current = false; // Disable auto-reconnect
            setOnlineUsers(new Set());
            return;
        }

        shouldReconnectRef.current = true; // Enable auto-reconnect when logged in

        const connect = () => {
            // Logic to determine WS URL (using proxy path /ws)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Vite proxy handles /ws request to backend
            const wsUrl = `${protocol}//${window.location.host}/ws/${user.username}?token=${token}`;

            console.log("Connecting to WS:", wsUrl);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('Connected to server');
                setIsConnected(true);
                // Start Heartbeat (Ping every 30s)
                if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'online_users') {
                        // Update online users list
                        setOnlineUsers(new Set(data.users));
                        console.log('Online users:', data.users);
                    } else if (data.type === 'force_logout') {
                        // User logged in from another device - disable reconnection
                        shouldReconnectRef.current = false;
                        alert(data.message || 'You have been logged out because you logged in from another device');
                        logout(); // Clear session and return to login
                    } else if (data.type === 'friend_request') {
                        // Incoming friend request
                        setPendingRequests(prev => [...prev, { from: data.from, timestamp: new Date().toISOString() }]);
                        console.log('Friend request from:', data.from);
                    } else if (data.type === 'friend_request_accepted') {
                        // Friend request accepted - add to contacts (avoid duplicates)
                        setContacts(prev => {
                            if (!prev.includes(data.from)) {
                                return [...prev, data.from];
                            }
                            return prev;
                        });
                        console.log('Friend request accepted by:', data.from);
                    } else if (data.from) {
                        handleIncomingMessage(data);
                    }
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                }
            };

            ws.onclose = (event) => {
                console.log('Disconnected from server', event.code, event.reason);
                setIsConnected(false);
                if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

                // Don't reconnect if closed due to force logout (code 1008)
                if (event.code === 1008) {
                    shouldReconnectRef.current = false;
                    return;
                }

                // Auto-reconnect only if still logged in
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (shouldReconnectRef.current) {
                        connect(); // Reconnect if flag is still true
                    }
                }, 3000);
            };

            ws.onerror = (err) => {
                console.error("WS Error", err);
                ws.close();
            };

            setSocket(ws);
        };

        connect();

        return () => {
            // Cleanup on logout or unmount
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

            // Force close the WebSocket
            setSocket(prevSocket => {
                if (prevSocket) {
                    try {
                        prevSocket.close(1000, "User logged out");
                    } catch (e) {
                        console.error("Error closing socket:", e);
                    }
                }
                return null;
            });
        };
    }, [user, token]);

    const handleIncomingMessage = (data) => {
        const { from, message, timestamp } = data;

        // Auto-add contact
        setContacts(prev => {
            if (!prev.includes(from)) return [...prev, from];
            return prev;
        });

        // Parse timestamp (UTC fix)
        let finalTimestamp = timestamp || new Date().toISOString();
        if (typeof finalTimestamp === 'string' && !finalTimestamp.includes('T') && !finalTimestamp.endsWith('Z')) {
            finalTimestamp = finalTimestamp.replace(' ', 'T') + 'Z';
        }

        const newMsg = {
            sender: from,
            message: message,
            isSent: false,
            timestamp: finalTimestamp
        };

        setMessages(prev => ({
            ...prev,
            [from]: [...(prev[from] || []), newMsg]
        }));

        // Increment badge if needed (handled by UI using unreadCounts, simplified here)
    };

    const sendMessage = (recipient, content) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error("Socket not connected");
            return;
        }

        socket.send(JSON.stringify({ to: recipient, message: content }));

        const timestamp = new Date().toISOString();
        const newMsg = {
            sender: 'You',
            message: content,
            isSent: true,
            timestamp: timestamp
        };

        setMessages(prev => ({
            ...prev,
            [recipient]: [...(prev[recipient] || []), newMsg]
        }));
    };


    const sendFriendRequest = async (recipient) => {
        try {
            const response = await fetch('/api/friend-request/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: user.username, recipient })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to send request');
            }

            return { success: true };
        } catch (error) {
            console.error('Send friend request error:', error);
            return { success: false, error: error.message };
        }
    };

    const respondFriendRequest = async (sender, action) => {
        try {
            const response = await fetch('/api/friend-request/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient: user.username, sender, action })
            });

            if (!response.ok) throw new Error('Failed to respond');

            // Update local state
            setPendingRequests(prev => prev.filter(req => req.from !== sender));

            if (action === 'accept') {
                setContacts(prev => {
                    if (!prev.includes(sender)) {
                        return [...prev, sender];
                    }
                    return prev;
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Respond friend request error:', error);
            return { success: false, error: error.message };
        }
    };

    const removeFriend = async (friend) => {
        try {
            const response = await fetch('/api/friend/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, friend })
            });

            if (!response.ok) throw new Error('Failed to remove friend');

            setContacts(prev => prev.filter(c => c !== friend));
            return { success: true };
        } catch (error) {
            console.error('Remove friend error:', error);
            return { success: false, error: error.message };
        }
    };

    const blockUser = async (blocked_user) => {
        try {
            const response = await fetch('/api/friend/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, blocked_user })
            });

            if (!response.ok) throw new Error('Failed to block user');

            setBlockedUsers(prev => [...prev, blocked_user]);
            setContacts(prev => prev.filter(c => c !== blocked_user));
            return { success: true };
        } catch (error) {
            console.error('Block user error:', error);
            return { success: false, error: error.message };
        }
    };

    const unblockUser = async (blocked_user) => {
        try {
            const response = await fetch('/api/friend/unblock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, blocked_user })
            });

            if (!response.ok) throw new Error('Failed to unblock user');

            setBlockedUsers(prev => prev.filter(u => u !== blocked_user));
            return { success: true };
        } catch (error) {
            console.error('Unblock user error:', error);
            return { success: false, error: error.message };
        }
    };

    return (
        <WebSocketContext.Provider value={{
            isConnected,
            sendMessage,
            messages,
            contacts,
            onlineUsers,
            pendingRequests,
            blockedUsers,
            sendFriendRequest,
            respondFriendRequest,
            removeFriend,
            blockUser,
            unblockUser
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);
