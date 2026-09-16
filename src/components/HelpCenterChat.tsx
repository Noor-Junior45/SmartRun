import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  Clock,
  HelpCircle,
  User,
  ArrowLeft,
  Sparkles,
  Wifi,
  WifiOff,
  CheckCheck,
  X,
  Package,
  MapPin,
  FileText,
  Wrench,
  RotateCcw,
  Zap,
  Building2,
  CreditCard
} from 'lucide-react';
import { UserProfile, Order, SavedAddress } from '../types';
import { API_BASE_URL } from '../lib/apiBase';
import {
  processOfflineQuery,
  SUPPORT_CONTACTS,
  STORE_FAQS,
  SmartChatResponse
} from '../services/offlineSupportEngine';

// Custom Chatbot Logo based on store branding (speech bubble face)
const ChatbotLogoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M16 6.5C14.85 5.55 13.45 5 11.95 5C8.1 5 5 8.1 5 11.95C5 13.55 5.55 15.05 6.45 16.25L4.5 19.5L8.2 18.5C9.35 19.1 10.6 19.45 11.95 19.45C13.5 19.45 14.95 18.85 16 17.85"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9.5" cy="11.8" r="1.35" fill="currentColor" />
    <circle cx="14.5" cy="11.8" r="1.35" fill="currentColor" />
  </svg>
);

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  date?: string;
  needsEscalation?: boolean;
  isOffline?: boolean;
  suggestedActions?: Array<{ label: string; query: string }>;
}

export interface HelpCenterChatProps {
  userProfile: UserProfile | null;
  orders?: Order[];
  savedAddresses?: SavedAddress[];
  onBack?: () => void;
}

const CHAT_STORAGE_KEY = 'smartrun_support_chat_history_v5';
const CHAT_MODE_STORAGE_KEY = 'smartrun_support_chat_mode';

