import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Volume2, Sparkles, X, MessageSquare, Send, Bot, Loader2
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export function CivicVoiceAssistant() {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Namaste! I am CivicBot, your AI Assistant. Ask me about your complaint status, local pothole hotspots, or municipal rules in spoken English or local languages!',
    },
  ]);
  const [thinking, setThinking] = useState(false);

  const handleSend = (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const userMsg = { sender: 'user' as const, text: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setThinking(true);

    // Simulate Gemini Spoken AI Assistant response
    setTimeout(() => {
      let reply = 'I have queried the municipal portal database for your request.';
      const lower = q.toLowerCase();

      if (lower.includes('status') || lower.includes('complaint')) {
        reply = 'Your recent pothole complaint #TK-4821 on MG Road is currently marked "Under Progress" with Roads Department Contractor. ETA repair completion: Today, 5:00 PM.';
      } else if (lower.includes('pothole') || lower.includes('hazard')) {
        reply = 'There are 3 verified high-severity potholes reported within 1.5 km of your location on Outer Ring Road. Municipal teams have been dispatched.';
      } else if (lower.includes('hello') || lower.includes('hi')) {
        reply = 'Hello! How can I assist your civic reporting today?';
      } else {
        reply = `I registered your query: "${q}". Gemini AI verified 12 active incidents resolved in your ward this week with an average SLA of 18 hours.`;
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
      setThinking(false);

      // Play synthesized audio response simulation
      if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.rate = 1.0;
        synth.speak(utterance);
      }
    }, 1200);
  };

  const toggleListening = () => {
    if (listening) {
      setListening(false);
      return;
    }

    setListening(true);
    showToast('🎙️ Listening... Speak your question naturally', 'info');

    setTimeout(() => {
      setListening(false);
      handleSend('What is the status of my recent pothole complaint?');
    }, 3500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 hover:scale-105 transition-transform"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
      </button>

      {/* Assistant Modal Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] glass-card p-4 rounded-3xl shadow-2xl border border-slate-700/50 bg-slate-900 text-white flex flex-col h-[480px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    CivicBot <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Spoken AI</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Powered by Gemini Multi-Modal Voice</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 my-2 text-xs">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex gap-2 items-center text-slate-400 text-xs italic">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> CivicBot is thinking...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all ${
                  listening
                    ? 'bg-red-600 text-white animate-bounce'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask CivicBot a question..."
                className="input-field text-xs py-2 bg-slate-800/80 border-slate-700 text-white"
              />
              <button
                onClick={() => handleSend()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
