import React from 'react';
import clsx from 'clsx';

const MessageBubble = ({ message, isSent, sender, timestamp }) => {
    const timeObj = new Date(timestamp);
    const timeStr = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={clsx("flex flex-col mb-4", isSent ? "items-end" : "items-start")}>
            {!isSent && <span className="text-xs text-slate-400 font-bold mb-1 ml-1">{sender}</span>}

            <div className={clsx(
                "max-w-[70%] rounded-2xl p-3 relative shadow-md text-sm md:text-base break-words select-none",
                isSent
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 rounded-bl-none"
            )}>
                <p className="mr-8 pb-2">{message}</p>
                <div className={clsx(
                    "absolute bottom-1 right-2 text-[10px] font-medium opacity-70",
                    isSent ? "text-blue-100" : "text-slate-500"
                )}>
                    {timeStr}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
