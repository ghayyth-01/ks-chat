'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';
import MessageBubble from '@/components/MessageBubble';
import StreamingIndicator from '@/components/StreamingIndicator';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Metrics = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
};

type ServerEvent =
  | { type: 'delta'; text: string }
  | { type: 'metrics'; metrics: Metrics }
  | { type: 'done'; metrics: Metrics; conversationId?: string };

type Conversation = {
  id: string;
  title: string | null;
  created_at: string | null;
};

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll auto en bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages.length, isStreaming]);

  // 🔐 Récupérer l'utilisateur + conversations
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Supabase getUser error:', error);
        return;
      }

      const id = data.user?.id ?? null;
      setUserId(id);

      if (id) {
        await fetchConversations(id);
      }
    };

    void init();
  }, [supabase]);

  // 📥 Charger la liste des conversations
  const fetchConversations = async (uid: string) => {
    try {
      setLoadingConversations(true);

      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      setConversations(data ?? []);
    } finally {
      setLoadingConversations(false);
    }
  };

  // 📥 Charger les messages d'une conversation
  const loadConversationMessages = async (conversationId: string) => {
    if (!userId) return;

    try {
      setLoadingMessages(true);
      setIsStreaming(false);
      setMetrics(null);

      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const mapped: Message[] =
        (data ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })) ?? [];

      setMessages(mapped);
      setActiveConversationId(conversationId);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 🆕 Nouveau chat
  const startNewChat = () => {
    setMessages([]);
    setMetrics(null);
    setActiveConversationId(null);
    setInput('');
  };

  // ✉️ Envoyer un message
  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    if (!userId) {
      alert('You must be logged in to chat.');
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    };

    const newMessages = [...messages, userMessage, assistantMessage];

    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setMetrics(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          conversationId: activeConversationId, // ➕ on envoie la conversation actuelle (ou null)
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace('data:', '').trim();
          if (!jsonStr) continue;

          let eventData: ServerEvent;
          try {
            eventData = JSON.parse(jsonStr) as ServerEvent;
          } catch {
            continue;
          }

          if (eventData.type === 'delta') {
            assistantText += eventData.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id ? { ...m, content: assistantText } : m
              )
            );
          } else if (eventData.type === 'done') {
            setMetrics(eventData.metrics);

            // 📌 Si le backend renvoie un conversationId (nouvelle conv), on met à jour
            if (!activeConversationId && eventData.conversationId && userId) {
              setActiveConversationId(eventData.conversationId);
              // On rafraîchit la liste des conversations
              void fetchConversations(userId);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.role === 'assistant' && m.content === ''
            ? {
                ...m,
                content: 'Sorry, something went wrong. Please try again.',
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
  <main className="min-h-screen flex bg-slate-950 text-slate-100">
    {/* Sidebar */}
    <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-800 bg-slate-950/95">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Conversations</h2>
          <p className="text-xs text-slate-500">
            {loadingConversations ? 'Loading...' : `${conversations.length} chat(s)`}
          </p>
        </div>
        <button
          onClick={startNewChat}
          className="text-xs px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 transition"
        >
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 text-sm">
        {conversations.length === 0 && !loadingConversations && (
          <p className="text-xs text-slate-500 px-2">
            No conversations yet. Start chatting!
          </p>
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            disabled={isStreaming || loadingMessages}
            onClick={() => void loadConversationMessages(conv.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition border border-transparent ${
              conv.id === activeConversationId
                ? 'bg-slate-800 border-slate-600'
                : 'hover:bg-slate-900'
            }`}
          >
            <div className="truncate text-[11px] text-slate-500">
              {conv.created_at ? new Date(conv.created_at).toLocaleString() : ''}
            </div>
            <div className="truncate text-sm font-medium">
              {conv.title || 'Untitled conversation'}
            </div>
          </button>
        ))}
      </div>
    </aside>

    {/* Zone chat principale */}
    <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-slate-950/70">
        <div>
          <h1 className="font-semibold text-lg">KS Chat</h1>
          <p className="text-xs text-slate-400">
            Chat with your LLM assistant – case study demo
          </p>

          <button
            onClick={startNewChat}
            className="mt-2 inline-flex md:hidden text-xs px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 transition"
          >
            New chat
          </button>
        </div>
        {metrics && (
          <div className="text-xs text-right text-slate-400">
            {metrics.totalTokens !== null && (
              <p>Total tokens: {metrics.totalTokens}</p>
            )}
            {metrics.tokensPerSecond !== null && (
              <p>Tokens/s: {metrics.tokensPerSecond.toFixed(2)}</p>
            )}
          </div>
        )}
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {loadingMessages && (
            <p className="text-xs text-slate-500">Loading messages...</p>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}

          {isStreaming && <StreamingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </section>

      <section className="border-t border-slate-800 p-3">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl shadow-black/40 backdrop-blur-md p-2.5">
            <textarea
              className="w-full rounded-xl bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 resize-none min-h-[60px] placeholder:text-slate-500"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="mt-1 flex justify-between items-center">
              <p className="text-[11px] text-slate-500">
                Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for a new line.
              </p>
              <button
                onClick={() => void sendMessage()}
                disabled={isStreaming || !input.trim()}
                className="rounded-full px-4 py-1.5 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition"
              >
                {isStreaming ? 'Streaming…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
);

}
