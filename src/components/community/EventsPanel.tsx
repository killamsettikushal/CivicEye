import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, Plus, X, Check, Star } from 'lucide-react';
import type { CommunityEvent, EventCategory, RSVPStatus } from '@/types';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/utils/helpers';

const EVENT_CATEGORIES: { id: EventCategory; label: string; color: string }[] = [
  { id: 'cleanliness-drive', label: 'Cleanliness Drive', color: 'from-emerald-500 to-teal-600' },
  { id: 'awareness-campaign', label: 'Awareness Campaign', color: 'from-blue-500 to-blue-600' },
  { id: 'tree-plantation', label: 'Tree Plantation', color: 'from-green-500 to-emerald-600' },
  { id: 'community-meetup', label: 'Community Meetup', color: 'from-amber-500 to-orange-600' },
  { id: 'workshop', label: 'Workshop', color: 'from-purple-500 to-indigo-600' },
  { id: 'other', label: 'Other', color: 'from-slate-500 to-slate-600' },
];

const RSVP_LABELS: Record<RSVPStatus, { label: string; icon: typeof Check; color: string }> = {
  'going': { label: 'Going', icon: Check, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
  'interested': { label: 'Interested', icon: Star, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
  'not-going': { label: 'Not Going', icon: X, color: 'text-slate-600 bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600' },
};

export function EventsPanel() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', category: 'cleanliness-drive' as EventCategory,
    locationName: '', city: '', startsAt: '', endsAt: '', maxAttendees: -1,
  });

  useEffect(() => { if (user) loadEvents(); }, [user, filter]);

  const loadEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await communityService.getEvents(user.id, filter);
      setEvents(data);
    } catch { showToast('Failed to load events', 'error'); }
    finally { setLoading(false); }
  };

  const handleRSVP = async (event: CommunityEvent, status: RSVPStatus) => {
    if (!user) return;
    try {
      const result = await communityService.toggleRSVP(event.id, status, user.id);
      setEvents((prev) => prev.map((e) => e.id === event.id ? {
        ...e,
        myRSVP: result,
        rsvpCount: e.rsvpCount + (result && !e.myRSVP ? 1 : !result && e.myRSVP ? -1 : 0),
      } : e));
    } catch { showToast('Failed to RSVP', 'error'); }
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!newEvent.title.trim()) { showToast('Event title is required', 'warning'); return; }
    if (!newEvent.startsAt) { showToast('Start time is required', 'warning'); return; }
    try {
      const created = await communityService.createEvent(user.id, {
        title: newEvent.title,
        description: newEvent.description,
        category: newEvent.category,
        locationName: newEvent.locationName,
        city: newEvent.city,
        startsAt: new Date(newEvent.startsAt).toISOString(),
        endsAt: newEvent.endsAt ? new Date(newEvent.endsAt).toISOString() : null,
        maxAttendees: newEvent.maxAttendees,
      });
      setEvents((prev) => [created, ...prev]);
      setCreateOpen(false);
      setNewEvent({ title: '', description: '', category: 'cleanliness-drive', locationName: '', city: '', startsAt: '', endsAt: '', maxAttendees: -1 });
      showToast('Event created', 'success');
    } catch (err: any) { showToast('Failed to create event: ' + err.message, 'error'); }
  };

  const getCategoryConfig = (cat: string) => EVENT_CATEGORIES.find((c) => c.id === cat) ?? EVENT_CATEGORIES[5];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Community Events</h3>
        <button onClick={() => setCreateOpen(true)} className="btn-primary !py-2 !px-4 !text-sm"><Plus className="w-4 h-4" /> Create Event</button>
      </div>

      <div className="flex items-center gap-2">
        {(['upcoming', 'past', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25' : 'glass-card !rounded-xl text-slate-600 dark:text-slate-300'}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card p-5 h-32 animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"><Calendar className="w-8 h-8 text-slate-400" /></div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No events found</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create a cleanliness drive or awareness campaign.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, i) => {
            const cat = getCategoryConfig(event.category);
            const isUpcoming = new Date(event.startsAt) > new Date();
            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card glass-card-hover p-5">
                <div className="flex items-start gap-4">
                  {/* Date block */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${cat.color} flex flex-col items-center justify-center text-white`}>
                    <span className="text-lg font-bold">{new Date(event.startsAt).getDate()}</span>
                    <span className="text-[10px] uppercase">{new Date(event.startsAt).toLocaleString('en-IN', { month: 'short' })}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{event.title}</h4>
                        <span className={`badge ${cat.color.includes('emerald') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'} text-[10px]`}>{cat.label}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" />{event.rsvpCount} RSVPs</span>
                    </div>

                    {event.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{event.description}</p>}

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(event.startsAt)}</span>
                      {event.locationName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.locationName}</span>}
                      {event.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.city}</span>}
                    </div>

                    {/* RSVP buttons */}
                    {isUpcoming && (
                      <div className="flex items-center gap-2 mt-3">
                        {(Object.keys(RSVP_LABELS) as RSVPStatus[]).map((status) => {
                          const cfg = RSVP_LABELS[status];
                          const Icon = cfg.icon;
                          const active = event.myRSVP === status;
                          return (
                            <button key={status} onClick={() => handleRSVP(event, status)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? cfg.color : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                              <Icon className="w-3.5 h-3.5" />{cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Event" size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Event Title</label>
            <input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="input-field" placeholder="e.g. MG Road Cleanliness Drive" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Description</label>
            <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} rows={3} className="input-field resize-none" placeholder="Describe the event..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Category</label>
              <select value={newEvent.category} onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as EventCategory })} className="input-field">
                {EVENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Max Attendees (-1 = unlimited)</label>
              <input type="number" value={newEvent.maxAttendees} onChange={(e) => setNewEvent({ ...newEvent, maxAttendees: Number(e.target.value) })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Location</label>
              <input value={newEvent.locationName} onChange={(e) => setNewEvent({ ...newEvent, locationName: e.target.value })} className="input-field" placeholder="Venue name" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">City</label>
              <input value={newEvent.city} onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })} className="input-field" placeholder="City" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Starts At</label>
              <input type="datetime-local" value={newEvent.startsAt} onChange={(e) => setNewEvent({ ...newEvent, startsAt: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Ends At (optional)</label>
              <input type="datetime-local" value={newEvent.endsAt} onChange={(e) => setNewEvent({ ...newEvent, endsAt: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreateOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreate} className="btn-primary">Create Event</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
