import React, { useState } from 'react';
import { auth, User } from '../lib/auth';
import { Bot, User as UserIcon, Lock, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle');

  const checkUsername = async (val: string) => {
    setUsername(val);
    if (isLogin) return;
    if (val.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const taken = await auth.isUsernameTaken(val);
    if (taken) {
      setUsernameStatus('taken');
    } else {
      setUsernameStatus('available');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    auth.migrate();

    if (isLogin) {
      const user = await auth.login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid username or password.');
      }
    } else {
      if (username.length < 3) {
        setError('Username must be at least 3 characters');
      } else if (password.length < 6) {
        setError('Password must be at least 6 characters');
      } else if (await auth.isUsernameTaken(username)) {
        setError('This username is already taken.');
      } else if (await auth.signup(username, password)) {
        const user = await auth.login(username, password);
        if (user) onLogin(user);
      } else {
        setError('Account creation failed');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0d0d0d] rounded-[2.5rem] shadow-2xl rotate-6 text-white mb-2">
            <Bot className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-[#0d0d0d]">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-400 font-bold">Access Vector Sera Series 1.5</p>
            <div className="flex flex-col items-center gap-1 pt-2">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">By Halo Team & Aarib (vince)</p>
              <p className="text-[8px] font-bold text-gray-200 uppercase tracking-widest">© Halo Team, Vector 2026</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => checkUsername(e.target.value)}
                className={cn(
                  "w-full bg-[#f4f4f4] border-2 border-transparent rounded-2xl pl-12 pr-12 py-4 outline-none focus:bg-white transition-all font-bold",
                  !isLogin && usernameStatus === 'taken' && "border-red-500/20 bg-red-50",
                  !isLogin && usernameStatus === 'available' && "border-green-500/20 bg-green-50"
                )}
                required
              />
              {!isLogin && usernameStatus !== 'idle' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {usernameStatus === 'taken' && <span className="text-[10px] font-black text-red-500 uppercase">Taken</span>}
                  {usernameStatus === 'available' && <span className="text-[10px] font-black text-green-500 uppercase">Available</span>}
                </div>
              )}
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f4f4f4] border border-transparent rounded-2xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-black/10 transition-all font-bold"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0d0d0d] text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-gray-400 hover:text-black font-bold transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};
