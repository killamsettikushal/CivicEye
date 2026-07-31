import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, Mic, Smile, Pin, Search, X, Reply, Trash2, CreditCard as Edit2, Check, Users, Settings, BadgeCheck, CheckCheck, Play, Pause, Plus } from 'lucide-react';
import type { ChatMessage, ChatReactionType, GroupMember, UserSearchResult, CommunityGroup } from '@/types';
import { groupChatService } from '@/services/groupChatService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getInitials, formatDateTime } from '@/utils/helpers';
import { supabase } from '@/services/supabaseClient';
import { Modal } from '@/components/ui/Modal';

const EMOJI_LIST: string[] = [
  '\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F389}', '\u{1F622}',
];
const REACTION_TYPES: { type: ChatReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '\u{1F44D}', label: 'Like' },
  { type: 'love', emoji: '\u{2764}\u{FE0F}', label: 'Love' },
  { type: 'laugh', emoji: '\u{1F602}', label: 'Laugh' },
  { type: 'wow', emoji: '\u{1F62E}', label: 'Wow' },
  { type: 'sad', emoji: '\u{1F622}', label: 'Sad' },
  { type: 'celebrate', emoji: '\u{1F389}', label: 'Celebrate' },
];

interface GroupChatPageProps {
  group: CommunityGroup;
  onBack: () => void;
}

