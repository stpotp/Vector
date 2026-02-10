import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { auth } from '../lib/auth';

interface Chat {
  id: string;
  title: string;
  messages: any[];
}

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onLogout: () => void;
  onProfileUpdate: (newUsername: string) => void;
  username: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  chats, 
  activeChatId, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat, 
  onLogout,
  onProfileUpdate,
  username,
  isOpen,
  setIsOpen
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [editError, setEditError] = useState('');

  const handleUpdateProfile = async () => {
    if (newUsername === username) {
      setIsEditing(false);
      return;
    }
    if (newUsername.length < 3) {
      setEditError('Min 3 chars');
      return;
    }
    const updated = await auth.updateProfile(username, newUsername);
    if (updated) {
      onProfileUpdate(newUsername);
      setIsEditing(false);
      setEditError('');
    } else {
      setEditError('Taken');
    }
  };
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-[#f9f9f9] border-r border-gray-100 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex flex-col h-full">
          <button
            onClick={() => { onNewChat(); setIsOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all mb-6"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">History</p>
            {chats.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs font-bold text-gray-400">No chats yet</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div 
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all",
                    activeChatId === chat.id 
                      ? "bg-white shadow-sm ring-1 ring-black/5" 
                      : "hover:bg-gray-200/50"
                  )}
                  onClick={() => { onSelectChat(chat.id); setIsOpen(false); }}
                >
                  <MessageSquare className={cn("w-4 h-4 shrink-0", activeChatId === chat.id ? "text-black" : "text-gray-400")} />
                  <span className={cn(
                    "flex-1 text-sm font-bold truncate",
                    activeChatId === chat.id ? "text-black" : "text-gray-600"
                  )}>
                    {chat.title || "New Chat"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="px-2 py-2 mb-2 space-y-2">
              {isEditing ? (
                <div className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                    <input 
                      autoFocus
                      className="flex-1 text-xs font-bold outline-none bg-transparent"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="New name"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateProfile()}
                    />
                  </div>
                  {editError && <span className="text-[9px] font-black text-red-500 uppercase px-5">{editError}</span>}
                  <div className="flex gap-1">
                    <button onClick={handleUpdateProfile} className="flex-1 py-1.5 bg-black text-white text-[10px] font-black rounded-lg uppercase">Save</button>
                    <button onClick={() => { setIsEditing(false); setEditError(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg uppercase">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group/user">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:rotate-12 transition-transform">
                      {username[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-black leading-none">{username}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Vector User</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-gray-300 hover:text-black transition-colors"
                      title="Edit Profile"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={onLogout}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-1 py-2 opacity-50">
              <p className="text-[7px] font-bold uppercase tracking-widest text-gray-400">© Halo Team, Vector 2026</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
