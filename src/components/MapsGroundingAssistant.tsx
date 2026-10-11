import React, { useState } from 'react';
import { Sparkles, MapPin, Send, ExternalLink, User, RefreshCw, X } from 'lucide-react';
import { KolkataArea } from '../types';
import { API_BASE_URL } from '../lib/apiBase';
import { useBottomSheetDismiss } from '../hooks/useBottomSheetDismiss';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mapsSources?: Array<{ uri: string; title?: string }>;
}

interface MapsGroundingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentArea: KolkataArea;
}

export const MapsGroundingAssistant = ({
  isOpen,
  onClose,
  currentArea
}: MapsGroundingAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your SmartRun AI Electrical Engineer & Kolkata Grounding Assistant. Ask me anything about:
• Wire gauge sizing (1.5mm vs 2.5mm vs 4mm for ACs & flats)
• Kolkata delivery hub locations and real estate wiring advice
• MCB breaker & DB box selection for WBSEDCL / CESC meters.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMsg: Message = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          userArea: currentArea.name,
          pincode: currentArea.pincode
        })
      });

      if (!res.ok) {
        throw new Error('AI Assistant server error');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.text || 'Here is the electrical guidance for Kolkata.',
          mapsSources: data.mapsSources || []
        }
      ]);
    } catch (err) {
      console.warn('Fallback assistant answer', err);
      // Helpful fallback electrical guidance
      let fallbackText = `For ${currentArea.name} (${currentArea.pincode}):
• Lighting circuits: Use 1.5 sq mm Polycab/Havells FR-LSH wire with 10A C-Curve MCB.
• Power & Air Conditioners: Use 2.5 sq mm wire with 16A/20A MCB.
• Main Meter to Distribution Board: Use 4.0 sq mm or 6.0 sq mm wire with 32A DP Isolator.
• SmartRun Kasba Hub has fast local dispatch ready for these materials!`;

      if (query.toLowerCase().includes('ac') || query.toLowerCase().includes('air conditioner')) {
        fallbackText = `For a 1.5 Ton Inverter AC in Kolkata:
1. Recommended Wire: 2.5 sq mm pure copper (Havells LifeLine HRFR or Polycab FR-LSH).
2. Breaker: 16A or 20A C-Curve MCB (like Havells Euroload).
3. Socket: 16A 3-pin shuttered modular socket (Legrand Arteor / Schneider AvatarOn).
All items are in stock for fast delivery (1–7 Days) to ${currentArea.name}!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fallbackText,
          mapsSources: [
            { uri: 'https://share.google/EWHvo68Oi2DsChWWV', title: 'SmartRun (Kasba Hub), Kolkata' }
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    'How many wire coils for 2BHK 950 sq ft flat in Kolkata?',
    'What MCB rating for 1.5 ton inverter AC?',
    'Where is SmartRun Kasba hub located in Kolkata?',
    'Difference between 1.5mm and 2.5mm Polycab wire?'
  ];

  // Drag down to dismiss gesture on mobile
  const {
    handleTouchStart: handleSheetTouchStart,
    handleTouchMove: handleSheetTouchMove,
    handleTouchEnd: handleSheetTouchEnd,
    dragStyle
  } = useBottomSheetDismiss({
    onClose,
    disabled: !isOpen
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div 
        style={dragStyle}
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full h-[90vh] sm:h-[85vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Mobile Swipe Handle */}
        <div
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          className="w-full flex flex-col items-center justify-center pt-2.5 pb-1 sm:hidden cursor-grab active:cursor-grabbing touch-none select-none bg-gradient-to-r from-amber-500 to-yellow-500"
        >
          <div className="w-12 h-1.5 bg-slate-900/40 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-yellow-400 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5 fill-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-black leading-tight flex items-center gap-1.5">
                <span>AI Electrical &amp; Kolkata Maps Assistant</span>
                <span className="px-1.5 py-0.2 rounded bg-black text-yellow-300 text-[10px] font-extrabold uppercase">
                  Powered by Gemini
                </span>
              </h3>
              <p className="text-[11px] font-semibold text-slate-900">
                Grounding location: {currentArea.name} ({currentArea.pincode})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-yellow-400 text-black flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ⚡
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white font-medium rounded-tr-xs shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>

                {/* Google Maps Grounding Link Sources if provided */}
                {msg.mapsSources && msg.mapsSources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                    <div className="text-[10px] font-bold text-green-700 uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>Verified Google Maps Grounding Links:</span>
                    </div>
                    {msg.mapsSources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded mr-1.5"
                      >
                        <span>{src.title || 'View Kolkata Location on Google Maps'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 w-fit">
              <RefreshCw className="w-4 h-4 animate-spin text-yellow-600" />
              <span>Analyzing electrical specifications &amp; Kolkata hub routes...</span>
            </div>
          )}
        </div>

        {/* Quick Sample Questions */}
        <div className="px-3 py-2 bg-white border-t border-slate-200 flex gap-1.5 overflow-x-auto no-scrollbar">
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setInput(q)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-yellow-50 hover:text-yellow-900 border border-slate-200 text-[11px] font-semibold text-slate-600 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
          <input
            type="text"
            placeholder="Ask about wire gauges, MCBs, cement, or Kolkata delivery..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};
