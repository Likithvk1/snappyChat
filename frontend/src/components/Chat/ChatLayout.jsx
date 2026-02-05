import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

const ChatLayout = () => {
    // We manage selectedContact here to coordinate Sidebar and ChatArea
    const [selectedContact, setSelectedContact] = useState(null);

    // Load selection from storage on mount (optional, nice to have)
    useEffect(() => {
        const saved = sessionStorage.getItem('selectedContact');
        if (saved) setSelectedContact(saved);
    }, []);

    const handleSelectContact = (contact) => {
        setSelectedContact(contact);
        sessionStorage.setItem('selectedContact', contact);
    };

    return (
        <div className="flex h-screen bg-slate-900 overflow-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
            </div>

            {/* content */}
            <div className="flex w-full h-full z-10 glass-container">
                <Sidebar selectedContact={selectedContact} onSelectContact={handleSelectContact} />
                <ChatArea selectedContact={selectedContact} />
            </div>
        </div>
    );
};

export default ChatLayout;
