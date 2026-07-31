import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, MapPin, X, Search, MessageSquare, Check, BadgeCheck } from 'lucide-react';
import type { CommunityGroup, UserSearchResult } from '@/types';
import { communityService } from '@/services/communityService';
import { groupChatService } from '@/services/groupChatService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { getInitials } from '@/utils/helpers';

const GROUP_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'locality', label: 'Locality' },
  { id: 'interest', label: 'Interest' },
  { id: 'issue', label: 'Issue-based' },
];

interface GroupsPanelProps {
  onGroupSelected?: (group: CommunityGroup) => void;
}

export function GroupsPanel({ onGroupSelected }: GroupsPanelProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', category: 'locality', city: '' });

  // Member search state
  const [memberQuery, setMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (user) loadGroups(); }, [user, category]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!memberQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      const excludeIds = [user?.id, ...selectedMembers.map((m) => m.id)].filter(Boolean) as string[];
      const results = await groupChatService.searchUsers(memberQuery, excludeIds);
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [memberQuery, selectedMembers, user]);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await communityService.getGroups(user.id, category);
      setGroups(data);
    } catch { showToast('Failed to load groups', 'error'); }
    finally { setLoading(false); }
  };

  const handleJoin = async (group: CommunityGroup) => {
    if (!user) return;
    try {
      const joined = await communityService.toggleGroupMembership(group.id, user.id);
      setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, isMember: joined, memberCount: g.memberCount + (joined ? 1 : -1) } : g));
      showToast(joined ? `Joined ${group.name}` : `Left ${group.name}`, 'success');
    } catch { showToast('Failed to join group', 'error'); }
  };

  const handleAddMember = (member: UserSearchResult) => {
    setSelectedMembers((prev) => [...prev, member]);
    setMemberQuery('');
    setSearchResults([]);
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!newGroup.name.trim()) { showToast('Group name is required', 'warning'); return; }
    try {
      const created = await groupChatService.createGroupWithMembers(user.id, {
        name: newGroup.name,
        description: newGroup.description,
        category: newGroup.category,
        city: newGroup.city,
        memberIds: selectedMembers.map((m) => m.id),
      });
      setGroups((prev) => [created, ...prev]);
      setCreateOpen(false);
      setNewGroup({ name: '', description: '', category: 'locality', city: '' });
      setSelectedMembers([]);
      setMemberQuery('');
      showToast(`Group created with ${selectedMembers.length + 1} member${selectedMembers.length === 0 ? '' : 's'}`, 'success');
    } catch (err: any) { showToast('Failed to create group: ' + err.message, 'error'); }
  };

  const resetCreateForm = () => {
    setCreateOpen(false);
    setNewGroup({ name: '', description: '', category: 'locality', city: '' });
    setSelectedMembers([]);
    setMemberQuery('');
    setSearchResults([]);
  };

  const filtered = search ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase())) : groups;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Community Groups</h3>
        <button onClick={() => setCreateOpen(true)} className="btn-primary !py-2 !px-4 !text-sm">
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups..." className="input-field !pl-10" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {GROUP_CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${category === cat.id ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25' : 'glass-card !rounded-xl text-slate-600 dark:text-slate-300'}`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card p-5 h-40 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-slate-400" /></div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No groups found</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create the first group for your locality or interest.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((group, i) => (
            <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card glass-card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{group.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{group.memberCount} members{group.city ? ` · ${group.city}` : ''}</p>
                  </div>
                </div>
                <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 text-[10px] capitalize">{group.category}</span>
              </div>
              {group.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-2">{group.description}</p>}
              <div className="flex items-center gap-2 mt-4">
                {group.isMember ? (
                  <>
                    <button onClick={() => onGroupSelected?.(group)} className="flex-1 btn-primary !py-2 !text-sm flex items-center justify-center gap-1.5">
                      <MessageSquare className="w-4 h-4" /> Open Chat
                    </button>
                    <button onClick={() => handleJoin(group)} className="btn-secondary !py-2 !px-3 !text-sm">Leave</button>
                  </>
                ) : (
                  <button onClick={() => handleJoin(group)} className="flex-1 btn-primary !py-2 !text-sm">Join Group</button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal with member search */}
      <Modal isOpen={createOpen} onClose={resetCreateForm} title="Create Group" size="lg">
        <div className="space-y-4">
          {/* Group details */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Group Name</label>
            <input value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} className="input-field" placeholder="e.g. MG Road Residents" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Description</label>
            <textarea value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} rows={2} className="input-field resize-none" placeholder="What is this group about?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Category</label>
              <select value={newGroup.category} onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value })} className="input-field">
                <option value="locality">Locality</option>
                <option value="interest">Interest</option>
                <option value="issue">Issue-based</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">City</label>
              <input value={newGroup.city} onChange={(e) => setNewGroup({ ...newGroup, city: e.target.value })} className="input-field" placeholder="e.g. Bengaluru" />
            </div>
          </div>

          {/* Member search */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Add Members
              {selectedMembers.length > 0 && <span className="text-xs text-blue-500">({selectedMembers.length} selected)</span>}
            </label>

            {/* Selected members chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                      {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(member.name)}
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
                    <button onClick={() => handleRemoveMember(member.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search by name or username to add members..."
                className="input-field !pl-10"
              />
              {searchLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>}
            </div>

            {/* Autocomplete results */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-2 glass-card !rounded-xl p-1 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button key={result.id} onClick={() => handleAddMember(result)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                        {result.avatar ? <img src={result.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(result.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{result.name}</p>
                          {result.verified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">@{result.username}{result.city ? ` · ${result.city}` : ''}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {memberQuery.trim() && !searchLoading && searchResults.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No users found matching "{memberQuery}"</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={resetCreateForm} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
              <Check className="w-4 h-4" /> Create Group
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
