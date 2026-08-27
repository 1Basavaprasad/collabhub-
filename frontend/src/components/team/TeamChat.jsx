import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  Users,
  Trash2,
  MessageSquare,
  Shield,
  Clock,
  X,
  RotateCcw,
  Search,
  Pin,
  Smile,
  CornerDownRight,
  Edit2,
  Copy,
  Check,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AtSign,
  AlertTriangle,
  Lock,
  Sparkles,
  Paperclip,
  CheckCheck,
} from 'lucide-react';
import Avatar, { getDisplayName } from '../Avatar';
import Button from '../Button';
import Card from '../Card';
import Badge from '../Badge';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import {
  getTeamMessagesApi,
  sendTeamMessageApi,
  editTeamMessageApi,
  deleteTeamMessageApi,
  toggleMessageReactionApi,
  togglePinMessageApi,
  getPinnedMessagesApi,
  searchTeamMessagesApi,
  markTeamChatReadApi,
  getTeamsUnreadCountsApi,
} from '../../api/teamChatApi';
import { useToast } from '../Toast';

const POPULAR_EMOJIS = ['👍', '❤️', '🎉', '👀', '✅', '🚀', '🔥', '👏'];

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getMessageDateGroupKey = (dateString) => {
  if (!dateString) return 'Earlier';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Earlier';
  const now = new Date();

  if (d.toDateString() === now.toDateString()) {
    return 'Today';
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const TeamChat = ({
  team,
  teamMembers = [],
  allTeams = [],
  onSelectTeam,
}) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { addToast } = useToast();

  // Core Messages State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});

  // Layout Drawers State
  const [teamsDrawerOpen, setTeamsDrawerOpen] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('members'); // 'members' | 'pinned' | 'search'

  // Reply & Edit State
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [activeEmojiPickerMsgId, setActiveEmojiPickerMsgId] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Mentions State
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Pinned Messages State
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);

  // Highlighting message
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const editInputRef = useRef(null);
  const messageRefs = useRef({});

  const isCurrentUserLeadOrAdmin = useMemo(() => {
    if (!user) return false;
    if (user.company_role === 'OWNER' || user.company_role === 'ADMIN') return true;
    const currentMember = teamMembers.find((m) => m.id === user.id || m.user_id === user.id);
    return currentMember && currentMember.role === 'LEAD';
  }, [user, teamMembers]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  const scrollToMessage = useCallback((msgId) => {
    const el = messageRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 2500);
    }
  }, []);

  // Load Messages & Mark Read
  const loadMessages = useCallback(async (isInitial = false) => {
    if (!currentCompany?.id || !team?.id) return;
    try {
      if (isInitial) setLoading(true);
      const res = await getTeamMessagesApi(currentCompany.id, team.id, 100, 0);
      const fetched = res?.messages || [];
      setMessages(fetched);

      if (isInitial) {
        setTimeout(() => scrollToBottom(false), 60);
      }

      // Mark as read
      if (fetched.length > 0) {
        const latestId = fetched[fetched.length - 1].id;
        markTeamChatReadApi(currentCompany.id, team.id, latestId).catch(() => {});
      }
    } catch (err) {
      if (isInitial) {
        const errorMsg = err.response?.data?.detail || 'Failed to load team chat.';
        addToast({ type: 'error', message: errorMsg });
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [currentCompany?.id, team?.id, addToast, scrollToBottom]);

  // Load Unread Counts
  const loadUnreadCounts = useCallback(async () => {
    if (!currentCompany?.id) return;
    try {
      const res = await getTeamsUnreadCountsApi(currentCompany.id);
      const map = {};
      (res || []).forEach((item) => {
        map[item.team_id] = item.unread_count || 0;
      });
      setUnreadCounts(map);
    } catch {
      // Ignore background poll errors
    }
  }, [currentCompany?.id]);

  // Load Pinned Messages
  const loadPinnedMessages = useCallback(async () => {
    if (!currentCompany?.id || !team?.id) return;
    setPinnedLoading(true);
    try {
      const res = await getPinnedMessagesApi(currentCompany.id, team.id);
      setPinnedMessages(res || []);
    } catch {
      // Ignore
    } finally {
      setPinnedLoading(false);
    }
  }, [currentCompany?.id, team?.id]);

  // Initial Load on team change
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessageId(null);
    loadMessages(true);
    loadPinnedMessages();
    loadUnreadCounts();
  }, [team?.id, loadMessages, loadPinnedMessages, loadUnreadCounts]);

  // Polling for new messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(false);
      loadUnreadCounts();
    }, 4000);
    return () => clearInterval(interval);
  }, [loadMessages, loadUnreadCounts]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => {
      setActiveActionMenuId(null);
      setActiveEmojiPickerMsgId(null);
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending || !currentCompany?.id || !team?.id) return;

    // Detect mentioned users
    const mentionedIds = [];
    teamMembers.forEach((m) => {
      const uName = m.username || m.user?.username;
      if (uName && trimmed.includes(`@${uName}`)) {
        mentionedIds.push(m.id || m.user_id);
      }
    });

    setSending(true);
    try {
      const payload = {
        message: trimmed,
        reply_to_message_id: replyingTo?.id || null,
        mentioned_user_ids: mentionedIds.length > 0 ? mentionedIds : null,
      };

      const createdMsg = await sendTeamMessageApi(currentCompany.id, team.id, payload);
      setMessages((prev) => [...prev, createdMsg]);
      setInputText('');
      setReplyingTo(null);
      setMentionPosition(null);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setTimeout(() => scrollToBottom(true), 30);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send message.';
      addToast({ type: 'error', message: errorMsg });
    } finally {
      setSending(false);
    }
  };

  // Handle Edit Message
  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.message);
    setActiveActionMenuId(null);
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  };

  const handleSaveEdit = async (msgId) => {
    const trimmed = editingText.trim();
    if (!trimmed || !currentCompany?.id || !team?.id) return;

    try {
      const updated = await editTeamMessageApi(currentCompany.id, team.id, msgId, {
        message: trimmed,
      });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      setEditingMessageId(null);
      setEditingText('');
      addToast({ type: 'success', message: 'Message updated.' });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to edit message.';
      addToast({ type: 'error', message: errorMsg });
    }
  };

  // Delete Message (Soft delete)
  const handleDeleteMessage = async (messageId) => {
    if (!currentCompany?.id || !team?.id) return;
    try {
      await deleteTeamMessageApi(currentCompany.id, team.id, messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, deleted_at: new Date().toISOString(), message: 'This message was deleted' }
            : m
        )
      );
      setActiveActionMenuId(null);
      addToast({ type: 'success', message: 'Message deleted.' });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete message.';
      addToast({ type: 'error', message: errorMsg });
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (messageId, emoji) => {
    if (!currentCompany?.id || !team?.id) return;
    try {
      const updated = await toggleMessageReactionApi(currentCompany.id, team.id, messageId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      setActiveEmojiPickerMsgId(null);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update reaction.';
      addToast({ type: 'error', message: errorMsg });
    }
  };

  // Toggle Pin
  const handleTogglePin = async (messageId) => {
    if (!currentCompany?.id || !team?.id) return;
    try {
      const updated = await togglePinMessageApi(currentCompany.id, team.id, messageId);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      loadPinnedMessages();
      setActiveActionMenuId(null);
      addToast({
        type: 'success',
        message: updated.is_pinned ? 'Message pinned to team.' : 'Message unpinned.',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to toggle pin.';
      addToast({ type: 'error', message: errorMsg });
    }
  };

  // Search Messages
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim() || !currentCompany?.id || !team?.id) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await searchTeamMessagesApi(currentCompany.id, team.id, query.trim());
      setSearchResults(res?.messages || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Mention Autocomplete
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBeforeCursor[lastAt - 1]))) {
      const query = textBeforeCursor.slice(lastAt + 1);
      if (!/\s/.test(query)) {
        setMentionQuery(query.toLowerCase());
        setMentionPosition(lastAt);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setMentionPosition(null);
  };

  const filteredMentionMembers = useMemo(() => {
    if (mentionPosition === null) return [];
    return teamMembers.filter((m) => {
      const fullName = (m.full_name || m.user?.full_name || '').toLowerCase();
      const username = (m.username || m.user?.username || '').toLowerCase();
      return fullName.includes(mentionQuery) || username.includes(mentionQuery);
    }).slice(0, 5);
  }, [teamMembers, mentionPosition, mentionQuery]);

  const insertMention = (member) => {
    if (mentionPosition === null) return;
    const uName = member.username || member.user?.username || member.full_name || 'user';
    const before = inputText.slice(0, mentionPosition);
    const after = inputText.slice(textareaRef.current?.selectionStart || mentionPosition);
    const newText = `${before}@${uName} ${after}`;
    setInputText(newText);
    setMentionPosition(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (mentionPosition !== null && filteredMentionMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredMentionMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + filteredMentionMembers.length) % filteredMentionMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentionMembers[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionPosition(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by Date & Sender Sequence
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDateKey = null;
    let currentDateGroup = null;

    messages.forEach((msg, idx) => {
      const dateKey = getMessageDateGroupKey(msg.created_at);
      if (dateKey !== currentDateKey) {
        currentDateKey = dateKey;
        currentDateGroup = { dateKey, items: [] };
        groups.push(currentDateGroup);
      }

      // Check continuous sender grouping within 5 minutes
      const prevMsg = idx > 0 ? messages[idx - 1] : null;
      const isSameSenderAsPrev =
        prevMsg &&
        prevMsg.sender_id === msg.sender_id &&
        !msg.reply_to_message_id &&
        new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000 &&
        getMessageDateGroupKey(prevMsg.created_at) === dateKey;

      currentDateGroup.items.push({
        ...msg,
        isChained: isSameSenderAsPrev,
      });
    });

    return groups;
  }, [messages]);

  return (
    <div className="flex bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] h-[calc(100vh-210px)] min-h-[520px] overflow-hidden shadow-2xs relative">
      {/* ============================================================ */}
      {/* 1. LEFT PANE: TEAMS / CHANNEL SWITCHER (Collapsible)         */}
      {/* ============================================================ */}
      {allTeams.length > 1 && (
        <div
          className={`${
            teamsDrawerOpen ? 'w-64 border-r' : 'w-0 overflow-hidden'
          } lg:w-60 lg:border-r border-slate-200/80 dark:border-[#202C3F] bg-slate-50/70 dark:bg-[#101726]/80 flex flex-col shrink-0 transition-all duration-200 z-10`}
        >
          {/* Channel Switcher Header */}
          <div className="px-3.5 py-3 border-b border-slate-200/80 dark:border-[#202C3F] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Channels</span>
            </span>
            <button
              type="button"
              onClick={() => setTeamsDrawerOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Teams List */}
          <div className="flex-1 p-2 overflow-y-auto space-y-1">
            {allTeams.map((t) => {
              const isSelected = t.id === team?.id;
              const unread = unreadCounts[t.id] || 0;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (onSelectTeam) onSelectTeam(t);
                    setTeamsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left cursor-pointer group ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#192437]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 font-mono text-xs">#</span>
                    <span className="truncate">{t.name}</span>
                  </div>

                  {unread > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white shrink-0 shadow-2xs">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. CENTER PANE: MAIN CHAT CONVERSATION STREAM                */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#131D2E] relative">
        {/* Chat Header */}
        <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-[#202C3F] bg-slate-50/60 dark:bg-[#101726]/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {allTeams.length > 1 && (
              <button
                type="button"
                onClick={() => setTeamsDrawerOpen((prev) => !prev)}
                className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1B283F] cursor-pointer"
                title="Toggle channels"
              >
                <ChevronLeft className={`h-4 w-4 transition-transform ${teamsDrawerOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            <div className="h-8 w-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                  {team.name}
                </h2>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-medium rounded bg-slate-100 dark:bg-[#1B283F] text-slate-500 dark:text-[#94A3B8]">
                  <Lock className="h-2.5 w-2.5" /> Private
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                Private team chat · {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => {
                setRightPanelTab('search');
                setDetailsPanelOpen(true);
              }}
              className="p-1.5 text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1B283F] rounded-lg transition-colors cursor-pointer"
              title="Search conversation"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Pinned Messages Trigger */}
            <button
              type="button"
              onClick={() => {
                setRightPanelTab('pinned');
                setDetailsPanelOpen(true);
              }}
              className="relative p-1.5 text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1B283F] rounded-lg transition-colors cursor-pointer"
              title="Pinned messages"
            >
              <Pin className="h-4 w-4" />
              {pinnedMessages.length > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 h-2 w-2 rounded-full bg-indigo-500" />
              )}
            </button>

            {/* Team Details / Members Trigger */}
            <button
              type="button"
              onClick={() => {
                setRightPanelTab('members');
                setDetailsPanelOpen((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                detailsPanelOpen && rightPanelTab === 'members'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40'
                  : 'border-slate-200/90 dark:border-[#243247] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1B283F]'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{teamMembers.length}</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {loading ? (
            <div className="space-y-4 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-[#1B283F] shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-32 bg-slate-200 dark:bg-[#1B283F] rounded" />
                    <div className="h-3 w-3/4 bg-slate-200 dark:bg-[#1B283F] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2.5">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 shadow-2xs">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                Welcome to {team.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm">
                This is your team's private channel. Start communicating with teammates, share project updates, and collaborate securely.
              </p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                {/* Date Divider */}
                <div className="flex items-center gap-3 my-2">
                  <div className="h-px flex-1 bg-slate-200/80 dark:bg-[#202C3F]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono px-2 py-0.5 bg-slate-100 dark:bg-[#1B283F] rounded-full">
                    {group.dateKey}
                  </span>
                  <div className="h-px flex-1 bg-slate-200/80 dark:bg-[#202C3F]" />
                </div>

                {/* Messages in Group */}
                <div className="space-y-1">
                  {group.items.map((msg) => {
                    const isCurrentUser = user?.id && msg.sender_id === user.id;
                    const senderName = msg.sender ? getDisplayName(msg.sender) : 'Team Member';
                    const timeFormatted = formatMessageTime(msg.created_at);
                    const isHighlighted = highlightedMessageId === msg.id;
                    const isEditing = editingMessageId === msg.id;
                    const isSoftDeleted = Boolean(msg.deleted_at);

                    return (
                      <div
                        key={msg.id}
                        ref={(el) => {
                          messageRefs.current[msg.id] = el;
                        }}
                        className={`group relative flex items-start gap-3 px-2.5 py-1.5 rounded-xl transition-all ${
                          isHighlighted ? 'bg-indigo-50/80 dark:bg-indigo-950/50 ring-1 ring-indigo-500/40' : 'hover:bg-slate-50/80 dark:hover:bg-[#162032]/60'
                        } ${msg.isChained ? 'pt-0.5' : 'pt-1.5'}`}
                      >
                        {/* Avatar (Hidden on chained messages) */}
                        {!msg.isChained ? (
                          <Avatar
                            user={msg.sender}
                            size="sm"
                            variant="indigo-solid"
                            className="shrink-0 mt-0.5 ring-1 ring-slate-200 dark:ring-[#202C3F]"
                          />
                        ) : (
                          <div className="w-8 shrink-0 flex justify-center text-[10px] font-mono text-slate-300 dark:text-[#475569] opacity-0 group-hover:opacity-100 transition-opacity">
                            {timeFormatted.slice(0, 5)}
                          </div>
                        )}

                        {/* Message Content Container */}
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Header on non-chained */}
                          {!msg.isChained && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]">
                                {senderName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-[#64748B]">
                                {timeFormatted}
                              </span>
                              {msg.edited_at && !isSoftDeleted && (
                                <span className="text-[10px] text-slate-400 dark:text-[#64748B] italic">
                                  (edited)
                                </span>
                              )}
                              {msg.is_pinned && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                  <Pin className="h-2.5 w-2.5" /> Pinned
                                </span>
                              )}
                            </div>
                          )}

                          {/* Reply Reference Banner */}
                          {msg.reply_to && !isSoftDeleted && (
                            <button
                              type="button"
                              onClick={() => scrollToMessage(msg.reply_to.id)}
                              className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#94A3B8] bg-slate-100/80 dark:bg-[#1A2538] px-2 py-0.5 rounded-md border-l-2 border-indigo-500 text-left hover:bg-slate-200/60 dark:hover:bg-[#223046] transition-colors cursor-pointer max-w-lg truncate"
                            >
                              <CornerDownRight className="h-3 w-3 shrink-0 text-indigo-500" />
                              <span className="font-semibold text-slate-700 dark:text-[#E2E8F0] shrink-0">
                                {msg.reply_to.sender_name}:
                              </span>
                              <span className="truncate">{msg.reply_to.message_snippet}</span>
                            </button>
                          )}

                          {/* Message Body or Inline Editor */}
                          {isEditing ? (
                            <div className="space-y-1.5 pt-1">
                              <textarea
                                ref={editInputRef}
                                rows={2}
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msg.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingMessageId(null);
                                  }
                                }}
                                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-[#0B1322] text-slate-900 dark:text-[#F8FAFC] focus:outline-none resize-none"
                              />
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Button
                                  variant="primary"
                                  size="xs"
                                  onClick={() => handleSaveEdit(msg.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => setEditingMessageId(null)}
                                >
                                  Cancel
                                </Button>
                                <span className="text-slate-400 text-[10px] ml-auto">
                                  Press Enter to save, Esc to cancel
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`text-xs sm:text-sm leading-relaxed break-words ${
                                isSoftDeleted
                                  ? 'text-slate-400 dark:text-[#64748B] italic'
                                  : isCurrentUser
                                  ? 'text-slate-900 dark:text-[#F8FAFC]'
                                  : 'text-slate-800 dark:text-[#CBD5E1]'
                              }`}
                            >
                              {msg.message}
                            </div>
                          )}

                          {/* Reactions Bar */}
                          {msg.reactions && msg.reactions.length > 0 && !isSoftDeleted && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              {msg.reactions.map((rx) => (
                                <button
                                  key={rx.emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, rx.emoji)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-all cursor-pointer ${
                                    rx.has_reacted
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-300 font-semibold'
                                      : 'bg-slate-50 dark:bg-[#162032] border-slate-200 dark:border-[#263449] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2C42]'
                                  }`}
                                  title={`Reacted by: ${(rx.users || []).map((u) => u.full_name || u.username).join(', ')}`}
                                >
                                  <span>{rx.emoji}</span>
                                  <span className="text-[11px] font-mono">{rx.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover Action Toolbar */}
                        {!isSoftDeleted && (
                          <div
                            className={`absolute top-1 right-2 bg-white dark:bg-[#182337] border border-slate-200 dark:border-[#28364C] rounded-lg shadow-sm px-1 py-0.5 flex items-center gap-0.5 transition-opacity ${
                              activeActionMenuId === msg.id || activeEmojiPickerMsgId === msg.id
                                ? 'opacity-100 z-10'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Quick Reactions */}
                            {POPULAR_EMOJIS.slice(0, 3).map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-[#202E46] rounded text-xs transition-transform hover:scale-125 cursor-pointer"
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}

                            <div className="h-3 w-px bg-slate-200 dark:bg-[#28364C] mx-0.5" />

                            {/* Reply */}
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(msg);
                                if (textareaRef.current) textareaRef.current.focus();
                              }}
                              className="p-1 text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#202E46] rounded transition-colors cursor-pointer"
                              title="Reply to message"
                            >
                              <CornerDownRight className="h-3.5 w-3.5" />
                            </button>

                            {/* Emoji Picker Trigger */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveEmojiPickerMsgId(
                                    activeEmojiPickerMsgId === msg.id ? null : msg.id
                                  )
                                }
                                className="p-1 text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#202E46] rounded transition-colors cursor-pointer"
                                title="Add reaction"
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </button>

                              {activeEmojiPickerMsgId === msg.id && (
                                <div className="absolute right-0 bottom-7 bg-white dark:bg-[#1A2538] border border-slate-200 dark:border-[#28364C] rounded-xl shadow-lg p-2 flex items-center gap-1 z-20">
                                  {POPULAR_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleToggleReaction(msg.id, emoji)}
                                      className="p-1.5 text-base hover:bg-slate-100 dark:hover:bg-[#223149] rounded-lg transition-transform hover:scale-125 cursor-pointer"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* More Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveActionMenuId(
                                    activeActionMenuId === msg.id ? null : msg.id
                                  )
                                }
                                className="p-1 text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#202E46] rounded transition-colors cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>

                              {activeActionMenuId === msg.id && (
                                <div className="absolute right-0 bottom-7 w-36 bg-white dark:bg-[#1A2538] border border-slate-200 dark:border-[#28364C] rounded-xl shadow-lg py-1 z-20 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.message);
                                      setActiveActionMenuId(null);
                                      addToast({ type: 'success', message: 'Message copied.' });
                                    }}
                                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-[#223149] text-slate-700 dark:text-[#CBD5E1]"
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span>Copy Text</span>
                                  </button>

                                  {isCurrentUser && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(msg)}
                                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-[#223149] text-slate-700 dark:text-[#CBD5E1]"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                      <span>Edit</span>
                                    </button>
                                  )}

                                  {isCurrentUserLeadOrAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePin(msg.id)}
                                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-[#223149] text-slate-700 dark:text-[#CBD5E1]"
                                    >
                                      <Pin className="h-3 w-3" />
                                      <span>{msg.is_pinned ? 'Unpin' : 'Pin'}</span>
                                    </button>
                                  )}

                                  {(isCurrentUser || isCurrentUserLeadOrAdmin) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer with Reply Banner and Mention Autocomplete */}
        <div className="p-3 border-t border-slate-200/80 dark:border-[#202C3F] bg-slate-50/40 dark:bg-[#101726]/40 relative">
          {/* Replying Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 bg-indigo-50/80 dark:bg-indigo-950/50 rounded-lg border-l-2 border-indigo-500 text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <CornerDownRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="font-semibold shrink-0">
                  Replying to {replyingTo.sender ? getDisplayName(replyingTo.sender) : 'Team Member'}:
                </span>
                <span className="truncate text-slate-600 dark:text-slate-300">
                  {replyingTo.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:text-slate-900 dark:hover:text-white rounded cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Mentions Autocomplete Popup */}
          {mentionPosition !== null && filteredMentionMembers.length > 0 && (
            <div className="absolute left-4 bottom-16 w-60 bg-white dark:bg-[#182337] border border-slate-200 dark:border-[#28364C] rounded-xl shadow-lg p-1.5 space-y-0.5 z-30">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Team Members
              </div>
              {filteredMentionMembers.map((m, idx) => (
                <button
                  key={m.id || m.user_id}
                  type="button"
                  onClick={() => insertMention(m)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    selectedMentionIndex === idx
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'hover:bg-slate-100 dark:hover:bg-[#1E2C42] text-slate-700 dark:text-[#CBD5E1]'
                  }`}
                >
                  <Avatar user={m} size="xs" variant="indigo-solid" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{getDisplayName(m)}</p>
                    <p className="text-[10px] text-slate-400 font-mono">@{m.username || m.user?.username || 'user'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Composer Form */}
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            <div className="relative bg-white dark:bg-[#0B1322] border border-slate-200/90 dark:border-[#243247] rounded-xl p-2 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-2xs">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${team.name}... (Press Enter to send)`}
                className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none resize-none max-h-32 leading-relaxed"
              />

              {/* Composer Action Toolbar */}
              <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-100 dark:border-[#1A2538]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setInputText((prev) => `${prev}@`);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2538] rounded-md transition-colors cursor-pointer"
                    title="Mention team member"
                  >
                    <AtSign className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputText((prev) => `${prev}👍 `);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2538] rounded-md transition-colors cursor-pointer"
                    title="Quick emoji"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="xs"
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  loading={sending}
                  aria-label="Send message"
                  className="px-3 gap-1"
                >
                  <span>Send</span>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. RIGHT PANE: TEAM DETAILS / PINNED / SEARCH (Collapsible)  */}
      {/* ============================================================ */}
      {detailsPanelOpen && (
        <div className="w-72 border-l border-slate-200/80 dark:border-[#202C3F] bg-slate-50/70 dark:bg-[#101726]/80 flex flex-col shrink-0 transition-all duration-200">
          {/* Panel Header with Tab Switcher */}
          <div className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-[#202C3F] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightPanelTab('members')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                  rightPanelTab === 'members'
                    ? 'bg-white dark:bg-[#1B283F] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Members
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('pinned')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                  rightPanelTab === 'pinned'
                    ? 'bg-white dark:bg-[#1B283F] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Pinned ({pinnedMessages.length})
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('search')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                  rightPanelTab === 'search'
                    ? 'bg-white dark:bg-[#1B283F] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Search
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDetailsPanelOpen(false)}
              aria-label="Close panel"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 p-3 overflow-y-auto">
            {/* Tab: Members */}
            {rightPanelTab === 'members' && (
              <div className="space-y-3">
                <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                  Online & Active ({teamMembers.length})
                </div>
                <div className="space-y-1.5">
                  {teamMembers.map((m) => {
                    const name = getDisplayName(m);
                    const isLead = m.role === 'LEAD';

                    return (
                      <div
                        key={m.id || m.user_id}
                        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-[#192437] transition-colors"
                      >
                        <div className="relative">
                          <Avatar user={m} size="xs" variant="indigo-solid" className="shrink-0" />
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#131D2E]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-[#F8FAFC] truncate">
                            {name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-[#64748B] flex items-center gap-1">
                            {isLead ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                                <Shield className="h-2.5 w-2.5" /> Team Lead
                              </span>
                            ) : (
                              'Member'
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Pinned Messages */}
            {rightPanelTab === 'pinned' && (
              <div className="space-y-3">
                <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                  Pinned Messages
                </div>
                {pinnedLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                    Loading pinned items...
                  </div>
                ) : pinnedMessages.length === 0 ? (
                  <div className="py-8 text-center space-y-1 text-slate-400">
                    <Pin className="h-5 w-5 mx-auto text-slate-300 dark:text-[#475569]" />
                    <p className="text-xs">No pinned messages yet.</p>
                    <p className="text-[10px] text-slate-400">Team leads can pin important instructions here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pinnedMessages.map((pMsg) => (
                      <div
                        key={pMsg.id}
                        onClick={() => scrollToMessage(pMsg.id)}
                        className="p-2.5 bg-white dark:bg-[#1A2538] border border-slate-200/80 dark:border-[#28364C] rounded-xl space-y-1 cursor-pointer hover:border-indigo-400 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            {pMsg.sender ? getDisplayName(pMsg.sender) : 'Team Member'}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {formatMessageTime(pMsg.pinned_at || pMsg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-[#CBD5E1] line-clamp-3">
                          {pMsg.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Scoped Search */}
            {rightPanelTab === 'search' && (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    size="sm"
                    icon={Search}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search in this team..."
                    className="text-xs"
                  />
                </div>

                {searchLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                    Searching conversation...
                  </div>
                ) : searchQuery.trim() && searchResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No results found for "{searchQuery}".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((sMsg) => (
                      <div
                        key={sMsg.id}
                        onClick={() => scrollToMessage(sMsg.id)}
                        className="p-2.5 bg-white dark:bg-[#1A2538] border border-slate-200/80 dark:border-[#28364C] rounded-xl space-y-1 cursor-pointer hover:border-indigo-400 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            {sMsg.sender ? getDisplayName(sMsg.sender) : 'Team Member'}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {getMessageDateGroupKey(sMsg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-[#CBD5E1] line-clamp-2">
                          {sMsg.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamChat;
