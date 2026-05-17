import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Send, X, Bot, User, Sparkles, BrainCircuit } from "lucide-react";
import { AIService } from "../services/aiService";
import { cn } from "../lib/utils";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant({ context }: { context?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Bonjour ! Je suis l'assistant intelligent Nexus. Comment puis-je vous aider dans vos achats aujourd'hui ?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const prompt = `
        You are Nexus AI, a professional ERP & Marketplace assistant for African businesses.
        Context: ${context || "Nexus ERP Marketplace"}.
        The user is asking: "${input}".
        Provide a helpful, concise, and professional response in French.
        Focus on practicality, value, and products available in the marketplace.
      `;

      const response = await AIService.enhanceProductDescription(prompt, "General Assistance"); // Using a general proxy
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI Assistant Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-900 transition-all border-4 border-white group"
      >
        <BrainCircuit size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em]">
          Conseiller AI
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-6 right-6 w-full max-w-md h-[600px] bg-white rounded-[3rem] shadow-2xl z-[101] flex flex-col overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <BrainCircuit size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase italic tracking-widest text-blue-400">Assistant Nexus AI</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">En ligne</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-50/50">
                {messages.map((msg) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                      msg.role === 'assistant' 
                        ? "bg-blue-600 text-white border-blue-500" 
                        : "bg-white text-slate-400 border-slate-100"
                    )}>
                      {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-3xl text-sm font-medium leading-relaxed",
                      msg.role === 'assistant'
                        ? "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none"
                        : "bg-slate-900 text-white rounded-tr-none"
                    )}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 max-w-[85%] mr-auto">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center animate-pulse">
                      <Bot size={16} />
                    </div>
                    <div className="p-4 bg-white rounded-3xl rounded-tl-none shadow-sm border border-slate-100 italic text-slate-400 text-xs flex items-center gap-2">
                       L'IA réfléchit...
                       <div className="flex gap-1">
                          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce delay-0" />
                          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce delay-150" />
                          <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce delay-300" />
                       </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white border-t border-slate-100">
                 <div className="relative group">
                    <input 
                      type="text"
                      placeholder="Comment l'IA peut-elle vous aider ?"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-6 pr-14 text-sm font-bold focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-400 shadow-inner"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        input.trim() && !isLoading ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-200 text-slate-400"
                      )}
                    >
                      <Send size={18} />
                    </button>
                 </div>
                 <p className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-widest text-center flex items-center justify-center gap-2">
                    <Sparkles size={10} className="text-amber-500" /> Propulsé par Nexus AI Enterprise
                 </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
