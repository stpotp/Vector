import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
// @ts-ignore
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  username: string;
  password?: string;
  id?: string;
}

// THE FINAL ABSOLUTE STORAGE KEYS - DO NOT CHANGE
const USERS_KEY = 'VECTOR_VAULT_STABLE_v1_5';
const CURRENT_USER_KEY = 'VECTOR_SESSION_STABLE_v1_5';
const CHATS_PREFIX = 'VECTOR_CHATS_STABLE_v1_5_';

export const auth = {
  migrate: () => {
    let recoveredUsers: User[] = [];
    
    // Recovery keys from all previous versions
    const allLegacyKeys = [
      'VECTOR_VAULT_FINAL_v4',
      'VECTOR_SESSION_v4',
      'VECTOR_CORE_DB_v3',
      'VECTOR_SESSION_v3',
      'VECTOR_INTERNAL_DATABASE_PROD',
      'VECTOR_CORE_STABLE_USERS_PROD_V2',
      'VECTOR_PROD_FINAL_USERS_v1',
      'VECTOR_SYSTEM_VAULT_USERS',
      'VECTOR_VAULT_FINAL_STABLE',
      'VECTOR_AI_PROD_DATA',
      'VECTOR_STABLE_STORAGE_v1',
      'vector_users',
      'users',
      'VECTOR_CORE_STABLE',
      'VECTOR_CORE_DB_v2',
      'VECTOR_PROD_FINAL'
    ];

    allLegacyKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const users = Array.isArray(parsed) ? parsed : (parsed.users || []);
          if (Array.isArray(users)) {
            users.forEach((u: any) => {
              if (u && u.username && !recoveredUsers.find(au => au.username.toLowerCase() === u.username.toLowerCase())) {
                recoveredUsers.push({ username: u.username, password: u.password || 'vector123' });
              }
            });
          }
        } catch (e) {}
      }
    });

    // Load existing final users
    const currentData = localStorage.getItem(USERS_KEY);
    if (currentData) {
      try {
        const currentUsers = JSON.parse(currentData);
        if (Array.isArray(currentUsers)) {
          currentUsers.forEach((u: any) => {
            if (u && u.username && !recoveredUsers.find(au => au.username.toLowerCase() === u.username.toLowerCase())) {
              recoveredUsers.push(u);
            }
          });
        }
      } catch (e) {}
    }

    if (recoveredUsers.length > 0) {
      localStorage.setItem(USERS_KEY, JSON.stringify(recoveredUsers));
    }

    // Session recovery
    const possibleSessionKeys = [
      CURRENT_USER_KEY,
      'VECTOR_SESSION_v3',
      'VECTOR_SESSION_v4',
      'VECTOR_INTERNAL_SESSION_PROD',
      'VECTOR_CURRENT_USER'
    ];
    
    let activeSession = null;
    for (const key of possibleSessionKeys) {
      const sess = localStorage.getItem(key);
      if (sess) {
        try {
          activeSession = JSON.parse(sess);
          break;
        } catch (e) {}
      }
    }

    if (activeSession) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(activeSession));
    }
  },

  getUsers: (): User[] => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  },

  isUsernameTaken: async (username: string): Promise<boolean> => {
    const users = auth.getUsers();
    return users.some(u => u.username.toLowerCase() === username.toLowerCase());
  },

  signup: async (username: string, password: string): Promise<boolean> => {
    const users = auth.getUsers();
    if (await auth.isUsernameTaken(username)) return false;
    
    users.push({ username, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  },

  updateProfile: async (oldUsername: string, newUsername: string): Promise<User | null> => {
    const users = auth.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === oldUsername.toLowerCase());
    
    if (userIndex === -1) return null;
    
    if (newUsername.toLowerCase() !== oldUsername.toLowerCase() && await auth.isUsernameTaken(newUsername)) {
      return null;
    }

    users[userIndex].username = newUsername;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    const oldChatsKey = `${CHATS_PREFIX}${oldUsername.toLowerCase()}`;
    const newChatsKey = `${CHATS_PREFIX}${newUsername.toLowerCase()}`;
    const chats = localStorage.getItem(oldChatsKey);
    if (chats) {
      localStorage.setItem(newChatsKey, chats);
    }

    const updatedUser = { username: newUsername };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },

  login: async (username: string, password: string): Promise<User | null> => {
    const users = auth.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
      return userWithoutPassword;
    }
    return null;
  },

  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  saveChats: (username: string, chats: any[]) => {
    localStorage.setItem(`${CHATS_PREFIX}${username.toLowerCase()}`, JSON.stringify(chats));
  },

  getChats: (username: string): any[] => {
    const chats = localStorage.getItem(`${CHATS_PREFIX}${username.toLowerCase()}`);
    return chats ? JSON.parse(chats) : [];
  }
};
