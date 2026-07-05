'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { aiAssistantApi } from '@/lib/api';
import {
  Bot, Send, User, Sparkles, RefreshCw,
  Shield, AlertTriangle, ClipboardCheck, FileText,
  BookOpen, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm',
        )}
      >
        {message.content.split('\n').map((line, i) => {
          if (line.startsWith('## ')) {
            return <p key={i} className="font-semibold mt-3 mb-1 first:mt-0">{line.replace('## ', '')}</p>;
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={i} className="font-semibold mt-2">{line.slice(2, -2)}</p>;
          }
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return (
              <div key={i} className="flex gap-2 mt-1">
                <span className="text-blue-400 flex-shrink-0">•</span>
                <span>{line.slice(2)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <div key={i} className="flex gap-2 mt-1">
                <span className="flex-shrink-0 font-medium">{line.match(/^\d+/)?.[0]}.</span>
                <span>{line.replace(/^\d+\.\s/, '')}</span>
              </div>
            );
          }
          if (line.trim() === '') return <div key={i} className="h-2" />;
          const parts = line.split(/\*\*(.+?)\*\*/g);
          return (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
            </p>
          );
        })}
        <p className={cn('text-xs mt-2 opacity-60', isUser ? 'text-blue-100' : 'text-gray-400')}>
          {message.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const t = useTranslations('aiAssistant');

  const SUGGESTED_PROMPTS = [
    { icon: Shield,         label: t('prompt1Label'), prompt: t('prompt1Prompt') },
    { icon: AlertTriangle,  label: t('prompt2Label'), prompt: t('prompt2Prompt') },
    { icon: ClipboardCheck, label: t('prompt3Label'), prompt: t('prompt3Prompt') },
    { icon: FileText,       label: t('prompt4Label'), prompt: t('prompt4Prompt') },
    { icon: BookOpen,       label: t('prompt5Label'), prompt: t('prompt5Prompt') },
    { icon: Activity,       label: t('prompt6Label'), prompt: t('prompt6Prompt') },
  ];

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t('initialMessage'), timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const apiMessages = newMessages.map(({ role, content }) => ({ role, content }));
      const res = await aiAssistantApi.chat(apiMessages);
      const reply = res.data.reply as string;
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('fallbackError');
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: t('resetMessage'), timestamp: new Date() }]);
    setError(null);
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      {/* Header bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">iComply AI</span>
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {t('online')}
              </span>
            </div>
            <p className="text-xs text-gray-500">{t('botSubtitle')}</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('newConversation')}
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && <TypingIndicator />}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl max-w-lg text-center">
              <strong>{t('errorLabel')}</strong> {error}
            </div>
          </div>
        )}

        {showSuggestions && !loading && (
          <div className="pt-4">
            <p className="text-xs text-gray-400 text-center mb-3 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> {t('suggestionsLabel')}
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
              {SUGGESTED_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-7 h-7 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="bg-white border-t px-6 py-4 flex-shrink-0">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('inputPlaceholder')}
              rows={1}
              style={{ resize: 'none' }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 transition-colors overflow-hidden"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 160) + 'px';
              }}
              disabled={loading}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
              input.trim() && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            )}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">{t('footer')}</p>
      </div>
    </div>
  );
}
