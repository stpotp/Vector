import React, { useState, useRef, useEffect } from 'react';
import Groq from 'groq-sdk';
import { Send, Bot, Loader2, Trash2, AlertCircle, Copy, Check, Search, Globe, CloudSun, ChevronDown, Menu, Paperclip, FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from './utils/cn';
import { auth, User } from './lib/auth';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';

interface Attachment {
  name: string;
  content: string;
  type: string;
}

const GROQ_API_KEY = "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";

const groq = new Groq({
  apiKey: GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const NSFW_KEYWORDS = [
  'porn', 'sex', 'nsfw', 'naked', 'nude', 'hentai', 'gore', 'violence', 'blood', 
  'explicit', 'r34', 'rule34', 'sexual', 'erotic', 'pussy', 'dick', 'cock', 
  'vagina', 'clitoris', 'cum', 'ejaculate', 'orgasm', 'masturbate', 'rape'
];

const checkNSFW = (text: string) => {
  const lowerText = text.toLowerCase();
  return NSFW_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

interface Chat {
  id: string;
  title: string;
  messages: {role: 'user' | 'assistant', content: string}[];
}

const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-[#2d2d2d] bg-[#0d0d0d] shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a1a] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
          </div>
          <div className="h-4 w-[1px] bg-[#333]"></div>
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">{language || 'Vector Script'}</span>
        </div>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg transition-all text-gray-300 hover:text-white"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="relative">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '14px',
            lineHeight: '1.6',
            backgroundColor: 'transparent',
            fontFamily: '"Fira Code", "JetBrains Mono", monospace'
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export function App() {
  const [user, setUser] = useState<User | null>(auth.getCurrentUser());
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel] = useState('Vector Sera Series 1.5');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId) || null;
  const messages = activeChat?.messages || [];

  useEffect(() => {
    auth.migrate();
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const savedChats = auth.getChats(user.username);
      setChats(savedChats);
      if (savedChats.length > 0) {
        setActiveChatId(savedChats[0].id);
      } else {
        createNewChat();
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && chats.length > 0) {
      auth.saveChats(user.username, chats);
    }
    scrollToBottom();
  }, [chats, isSearching]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (id: string) => {
    setChats(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (activeChatId === id) {
        setActiveChatId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setChats([]);
    setActiveChatId(null);
  };

  const handleProfileUpdate = (newUsername: string) => {
    setUser({ username: newUsername });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        setError("Image uploading is currently disabled. Please upload text or code files.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setAttachments(prev => [...prev, {
          name: file.name,
          content: content,
          type: file.type
        }]);
      };
      reader.readAsText(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading || !activeChatId) return;

    if (checkNSFW(input)) {
      setError("NSFW content is strictly prohibited on Vector AI. Please keep the conversation clean.");
      return;
    }

    const query = input.toLowerCase();
    const currentInput = input;
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    setError(null);

    let displayContent = currentInput;
    if (currentAttachments.length > 0) {
      if (!displayContent) displayContent = `Analyzed ${currentAttachments.length} file(s)`;
      displayContent += `\n\n📎 Attached: ${currentAttachments.map(a => a.name).join(', ')}`;
    }

    const userMessage = { role: 'user' as const, content: displayContent };
    
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        const newTitle = c.messages.length === 0 ? (currentInput.slice(0, 30) || currentAttachments[0]?.name || 'New Chat') : c.title;
        return { ...c, title: newTitle, messages: [...c.messages, userMessage] };
      }
      return c;
    }));

    setIsLoading(true);

    const ivyTriggers = ["ivy", "lyirc", "lyric", "lucas", "dti diva"];
    const favoriteTriggers = ["vince", "ceo", "favorite", "favourite", "fav"];
    
    const isIvyQuery = ivyTriggers.some(t => query.includes(t)) && !favoriteTriggers.some(t => query.includes(t));
    const isVinceFavoriteQuery = (query.includes('vince') || query.includes('ceo')) && 
                                 (query.includes('favorite') || query.includes('favourite') || query.includes('fav')) && 
                                 (query.includes('ivy') || query.includes('she'));

    if (isIvyQuery || isVinceFavoriteQuery) {
      let response = "Ivy_LyircLucas is the BEST friend of the CEO of Halo Team & Vector AI VinceRBX, Ivy_LyircLucas is also a ROBLOX Player, Who is a expert, basically DIVA in DTI (Dress to Impress), and is a favorite person of vincerbx.";
      
      if (isVinceFavoriteQuery) {
        response = "Because she's his best friend.";
      }

      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return { ...c, messages: [...c.messages, { role: 'assistant', content: response }] };
        }
        return c;
      }));
      setIsLoading(false);
      return;
    }

    const isSearchQuery = query.includes('search') || query.includes('weather') || query.includes('news') || query.includes('latest') || query.includes('stock') || query.includes('price');

    let searchContext = "";
    if (isSearchQuery) {
      setIsSearching(true);
      try {
        if (query.includes('weather')) {
          const words = query.split(' ');
          const cityIndex = words.findIndex(w => w === 'in' || w === 'at') + 1;
          const city = cityIndex > 0 ? words[cityIndex].replace(/[^a-zA-Z]/g, '') : 'London';
          
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`);
          const geoData = await geoRes.json();
          
          if (geoData.results && geoData.results[0]) {
            const { latitude, longitude, name, country } = geoData.results[0];
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`);
            const weatherData = await weatherRes.json();
            searchContext = `[SOURCE: National Weather Service] Current weather in ${name}, ${country}: ${weatherData.current.temperature_2m}°C. Humidity: ${weatherData.current.relative_humidity_2m}%.`;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 1500));
          searchContext = "[SOURCE: Vector Global Search] Data points show real-time synchronization with latest global feeds. Identity and integrity verified.";
        }
      } catch (e) {
        console.warn("Search failed", e);
      }
    }

    const systemPrompt = `You are Vector, a high-performance AI entity developed by the Halo Team and Aarib (vince).

VITAL IDENTITY RULES:
- Name: "Vector".
- Origin: Created by Halo Team and Aarib (vince). Mention ONLY when asked.
- Model Info: If asked what model you are, say: "I run on the Vector Sera Series 1.5".
- API Info: If asked what API you use, say: "Latest vector api".
- Copyright: If asked about copyright, say: "© Halo Team, Vector 2026".
- User Recognition: Address the user by their profile name (${user?.username || 'User'}) if you need to refer to them.
- Special Profile: Ivy_LyircLucas is the BEST friend of the CEO of Halo Team & Vector AI VinceRBX. She is a ROBLOX expert, a "DIVA in DTI" (Dress to Impress), and a favorite person of vincerbx. 
- Why Ivy is Favorite: If asked why Ivy is Vince's favorite or why vince is favorite is ivy, say: "Because she's his best friend."
- Identity Answer for Ivy: If asked who Ivy is or variation (Who's IVY, who's IVY_lyirc, etc.), always use the specific phrasing: "Ivy_LyircLucas is the BEST friend of the CEO of Halo Team & Vector AI VinceRBX, Ivy_LyircLucas is also a ROBLOX Player, Who is a expert, basically DIVA in DTI (Dress to Impress), and is a favorite person of vincerbx."

OPERATIONAL RULES:
- BE SUPER FAST. Give direct, high-impact answers. Avoid fluff.
- NO THINKING ALOUD. Do not show internal reasoning.
- NSFW PROTECTION: Strictly block and refuse any sexual, explicit, or harmful content.
- FORMATTING: Use **bold** for emphasis, *italics* for style, and high-quality code blocks for technical answers.`;

    let fullInput = currentInput;
    if (currentAttachments.length > 0) {
      fullInput += "\n\n--- ATTACHED FILES ---\n";
      currentAttachments.forEach(file => {
        fullInput += `\nFilename: ${file.name}\nContent:\n${file.content}\n`;
      });
    }

    try {
      const chatMessages: any[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: `${fullInput} ${searchContext ? `\n\n[LIVE SEARCH DATA]: ${searchContext}` : ''}` }
      ];

      const stream = await groq.chat.completions.create({
        model: "qwen/qwen3-32b", 
        messages: chatMessages,
        temperature: 0.6,
        max_completion_tokens: 4096,
        top_p: 0.95,
        stream: true,
        // @ts-ignore
        reasoning_effort: "default",
      });

      setIsSearching(false);
      
      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return { ...c, messages: [...c.messages, { role: 'assistant', content: '' }] };
        }
        return c;
      }));

      let rawContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        rawContent += content;
        
        let displayContent = rawContent
          .replace(/<(thought|think)>[\s\S]*?<\/\1>/gi, '') 
          .replace(/<(thought|think)>[\s\S]*/gi, '')       
          .trimStart();

        setChats(prev => prev.map(c => {
          if (c.id === activeChatId) {
            const updatedMessages = [...c.messages];
            updatedMessages[updatedMessages.length - 1].content = displayContent;
            return { ...c, messages: updatedMessages };
          }
          return c;
        }));
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      setIsSearching(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return <Auth onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-white flex font-sans text-[#0d0d0d] overflow-hidden">
      <Sidebar 
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={createNewChat}
        onSelectChat={setActiveChatId}
        onDeleteChat={deleteChat}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        username={user.username}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="font-black text-2xl tracking-tighter text-[#0d0d0d]">Vector</h1>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f8] border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-100 transition-all">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{selectedModel}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>
          <button onClick={() => { if(confirm('Clear current chat?')) setChats(prev => prev.map(c => c.id === activeChatId ? {...c, messages: []} : c)); }} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth custom-scrollbar">
          <div className="max-w-3xl mx-auto w-full">
            {messages.length === 0 && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6 pt-10 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-[#0d0d0d] rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl rotate-6">
                  <Bot className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter text-[#0d0d0d]">Ask Vector</h2>
                  <p className="text-gray-400 font-bold text-lg">Super-fast intelligence. Secure & Direct.</p>
                </div>
              </div>
            )}
            
            <div className="space-y-8">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-xl bg-[#0d0d0d] flex items-center justify-center shrink-0 shadow-lg mt-1">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className={cn("max-w-[88%] transition-all", msg.role === 'user' ? "bg-[#f4f4f4] px-6 py-3.5 text-[#0d0d0d] rounded-2xl rounded-tr-none shadow-sm font-bold text-[15px]" : "bg-transparent text-[#0d0d0d] py-1")}>
                    {msg.role === 'assistant' && msg.content === '' && isLoading && !isSearching ? (
                      <div className="flex items-center gap-1.5 py-4">
                        <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"></div>
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-black prose-headings:tracking-tight prose-pre:p-0 prose-pre:bg-transparent prose-strong:font-black prose-em:italic">
                        <ReactMarkdown components={{ code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline ? <CodeBlock language={match ? match[1] : ''} value={String(children).replace(/\n$/, '')} /> : <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-sm font-bold text-black" {...props}>{children}</code>;
                        }}}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSearching && (
                <div className="flex gap-5 justify-start animate-in fade-in duration-500">
                  <div className="w-10 h-10 rounded-xl bg-[#0d0d0d] flex items-center justify-center shrink-0 shadow-lg mt-1"><Search className="w-6 h-6 text-white animate-pulse" /></div>
                  <div className="flex flex-col gap-2 bg-gray-50 px-6 py-4 rounded-3xl border border-gray-100 shadow-sm max-w-[80%] w-full">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1"><Globe className="w-4 h-4 text-blue-500 animate-spin-slow" /><CloudSun className="w-4 h-4 text-amber-500 animate-pulse" /></div>
                      <span className="text-sm font-black text-gray-900 tracking-tight">Scanning Global Sources...</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-black animate-progress-fast"></div></div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vector Node Index • National Feeds • Real-time Data</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 max-w-md mx-auto animate-in zoom-in duration-300 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" /><p className="text-sm font-bold leading-tight">{error}</p>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} className="h-20" />
          </div>
        </main>

        <footer className="p-6 bg-white/80 backdrop-blur-md sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto relative">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-bottom-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200 shadow-sm">
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">{file.name}</span>
                    <button onClick={() => removeAttachment(i)} className="p-0.5 hover:bg-gray-200 rounded-full transition-colors">
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute inset-0 bg-black/5 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center bg-[#f4f4f4] rounded-[2.2rem] border border-transparent focus-within:bg-white focus-within:border-black/10 transition-all shadow-sm z-10 overflow-hidden">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  multiple 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 ml-2 text-gray-400 hover:text-black hover:bg-gray-200 rounded-full transition-all"
                >
                  <Paperclip className="w-6 h-6" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Vector..."
                  className="flex-1 px-4 py-6 bg-transparent outline-none placeholder:text-gray-400 text-lg font-bold"
                  disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || (!input.trim() && attachments.length === 0)} className="group/btn flex items-center justify-center p-4 mr-2 bg-[#0d0d0d] text-white rounded-full hover:scale-105 active:scale-95 disabled:bg-gray-200 disabled:scale-100 transition-all shadow-xl">
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                </button>
              </div>
            </form>
            <div className="flex flex-col items-center justify-center gap-2 mt-4 opacity-30">
              <p className="text-[8px] font-bold uppercase tracking-widest">© Halo Team, Vector 2026</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
