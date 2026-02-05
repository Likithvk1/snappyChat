import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { LogOut, User, Plus, Search, MoreVertical, Settings, Bell } from 'lucide-react';
import clsx from 'clsx';
import SearchUsers from './SearchUsers';

const Sidebar = ({ selectedContact, onSelectContact }) => {
    const { user, logout } = useAuth();
    const { contacts, unreadCounts, onlineUsers, pendingRequests, respondFriendRequest, blockedUsers, removeFriend, blockUser, unblockUser } = useWebSocket();
    const [isAdding, setIsAdding] = useState(false);
    const [openMenu, setOpenMenu] = useState(null); // Track which contact's menu is open
    const [showSettings, setShowSettings] = useState(false); // Track settings modal
    const [showNotifications, setShowNotifications] = useState(false); // Track notifications modal
    const [confirmation, setConfirmation] = useState(null); // { type: 'remove'|'block'|'unblock'|'logout', target: username, onConfirm: fn }
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // Track logout confirmation

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenu(null);
        if (openMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openMenu]);


    return (
        <div className="w-80 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700 flex flex-col h-full">
            {/* User Profile Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-100">{user?.username}</h3>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowNotifications(true)}
                        className="text-slate-400 hover:text-blue-400 transition-colors p-2 hover:bg-slate-700/50 rounded-lg relative"
                    >
                        <Bell className="w-5 h-5" />
                        {(pendingRequests || []).length > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-slate-800"></span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="text-slate-400 hover:text-purple-400 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>


            {/* Search Users */}
            <div className="p-4">
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 py-2 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                        <Search className="w-4 h-4" /> Search Users
                    </button>
                ) : (
                    <SearchUsers
                        onClose={() => setIsAdding(false)}
                        currentUser={user?.username}
                        existingContacts={contacts}
                    />
                )}
            </div>



            {/* Contact List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                {contacts.length === 0 && (
                    <div className="text-center text-slate-500 mt-10 text-sm">
                        No contacts yet. <br /> Add someone to start chatting!
                    </div>
                )}

                {contacts.map(contact => (
                    <div
                        key={contact}
                        onClick={() => onSelectContact(contact)}
                        className={clsx(
                            "p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all",
                            selectedContact === contact
                                ? "bg-gradient-to-r from-purple-600/90 to-blue-600/90 shadow-lg shadow-purple-500/20 border border-white/10"
                                : "hover:bg-slate-700/40 text-slate-300"
                        )}
                    >
                        <div className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                            selectedContact === contact ? "bg-white text-purple-600" : "bg-slate-700 text-slate-400"
                        )}>
                            {contact.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={clsx("font-medium truncate", selectedContact === contact ? "text-white" : "text-slate-200")}>{contact}</h4>
                            <p className={clsx("text-xs truncate flex items-center gap-1", selectedContact === contact ? "text-blue-100" : "text-slate-500")}>
                                {onlineUsers.has(contact) ? (
                                    <>
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span className="text-green-400">Online</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                                        <span>Offline</span>
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Three-dot menu */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenu(openMenu === contact ? null : contact);
                                }}
                                className="p-1 hover:bg-slate-600/50 rounded transition-colors"
                            >
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                            </button>

                            {/* Dropdown menu */}
                            {openMenu === contact && (
                                <div className="absolute right-0 top-8 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[140px]">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmation({ type: 'remove', target: contact });
                                            setOpenMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                                    >
                                        Remove
                                    </button>
                                    {(blockedUsers || []).includes(contact) ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmation({ type: 'unblock', target: contact });
                                                setOpenMenu(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-slate-700 transition-colors"
                                        >
                                            Unblock
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmation({ type: 'block', target: contact });
                                                setOpenMenu(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                                        >
                                            Block
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Settings Modal */}
            {showSettings && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/40">
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-purple-400" />
                                Settings
                            </h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-slate-700/50 rounded"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Blocked Users Section */}
                        <div className="p-4">
                            <h3 className="text-sm font-semibold text-slate-400 mb-3">BLOCKED USERS</h3>

                            {(blockedUsers || []).length === 0 ? (
                                <div className="text-center text-slate-500 py-8 text-sm">
                                    No blocked users
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                    {(blockedUsers || []).map(blockedUser => (
                                        <div
                                            key={blockedUser}
                                            className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {blockedUser?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-slate-200">{blockedUser}</h4>
                                                    <p className="text-xs text-red-400">Blocked</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setConfirmation({ type: 'unblock', target: blockedUser })}
                                                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                                            >
                                                Unblock
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Account Section */}
                        <div className="p-4 border-t border-slate-700 bg-slate-900/20">
                            <h3 className="text-sm font-semibold text-slate-400 mb-3">ACCOUNT</h3>
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-3 rounded-xl transition-all font-medium group"
                            >
                                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70]">
                    <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-6 w-80 text-center animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <LogOut className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Log Out?</h3>
                        <p className="text-slate-400 mb-6 font-medium text-sm">Are you sure you want to end your session?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    logout();
                                    setShowLogoutConfirm(false);
                                    setShowSettings(false);
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors font-medium text-sm shadow-lg shadow-red-500/20"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Notifications Modal */}
            {showNotifications && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/40">
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-blue-400" />
                                Notifications
                            </h2>
                            <button
                                onClick={() => setShowNotifications(false)}
                                className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-slate-700/50 rounded"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            {(pendingRequests || []).length === 0 ? (
                                <div className="text-center text-slate-500 py-8 text-sm">
                                    No new notifications
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(pendingRequests || []).map(request => (
                                        <div key={request.from} className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-3">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {request.from.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-slate-200 text-sm"><span className="font-bold text-white">{request.from}</span> sent a friend request</p>
                                                    <span className="text-xs text-slate-500">Just now</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => respondFriendRequest(request.from, 'accept')}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg transition-colors font-medium"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => respondFriendRequest(request.from, 'reject')}
                                                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-xs py-2 rounded-lg transition-colors font-medium"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => setConfirmation({ type: 'block', target: request.from })}
                                                    className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs py-2 px-3 rounded-lg transition-colors font-medium"
                                                >
                                                    Block
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* General Confirmation Modal */}
            {confirmation && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70]">
                    <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-6 w-80 text-center animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-white mb-2 capitalize">{confirmation.type}?</h3>
                        <p className="text-slate-400 mb-6 font-medium text-sm">
                            Are you sure you want to {confirmation.type} <span className="text-white font-bold">{confirmation.target}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmation(null)}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmation.type === 'remove') removeFriend(confirmation.target);
                                    else if (confirmation.type === 'block') blockUser(confirmation.target);
                                    else if (confirmation.type === 'unblock') unblockUser(confirmation.target);
                                    setConfirmation(null);
                                    setOpenMenu(null); // Close sidebar menu if open
                                }}
                                className={clsx(
                                    "flex-1 text-white py-2.5 rounded-xl transition-colors font-medium text-sm shadow-lg",
                                    confirmation.type === 'unblock' ? "bg-green-600 hover:bg-green-700 shadow-green-500/20" : "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                                )}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Sidebar;
