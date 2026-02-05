import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../../context/WebSocketContext';
import MessageBubble from './MessageBubble';
import { Send, MessageSquare } from 'lucide-react';

const ChatArea = ({ selectedContact }) => {
    const { messages, sendMessage } = useWebSocket();
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);

    const currentMessages = selectedContact ? (messages[selectedContact] || []) : [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentMessages, selectedContact]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedContact) return;

        sendMessage(selectedContact, inputText);
        setInputText('');
    };

    if (!selectedContact) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 backdrop-blur-sm">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-purple-500/50">
                    <MessageSquare className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-300">Welcome to SnappyChat</h2>
                <p>Select a contact from the sidebar to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-900/30 backdrop-blur-sm relative overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/40 backdrop-blur-md flex items-center justify-between shadow-sm z-10">
                <div>
                    <h3 className="font-bold text-lg text-white">Chat with <span className="text-purple-400">{selectedContact}</span></h3>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {currentMessages.length === 0 ? (
                    <div className="text-center text-slate-500 mt-10 text-sm">
                        No messages yet. Say hi! 👋
                    </div>
                ) : (
                    currentMessages.map((msg, idx) => (
                        <MessageBubble
                            key={idx}
                            message={msg.message}
                            isSent={msg.isSent}
                            sender={msg.sender}
                            timestamp={msg.timestamp}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-800/40 border-t border-slate-700 backdrop-blur-md">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="flex-1 bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatArea;