export function GroupChatPage({ group, onBack }: GroupChatPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileImageRef = useRef<HTMLInputElement>(null);
  const fileDocRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!user) return;
    loadMessages();
    loadMembers();
    loadPinnedMessages();
  }, [group.id, user]);

  useEffect(() => {
    if (!user) return;

    const msgChannel = groupChatService.subscribeToMessages(
      group.id,
      (message) => {
        message.isOwn = message.senderId === user.id;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        if (message.senderId !== user.id) {
          groupChatService.markAsRead([message.id], user.id);
        }
        setTimeout(scrollToBottom, 100);
      },
      (messageId) => {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedBySender: true } : m));
      },
      (message) => {
        message.isOwn = message.senderId === user.id;
        setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, ...message } : m));
      },
    );

    const reactionChannel = groupChatService.subscribeToReactions(group.id, async (messageId) => {
      const { data } = await supabase
        .from('group_chat_reactions')
        .select('type, user_id')
        .eq('message_id', messageId);
      const summariesMap: Record<string, string[]> = {};
      for (const r of data ?? []) {
        if (!summariesMap[r.type]) summariesMap[r.type] = [];
        summariesMap[r.type].push(r.user_id);
      }
      const reactionSummaries = Object.entries(summariesMap).map(([type, userIds]) => ({ type: type as ChatReactionType, count: userIds.length, userIds }));
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions: reactionSummaries } : m));
    });

    const typingChannel = groupChatService.subscribeToTyping(group.id, user.id, (userIds) => {
      setTypingUsers(userIds);
    });

    const pinnedChannel = groupChatService.subscribeToPinnedMessages(group.id, () => {
      loadPinnedMessages();
    });

    return () => {
      msgChannel.unsubscribe();
      reactionChannel.unsubscribe();
      typingChannel.unsubscribe();
      pinnedChannel.unsubscribe();
    };
  }, [group.id, user, scrollToBottom]);

  const loadMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await groupChatService.getMessages(group.id, user.id);
      setMessages(data);
      const unreadIds = data.filter((m) => !m.isOwn).map((m) => m.id);
      if (unreadIds.length > 0) await groupChatService.markAsRead(unreadIds, user.id);
      setTimeout(scrollToBottom, 100);
    } catch { showToast('Failed to load messages', 'error'); }
    finally { setLoading(false); }
  };

  const loadMembers = async () => {
    try {
      const data = await groupChatService.getGroupMembers(group.id);
      setMembers(data);
    } catch { showToast('Failed to load members', 'error'); }
  };

  const loadPinnedMessages = async () => {
    if (!user) return;
    try {
      const data = await groupChatService.getPinnedMessages(group.id, user.id);
      setPinnedMessages(data);
    } catch { setPinnedMessages([]); }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;
    try {
      await groupChatService.sendMessage(group.id, user.id, {
        body: inputText.trim(),
        replyToId: replyTo?.id ?? null,
      });
      setInputText('');
      setReplyTo(null);
      setShowEmoji(false);
    } catch { showToast('Failed to send message', 'error'); }
  };

  const handleSendFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const { url, name, type } = await groupChatService.uploadMedia(file, user.id);
      await groupChatService.sendMessage(group.id, user.id, {
        messageType: type,
        mediaUrl: url,
        mediaName: name,
        body: '',
      });
      showToast('File sent', 'success');
    } catch (err: any) { showToast('Failed to upload: ' + err.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleSendVoiceNote = async () => {
    if (!audioBlob || !user) return;
    setUploading(true);
    try {
      const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const { url, name, type } = await groupChatService.uploadMedia(file, user.id);
      await groupChatService.sendMessage(group.id, user.id, {
        messageType: 'voice',
        mediaUrl: url,
        mediaName: name,
        voiceDuration: recordingDuration,
        body: '',
      });
      setAudioBlob(null);
      setRecordingDuration(0);
      showToast('Voice note sent', 'success');
    } catch (err: any) { showToast('Failed to send voice note', 'error'); }
    finally { setUploading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch { showToast('Microphone access denied', 'error'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  const handleTyping = (value: string) => {
    setInputText(value);
    if (user && value.trim()) {
      groupChatService.setTyping(group.id, user.id).catch(() => {});
    }
  };

  const handleReaction = async (messageId: string, type: ChatReactionType) => {
    if (!user) return;
    setReactionPickerFor(null);
    try {
      await groupChatService.toggleReaction(messageId, type, user.id);
    } catch { showToast('Failed to react', 'error'); }
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    if (!user) return;
    if (!confirm('Delete this message?')) return;
    try {
      await groupChatService.deleteMessage(message.id, user.id);
      showToast('Message deleted', 'success');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleEditMessage = async () => {
    if (!user || !editingMessage || !editText.trim()) return;
    try {
      await groupChatService.editMessage(editingMessage.id, user.id, editText.trim());
      setMessages((prev) => prev.map((m) => m.id === editingMessage.id ? { ...m, body: editText.trim(), editedAt: new Date().toISOString() } : m));
      setEditingMessage(null);
      setEditText('');
      showToast('Message edited', 'success');
    } catch { showToast('Failed to edit', 'error'); }
  };

  const handlePinMessage = async (message: ChatMessage) => {
    if (!user) return;
    try {
      const pinned = await groupChatService.togglePinMessage(group.id, message.id, user.id);
      showToast(pinned ? 'Message pinned' : 'Message unpinned', 'success');
    } catch { showToast('Failed to pin message', 'error'); }
  };

  const handleSearchMessages = async () => {
    if (!user || !searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const results = await groupChatService.searchMessages(group.id, searchQuery, user.id);
      setSearchResults(results);
    } catch { showToast('Search failed', 'error'); }
  };

  const isAdmin = members.find((m) => m.userId === user?.id)?.role === 'admin';
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const typingNames = typingUsers.map((id) => memberMap.get(id)?.name ?? 'Someone');

  const renderMessage = (msg: ChatMessage) => {
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2 ${msg.isOwn ? 'flex-row-reverse' : ''}`}
      >
        {!msg.isOwn && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden mt-1">
            {msg.senderAvatar ? <img src={msg.senderAvatar} alt="" className="w-full h-full object-cover" /> : getInitials(msg.senderName)}
          </div>
        )}

        <div className={`max-w-[75%] group ${msg.isOwn ? 'items-end' : ''}`}>
          {msg.replyTo && !msg.replyTo.deletedBySender && (
            <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 ${msg.isOwn ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-500/10' : 'border-slate-300 bg-slate-50 dark:bg-slate-800/50'}`}>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{msg.replyTo.senderName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{msg.replyTo.body || `[${msg.replyTo.messageType}]`}</p>
            </div>
          )}

          <div
            className={`relative rounded-2xl px-3.5 py-2 ${msg.isOwn
              ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
            }`}
            onMouseLeave={() => setReactionPickerFor(null)}
          >
            {!msg.isOwn && !msg.deletedBySender && (
              <p className="text-xs font-semibold mb-0.5 text-blue-600 dark:text-blue-400">{msg.senderName}</p>
            )}

            {msg.deletedBySender ? (
              <p className={`text-sm italic ${msg.isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                This message was deleted
              </p>
            ) : msg.messageType === 'text' ? (
              <>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                {msg.editedAt && <p className={`text-[10px] mt-0.5 ${msg.isOwn ? 'text-blue-200' : 'text-slate-400'}`}>(edited)</p>}
              </>
            ) : msg.messageType === 'image' ? (
              <img src={msg.mediaUrl ?? ''} alt={msg.mediaName ?? ''} className="rounded-lg max-w-full max-h-64" />
            ) : msg.messageType === 'video' ? (
              <video src={msg.mediaUrl ?? ''} controls className="rounded-lg max-w-full max-h-64" />
            ) : msg.messageType === 'voice' ? (
              <VoiceNotePlayer url={msg.mediaUrl ?? ''} duration={msg.voiceDuration ?? 0} isOwn={msg.isOwn} />
            ) : (
              <a href={msg.mediaUrl ?? ''} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 ${msg.isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                <Paperclip className="w-4 h-4" />
                <span className="text-sm underline">{msg.mediaName ?? 'Document'}</span>
              </a>
            )}

            <div className={`flex items-center gap-1 mt-0.5 ${msg.isOwn ? 'justify-end' : ''}`}>
              <span className={`text-[10px] ${msg.isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.isOwn && !msg.deletedBySender && (
                <span className={`text-[10px] flex items-center gap-0.5 ${msg.isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.readByCount > 0 ? <><CheckCheck className="w-3 h-3" />{msg.readByCount}</> : <Check className="w-3 h-3" />}
                </span>
              )}
            </div>

            {!msg.deletedBySender && (
              <div className={`absolute -top-3 ${msg.isOwn ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 px-1 py-0.5`}>
                <button onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="React"><Smile className="w-3.5 h-3.5 text-slate-500" /></button>
                <button onClick={() => setReplyTo(msg)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Reply"><Reply className="w-3.5 h-3.5 text-slate-500" /></button>
                {msg.isOwn && msg.messageType === 'text' && (
                  <button onClick={() => { setEditingMessage(msg); setEditText(msg.body); }} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit"><Edit2 className="w-3.5 h-3.5 text-slate-500" /></button>
                )}
                {msg.isOwn && (
                  <button onClick={() => handleDeleteMessage(msg)} className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                )}
                {(isAdmin || msg.isOwn) && (
                  <button onClick={() => handlePinMessage(msg)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Pin"><Pin className="w-3.5 h-3.5 text-slate-500" /></button>
                )}
              </div>
            )}

            <AnimatePresence>
              {reactionPickerFor === msg.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 5 }}
                  className={`absolute -top-10 ${msg.isOwn ? 'left-2' : 'right-2'} flex items-center gap-0.5 glass-card !rounded-full p-1 shadow-lg z-10`}
                >
                  {REACTION_TYPES.map((r) => (
                    <button key={r.type} onClick={() => handleReaction(msg.id, r.type)} className="p-1.5 rounded-full hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title={r.label}>
                      <span className="text-lg">{r.emoji}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {msg.reactions.length > 0 && (
            <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? 'justify-end' : ''}`}>
              {msg.reactions.map((r) => {
                const config = REACTION_TYPES.find((rt) => rt.type === r.type);
                return (
                  <div key={r.type} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs">{config?.emoji ?? '\u{1F44D}'}</span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{r.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Chat header */}
      <div className="glass-card p-3 flex items-center gap-3 mb-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{group.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{members.length} members</p>
        </div>
        <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Search messages">
          <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
        {pinnedMessages.length > 0 && (
          <button onClick={() => setShowPinned(!showPinned)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Pinned messages">
            <Pin className="w-5 h-5 text-amber-500" />
          </button>
        )}
        <button onClick={() => setShowMembers(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Members">
          <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Settings">
          <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3">
            <div className="glass-card p-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchMessages()} placeholder="Search messages in this group..." className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none" autoFocus />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((msg) => (
                    <div key={msg.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm">
                      <span className="text-xs font-medium text-blue-500">{msg.senderName}</span>
                      <p className="text-slate-700 dark:text-slate-200 truncate">{msg.body}</p>
                      <span className="text-[10px] text-slate-400">{formatDateTime(msg.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned messages banner */}
      <AnimatePresence>
        {showPinned && pinnedMessages.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3">
            <div className="glass-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><Pin className="w-4 h-4 text-amber-500" /> Pinned Messages</span>
                <button onClick={() => setShowPinned(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {pinnedMessages.map((msg) => (
                  <div key={msg.id} className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{msg.senderName}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{msg.body || `[${msg.messageType}]`}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Send className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => renderMessage(msg))}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} className="w-2 h-2 rounded-full bg-slate-400" />
                  ))}
                </div>
                <span className="text-xs text-slate-400">{typingNames.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-card p-2 mb-2 flex items-center gap-2">
            <Reply className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-500">Replying to {replyTo.senderName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{replyTo.body || `[${replyTo.messageType}]`}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit preview */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-card p-2 mb-2 flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-500">Editing message</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{editingMessage.body}</p>
            </div>
            <button onClick={() => { setEditingMessage(null); setEditText(''); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-card p-3 mb-2 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-slate-700 dark:text-slate-200">Recording... {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}</span>
            <button onClick={cancelRecording} className="ml-auto text-red-500 text-sm hover:underline">Cancel</button>
            <button onClick={stopRecording} className="text-emerald-500 text-sm hover:underline">Stop</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio preview */}
      <AnimatePresence>
        {audioBlob && !isRecording && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-card p-3 mb-2 flex items-center gap-3">
            <Play className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-700 dark:text-slate-200">Voice note ({recordingDuration}s)</span>
            <button onClick={cancelRecording} className="ml-auto text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            <button onClick={handleSendVoiceNote} disabled={uploading} className="text-blue-500 text-sm hover:underline">{uploading ? 'Sending...' : 'Send'}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-card p-3 mb-2 flex items-center gap-1 flex-wrap">
            {EMOJI_LIST.map((emoji) => (
              <button key={emoji} onClick={() => { setInputText((prev) => prev + emoji); setShowEmoji(false); }} className="text-2xl p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">{emoji}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      {editingMessage ? (
        <div className="glass-card p-3 flex items-center gap-2">
          <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditMessage()} className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none" autoFocus />
          <button onClick={handleEditMessage} className="p-2 rounded-lg bg-blue-600 text-white"><Check className="w-4 h-4" /></button>
          <button onClick={() => { setEditingMessage(null); setEditText(''); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="glass-card p-2 flex items-end gap-2">
          <input ref={fileImageRef} type="file" accept="image/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSendFile(f); e.target.value = ''; }} className="hidden" />
          <input ref={fileDocRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSendFile(f); e.target.value = ''; }} className="hidden" />

          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Emoji"><Smile className="w-5 h-5" /></button>
          <button onClick={() => fileImageRef.current?.click()} disabled={uploading} className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Send image/video"><ImageIcon className="w-5 h-5" /></button>
          <button onClick={() => fileDocRef.current?.click()} disabled={uploading} className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title="Send document"><Paperclip className="w-5 h-5" /></button>

          <textarea
            value={inputText}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={1}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none resize-none max-h-32 py-2"
          />

          {isRecording ? (
            <button onClick={stopRecording} className="p-2.5 rounded-full bg-red-500 text-white" title="Stop recording"><Pause className="w-5 h-5" /></button>
          ) : (
            <button onClick={startRecording} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Record voice note"><Mic className="w-5 h-5" /></button>
          )}

          <button onClick={handleSend} disabled={!inputText.trim() || uploading} className="p-2.5 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white disabled:opacity-50 transition-opacity" title="Send">
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Members modal */}
      <Modal isOpen={showMembers} onClose={() => setShowMembers(false)} title="Group Members" size="md">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(member.name)}
                </div>
                {member.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{member.name}</p>
                  {member.level === 'Gold' && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">@{member.username}{member.city ? ` - ${member.city}` : ''}</p>
              </div>
              {member.role === 'admin' && <span className="badge bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 text-[10px]">Admin</span>}
            </div>
          ))}
        </div>
      </Modal>

      {/* Settings modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Group Settings" size="md">
        <GroupManagementPanel
          group={group}
          members={members}
          isAdmin={isAdmin}
          currentUserId={user?.id ?? ''}
          onMembersChanged={loadMembers}
          onGroupUpdated={() => { setShowSettings(false); onBack(); }}
          onGroupDeleted={() => { setShowSettings(false); onBack(); }}
          onLeaveGroup={() => { setShowSettings(false); onBack(); }}
        />
      </Modal>
    </div>
  );
}

// ============ Voice Note Player ============

function VoiceNotePlayer({ url, duration, isOwn }: { url: string; duration: number; isOwn: boolean }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <button onClick={togglePlay} className={`p-1.5 rounded-full ${isOwn ? 'bg-blue-400/30 text-white' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className={`flex items-center gap-0.5 ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
        {Array.from({ length: Math.min(duration, 20) }).map((_, i) => (
          <div key={i} className={`w-0.5 rounded-full ${isOwn ? 'bg-blue-200' : 'bg-slate-400'}`} style={{ height: `${8 + Math.sin(i) * 6}px` }} />
        ))}
      </div>
      <span className={`text-xs ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</span>
    </div>
  );
}

// ============ Group Management Panel ============

interface GroupManagementPanelProps {
  group: CommunityGroup;
  members: GroupMember[];
  isAdmin: boolean;
  currentUserId: string;
  onMembersChanged: () => void;
  onGroupUpdated: () => void;
  onGroupDeleted: () => void;
  onLeaveGroup: () => void;
}

function GroupManagementPanel({ group, members, isAdmin, currentUserId, onMembersChanged, onGroupUpdated, onGroupDeleted, onLeaveGroup }: GroupManagementPanelProps) {
  const { showToast } = useToast();
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description);
  const [saving, setSaving] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!addMemberQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const excludeIds = [currentUserId, ...members.map((m) => m.userId)];
      const results = await groupChatService.searchUsers(addMemberQuery, excludeIds);
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [addMemberQuery, members, currentUserId]);

  const handleSaveGroup = async () => {
    setSaving(true);
    try {
      await groupChatService.updateGroup(group.id, currentUserId, {
        name: editName,
        description: editDescription,
      });
      onGroupUpdated();
      showToast('Group updated', 'success');
    } catch { showToast('Failed to update group', 'error'); }
    finally { setSaving(false); }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await groupChatService.addMember(group.id, userId, currentUserId);
      onMembersChanged();
      setAddMemberQuery('');
      setSearchResults([]);
      showToast('Member added', 'success');
    } catch (err: any) { showToast('Failed to add member: ' + err.message, 'error'); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the group?')) return;
    try {
      await groupChatService.removeMember(group.id, userId, currentUserId);
      onMembersChanged();
      showToast('Member removed', 'success');
    } catch (err: any) { showToast('Failed to remove member: ' + err.message, 'error'); }
  };

  const handlePromoteAdmin = async (userId: string) => {
    try {
      await groupChatService.promoteAdmin(group.id, userId);
      onMembersChanged();
      showToast('Promoted to admin', 'success');
    } catch (err: any) { showToast('Failed to promote: ' + err.message, 'error'); }
  };

  const handleDemoteAdmin = async (userId: string) => {
    try {
      await groupChatService.demoteAdmin(group.id, userId);
      onMembersChanged();
      showToast('Demoted to member', 'success');
    } catch (err: any) { showToast('Failed to demote: ' + err.message, 'error'); }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Leave this group? You will no longer receive messages.')) return;
    try {
      await groupChatService.leaveGroup(group.id, currentUserId);
      onLeaveGroup();
      showToast('Left group', 'success');
    } catch { showToast('Failed to leave group', 'error'); }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Delete this group? All messages will be permanently deleted. This cannot be undone.')) return;
    try {
      await groupChatService.deleteGroup(group.id, currentUserId);
      onGroupDeleted();
      showToast('Group deleted', 'success');
    } catch { showToast('Failed to delete group', 'error'); }
  };

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Group Info</h4>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field !py-2 !text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Description</label>
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className="input-field resize-none !py-2 !text-sm" />
          </div>
          <button onClick={handleSaveGroup} disabled={saving} className="btn-primary !py-2 !text-sm">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Add Members</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={addMemberQuery} onChange={(e) => setAddMemberQuery(e.target.value)} placeholder="Search by name or username..." className="input-field !pl-10 !py-2 !text-sm" />
            {searchLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>}
          </div>
          {searchResults.length > 0 && (
            <div className="glass-card !rounded-xl p-1 max-h-48 overflow-y-auto">
              {searchResults.map((result) => (
                <button key={result.id} onClick={() => handleAddMember(result.id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                    {result.avatar ? <img src={result.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(result.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{result.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">@{result.username}</p>
                  </div>
                  <Plus className="w-4 h-4 text-blue-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Members ({members.length})</h4>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{member.name}{member.userId === currentUserId ? ' (You)' : ''}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">@{member.username}</p>
              </div>
              {member.role === 'admin' && <span className="badge bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 text-[10px]">Admin</span>}
              {isAdmin && member.userId !== currentUserId && (
                <div className="flex items-center gap-1">
                  {member.role === 'admin'
                    ? <button onClick={() => handleDemoteAdmin(member.userId)} className="p-1.5 rounded-lg text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10" title="Demote">Demote</button>
                    : <button onClick={() => handlePromoteAdmin(member.userId)} className="p-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="Promote">Promote</button>
                  }
                  <button onClick={() => handleRemoveMember(member.userId)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <button onClick={handleLeaveGroup} className="w-full btn-secondary !py-2 !text-sm text-amber-600 dark:text-amber-400">Leave Group</button>
        {isAdmin && <button onClick={handleDeleteGroup} className="w-full btn-secondary !py-2 !text-sm text-red-600 dark:text-red-400 !border-red-200 dark:!border-red-500/20">Delete Group</button>}
      </div>
    </div>
  );
}