const formatWhatsAppDate = (dateString?: string): string => {
  if (!dateString) return 'Today';
  const messageDate = new Date(dateString);
  if (isNaN(messageDate.getTime())) return 'Today';

  const today = new Date();
  const isToday =
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    messageDate.getDate() === yesterday.getDate() &&
    messageDate.getMonth() === yesterday.getMonth() &&
    messageDate.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return messageDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const QUICK_SUGGESTION_CHIPS = [
  { label: '⚡ Wire Gauge Guide', query: 'What wire size is needed for AC, Geyser, and Lighting?' },
  { label: '🚀 60-Min Delivery', query: 'How fast is Kolkata express delivery?' },
  { label: '📄 GST Tax Invoice', query: 'Can I get a GST Tax Invoice for business ITC claims?' },
  { label: '🔧 Book Electrician', query: 'How do I book a verified licensed electrician?' },
  { label: '🔄 7-Day Returns', query: 'What is the return and replacement policy?' },
  { label: '📞 Contact Real Person', query: 'I want to speak with a human agent' },
  { label: '📦 Where is my order?', query: 'Where is my order?' },
  { label: '🏗️ Cement & TMT Steel', query: 'Do you supply genuine cement and TMT steel?' },
  { label: '💳 Payment & COD', query: 'What payment options are accepted?' },
  { label: '❓ All FAQs', query: 'Show all FAQs' }
];

export const HelpCenterChat = ({
  userProfile,
  orders = [],
  savedAddresses = [],
  onBack
}: HelpCenterChatProps) => {
  const userName = userProfile?.name?.split(' ')[0] || 'there';

  // Chat AI engine mode: 'auto' (Live Gemini with offline fallback) | 'offline' (Instant on-device)
  const [engineMode, setEngineMode] = useState<'auto' | 'offline'>(() => {
    try {
      const saved = localStorage.getItem(CHAT_MODE_STORAGE_KEY);
      if (saved === 'offline' || saved === 'auto') return saved;
    } catch (e) {
      // ignore
    }
    return 'auto';
  });

  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);

  const getInitialWelcomeMessage = (): Message => ({
    id: `welcome-${Date.now()}`,
    sender: 'assistant',
    text: `Hello ${userName} 👋! I am Mayra, your 24/7 Support Specialist.\n\n• ⚡ Technical wire gauges & MCB calculations\n• 🚀 60-Minute Kolkata express delivery\n• 📄 GST tax invoices & business ITC\n• 📦 Tracking your recent orders & account details\n• 🤝 Direct connection to our human contractor desk`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toISOString()
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      localStorage.removeItem('smartrun_support_chat_history_v4');
      localStorage.removeItem('smartrun_support_chat_history_v3');
      localStorage.removeItem('smartrun_support_chat_history_v2');
      localStorage.removeItem('smartrun_support_chat_history_v1');
      localStorage.removeItem('smartrun_support_chat_history');
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m) => {
            const cleanedMsg = { ...m, suggestedActions: undefined };
            if (cleanedMsg.sender === 'assistant' && typeof cleanedMsg.text === 'string') {
              const cleaned = cleanedMsg.text
                .replace(/I can assist you both.*?(Ask me about:|$|\n)/gis, '')
                .replace(/I can assist you with:\n?/gi, '')
                .replace(/.*assist you both offline and online.*?\n?/gi, '')
                .replace(/.*gemini ai.*?\n?/gi, '');
              return { ...cleanedMsg, text: cleaned.trim() || cleanedMsg.text };
            }
            return cleanedMsg;
          });
        }
      }
    } catch (e) {
      // ignore
    }
    return [getInitialWelcomeMessage()];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Persist mode preference
  const toggleEngineMode = () => {
    const nextMode = engineMode === 'auto' ? 'offline' : 'auto';
    setEngineMode(nextMode);
    try {
      localStorage.setItem(CHAT_MODE_STORAGE_KEY, nextMode);
    } catch (e) {
      // ignore
    }
  };

  // Save messages to local storage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      scrollToBottom(false);
      return;
    }
    scrollToBottom(true);
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    // 1. If mode is explicitly OFFLINE or device is not connected to internet:
    const isClientOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (engineMode === 'offline' || isClientOffline) {
      setTimeout(() => {
        const offlineResult: SmartChatResponse = processOfflineQuery(
          query,
          userProfile,
          orders,
          savedAddresses
        );

        const botMessage: Message = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: offlineResult.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString(),
          needsEscalation: offlineResult.needsEscalation,
          isOffline: true,
          suggestedActions: offlineResult.suggestedActions
        };

        setMessages((prev) => [...prev, botMessage]);
        setIsLoading(false);
      }, 350);
      return;
    }

    // 2. Otherwise ONLINE: Try Live Gemini API with fallback to offline engine
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/support-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.sender,
            content: m.text
          })),
          customerName: userProfile?.name || 'Valued Customer',
          customerEmail: userProfile?.email || '',
          customerArea: 'Kolkata'
        })
      });

      if (!response.ok) {
        throw new Error('API unreachable');
      }

      const data = await response.json();
      const lowerQuery = query.toLowerCase();
      const needsEscalation =
        Boolean(data.needsEscalation) ||
        lowerQuery.includes('human') ||
        lowerQuery.includes('real person') ||
        lowerQuery.includes('call') ||
        lowerQuery.includes('agent') ||
        lowerQuery.includes('operator') ||
        lowerQuery.includes('talk to someone');

      const botMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.text || 'I am here to help you with wire sizing, express deliveries, GST invoices, and orders.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString(),
        needsEscalation,
        isOffline: false
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      // Seamless offline fallback with high domain intelligence
      const offlineResult: SmartChatResponse = processOfflineQuery(
        query,
        userProfile,
        orders,
        savedAddresses
      );

      const fallbackMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: offlineResult.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString(),
        needsEscalation: offlineResult.needsEscalation,
        isOffline: true
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const welcome = getInitialWelcomeMessage();
    setMessages([welcome]);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([welcome]));
    } catch (e) {
      // ignore
    }
  };

  const renderBoldSpans = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n').filter((line) => {
      const lower = line.toLowerCase();
      if (lower.includes('assist you both')) return false;
      if (lower.includes('offline and online')) return false;
      if (lower.includes('gemini ai')) return false;
      if (lower.trim() === 'i can assist you with:') return false;
      return true;
    });

    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-[13px]">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Bullet point
          if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
            const clean = line.replace(/^[•\-]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-0.5">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span>{renderBoldSpans(clean)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderBoldSpans(line)}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-slate-50 overflow-hidden select-text">
      {/* 1. UNIFIED PAGE HEADER: Chat Support, FAQ button, Refresh button */}
      <header
        id="chat-support-header"
        className="shrink-0 bg-white border-b border-slate-200/90 px-3 sm:px-4 py-3 flex items-center justify-between shadow-2xs z-30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Back to Profile"
              aria-label="Back to Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
            Chat Support
          </h1>
        </div>

        {/* Right Header Actions: FAQ button & Refresh button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* FAQ Button */}
          <button
            type="button"
            onClick={() => setIsFaqDrawerOpen(!isFaqDrawerOpen)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Browse All FAQs"
            aria-label="Browse All FAQs"
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span className="hidden xs:inline sm:inline">FAQs</span>
          </button>

          {/* Reset Chat Button */}
          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="Clear Chat History"
            aria-label="Clear Chat History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. CHAT MESSAGES SCROLLABLE STREAM (Fills Middle Viewport) */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 bg-slate-100/60"
      >
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showDateHeader =
            !prevMsg || formatWhatsAppDate(msg.date) !== formatWhatsAppDate(prevMsg.date);

          return (
            <React.Fragment key={msg.id}>
              {/* WhatsApp-Style Date Header Badge */}
              {showDateHeader && (
                <div className="flex justify-center my-2">
                  <span className="bg-white/95 backdrop-blur-xs text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-2xs border border-slate-200/80">
                    {formatWhatsAppDate(msg.date)}
                  </span>
                </div>
              )}

              <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%]">
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mb-1 ring-1 ring-white shadow-2xs">
                      <ChatbotLogoIcon className="w-4 h-4" />
                    </div>
                  )}

                  {/* Speech Bubble */}
                  <div
                    className={`px-3.5 py-3 shadow-2xs text-xs sm:text-sm ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-2xl rounded-tr-xs'
                        : 'bg-white text-slate-900 border border-slate-200/80 rounded-2xl rounded-tl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100">
                        <span className="text-[11px] font-black text-amber-600 flex items-center gap-1">
                          Mayra
                        </span>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className={isUser ? 'text-white' : 'text-slate-900'}>
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* 3. REAL PERSON ESCALATION BUTTONS (Merged inside the bot in requested exact order) */}
                    {msg.needsEscalation && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200/90 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800">
                          <Phone className="w-3.5 h-3.5 text-amber-500" />
                          <span>Direct Support & Contractor Desk</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* 1. WHATSAPP BUTTON (First priority as specified) */}
                          <a
                            href={SUPPORT_CONTACTS.whatsapp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 shrink-0" />
                            <span>1. WhatsApp Chat</span>
                          </a>

                          {/* 2. MAIL BUTTON (Second priority as specified) */}
                          <a
                            href={SUPPORT_CONTACTS.email.url}
                            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <Mail className="w-4 h-4 shrink-0" />
                            <span>2. Send Email</span>
                          </a>

                          {/* 3. PHONE NUMBER DIALER BUTTON (Third priority as specified) */}
                          <a
                            href={SUPPORT_CONTACTS.phone.url}
                            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <Phone className="w-4 h-4 shrink-0" />
                            <span>3. Call Helpline</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Timestamp & Double check indicator */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isUser ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mb-1 text-[11px] font-bold shadow-2xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-end gap-2 max-w-[85%]">
            <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mb-1 shadow-2xs">
              <ChatbotLogoIcon className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-slate-500 font-medium ml-1">Mayra is analyzing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. FREQUENTLY ASKED QUESTIONS POP-UP DRAWER (Merged directly into Chatbot) */}
      {isFaqDrawerOpen && (
        <div className="bg-white border-t border-slate-200 px-4 py-3 shadow-lg max-h-56 overflow-y-auto shrink-0 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>Tap a Store FAQ to ask Mayra:</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFaqDrawerOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STORE_FAQS.map((faq) => (
              <button
                key={faq.id}
                type="button"
                onClick={() => {
                  setIsFaqDrawerOpen(false);
                  handleSendMessage(faq.question);
                }}
                className="text-left p-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer group"
              >
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900 leading-tight">
                  {faq.question}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {faq.shortAnswer}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. QUICK SUGGESTION CHIPS (Horizontal Scroll above Input Bar) */}
      <div className="shrink-0 px-3 py-2 bg-slate-100/90 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_SUGGESTION_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip.query)}
            disabled={isLoading}
            className="text-[11px] font-bold text-slate-700 bg-white hover:bg-amber-50 hover:text-amber-950 border border-slate-200 rounded-full px-2.5 py-1 whitespace-nowrap transition-colors shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 6. WHATSAPP-STYLE USER INPUT BAR (Fixed at the bottom of the screen) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5 sm:py-3 flex items-center gap-2 shadow-md z-20"
      >
        {/* Input Field */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question or message support..."
          disabled={isLoading}
          className="flex-1 text-xs sm:text-sm bg-slate-100/80 border border-slate-200/90 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs"
          title="Send Message"
          aria-label="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
