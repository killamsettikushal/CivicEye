// ============ Core Types ============

export type UserRole = 'citizen' | 'admin' | 'department';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  phone?: string;
  city?: string;
  joinedAt: string;
  points: number;
  trustScore: number;
  level: CitizenLevel;
  rank: number;
  reportsSubmitted: number;
  reportsVerified: number;
  reportsRejected: number;
}

export type CitizenLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'City Guardian' | 'Road Protector';

export type CategoryGroup = 'infrastructure' | 'traffic';

export type InfrastructureCategory =
  | 'pothole'
  | 'road-crack'
  | 'broken-streetlight'
  | 'water-leakage'
  | 'garbage'
  | 'open-drain'
  | 'road-block'
  | 'traffic-signal-damage'
  | 'illegal-construction'
  | 'other';

export type TrafficCategory =
  | 'helmet-missing'
  | 'triple-riding'
  | 'wrong-side-driving'
  | 'illegal-parking'
  | 'signal-jumping'
  | 'mobile-phone-usage'
  | 'seatbelt-missing'
  | 'dangerous-driving'
  | 'other';

export type ReportCategory = InfrastructureCategory | TrafficCategory;

export type ReportStatus = 'pending' | 'ai-processing' | 'verified' | 'rejected' | 'assigned' | 'under_progress' | 'resolved';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  id: string;
  incidentId: string;
  category: ReportCategory;
  categoryGroup: CategoryGroup;
  title: string;
  description: string;
  status: ReportStatus;
  severity: Severity;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
  timestamp: string;
  reporterId: string;
  reporterName: string;
  department: string;
  evidenceUrls: string[];
  aiResult?: AIResult;
  duplicateOf?: string;
  clusterId?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  distance?: number;
}

export interface ImageAuthenticity {
  isGenuine: boolean;
  manipulationFlags: string[];
  authenticityConfidence: number;
}

export interface AIResult {
  isRelevant: boolean;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  issue?: string | null;
  detectedViolation?: string | null;
  confidenceScore: number;
  severity: Severity;
  severityExplanation?: string;
  priority: number;
  description: string;
  reason: string;
  detectedObjects: DetectedObject[];
  imageAuthenticity?: ImageAuthenticity;
  evidenceQuality: number;
  recommendedAction: string;
  incidentSummary: string;
  duplicateProbability: number;
  duplicateOf?: string | null;
  processingSteps: ProcessingStep[];
}

export interface DetectedObject {
  label: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface ProcessingStep {
  name: string;
  label: string;
  status: 'pending' | 'processing' | 'completed';
  progress: number;
}

export interface Department {
  id: string;
  name: string;
  categories: ReportCategory[];
  icon: string;
}

export interface Notification {
  id: string;
  type: 'report-submitted' | 'ai-completed' | 'department-assigned' | 'repair-started' | 'issue-resolved' | 'reward-credited';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  reportId?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface RewardHistory {
  id: string;
  title: string;
  points: number;
  type: 'report-verified' | 'first-report' | 'streak' | 'milestone' | 'duplicate-detected';
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  points: number;
  level: CitizenLevel;
  reportsVerified: number;
  trustScore: number;
  city: string;
}

export interface TrustScoreHistory {
  month: string;
  score: number;
  acceptanceRate: number;
}

export interface AnalyticsData {
  monthlyReports: { month: string; infrastructure: number; traffic: number }[];
  departmentPerformance: { department: string; resolved: number; pending: number; avgResolutionDays: number }[];
  categoryBreakdown: { category: string; count: number }[];
  responseTimes: { department: string; avgDays: number }[];
  criticalAreas: { area: string; count: number; lat: number; lng: number }[];
  citizenParticipation: { month: string; activeCitizens: number; newReports: number }[];
}

// ============ Redemption Types ============

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  category: 'voucher' | 'badge' | 'donation' | 'merchandise';
  icon: string;
  image_url?: string;
  stock: number;
  active: boolean;
}

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  reward_title: string;
  points_spent: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  redemption_code: string | null;
  created_at: string;
}

// ============ Community Types ============

export type MediaType = 'image' | 'video' | 'document';

export interface CommunityMedia {
  url: string;
  type: MediaType;
  name?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface CommunityPoll {
  id: string;
  postId: string;
  question: string;
  options: PollOption[];
  expiresAt: string | null;
  totalVotes: number;
  hasVoted: boolean;
  votedOptionId?: string;
  expired: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  body: string;
  parentId: string | null;
  likesCount: number;
  hasLiked: boolean;
  reactions: ReactionSummary[];
  totalReactions: number;
  myReaction: ReactionType | null;
  createdAt: string;
  replies?: CommunityComment[];
}

export interface CommunityPostAuthor {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  city: string;
  level: string;
  verified: boolean;
}

export interface CommunityPost {
  id: string;
  author: CommunityPostAuthor;
  body: string;
  media: CommunityMedia[];
  locationName: string;
  landmark: string;
  hashtags: string[];
  mentions: string[];
  isRepost: boolean;
  originalPostId: string | null;
  originalPost?: CommunityPost | null;
  poll: CommunityPoll | null;
  isPinned: boolean;
  pinnedBy: string | null;
  groupId: string | null;
  groupName: string | null;
  scheduledAt: string | null;
  linkPreview: LinkPreview | null;
  reactions: ReactionSummary[];
  totalReactions: number;
  myReaction: ReactionType | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  reportsCount: number;
  hasLiked: boolean;
  hasBookmarked: boolean;
  hasReposted: boolean;
  hasReported: boolean;
  hasMuted: boolean;
  isBlocked: boolean;
  isOwn: boolean;
  createdAt: string;
}

export type CommunityFeedFilter =
  | 'latest'
  | 'trending'
  | 'popular'
  | 'nearby'
  | 'following'
  | 'polls'
  | 'pinned'
  | 'scheduled';

export interface TrendingTopic {
  tag: string;
  count: number;
}

// ============ Reactions ============

export type ReactionType = 'like' | 'love' | 'wow' | 'celebrate';

export interface ReactionSummary {
  type: ReactionType;
  count: number;
  hasReacted: boolean;
}

export interface ReactionData {
  summary: ReactionSummary[];
  totalReactions: number;
  myReaction: ReactionType | null;
}

// ============ Groups ============

export interface CommunityGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  city: string;
  icon: string;
  coverUrl: string | null;
  memberCount: number;
  createdBy: string;
  createdAt: string;
  isMember: boolean;
}

// ============ Events ============

export type EventCategory =
  | 'cleanliness-drive'
  | 'awareness-campaign'
  | 'tree-plantation'
  | 'community-meetup'
  | 'workshop'
  | 'other';

export type RSVPStatus = 'going' | 'interested' | 'not-going';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  groupId: string | null;
  organizerId: string;
  organizerName: string;
  locationName: string;
  lat: number | null;
  lng: number | null;
  city: string;
  startsAt: string;
  endsAt: string | null;
  bannerUrl: string | null;
  maxAttendees: number;
  rsvpCount: number;
  myRSVP: RSVPStatus | null;
  createdAt: string;
}

// ============ Announcements ============

export interface CommunityAnnouncement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  pinned: boolean;
  groupId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// ============ Drafts ============

export interface CommunityDraft {
  id: string;
  body: string;
  media: CommunityMedia[];
  locationName: string;
  lat: number | null;
  lng: number | null;
  pollData: any | null;
  groupId: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ Achievements ============

export interface CommunityAchievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  points: number;
  earned: boolean;
  earnedAt: string | null;
}

// ============ Streaks ============

export interface CommunityStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalActiveDays: number;
}

// ============ Notification Preferences ============

export interface NotificationPrefs {
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyMentions: boolean;
  notifyFollows: boolean;
  notifyPollResults: boolean;
  notifyAnnouncements: boolean;
  notifyEvents: boolean;
  notifyGroupUpdates: boolean;
  emailDigest: boolean;
}

// ============ Link Preview ============

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
}

// ============ Advanced Search ============

export interface AdvancedSearchFilters {
  query?: string;
  category?: string;
  location?: string;
  hashtag?: string;
  mediaType?: 'image' | 'video' | 'document' | 'any';
  dateFrom?: string;
  dateTo?: string;
  hasPoll?: boolean;
}

// ============ Weekly Highlights ============

export interface WeeklyHighlight {
  type: 'top-post' | 'top-contributor' | 'trending-tag' | 'streak-leader';
  title: string;
  subtitle: string;
  data: any;
}

// ============ Group Chat Types ============

export type ChatMessageType = 'text' | 'image' | 'video' | 'document' | 'voice' | 'system';
export type ChatReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'celebrate';

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string | null;
  body: string;
  messageType: ChatMessageType;
  mediaUrl: string | null;
  mediaName: string | null;
  voiceDuration: number | null;
  replyToId: string | null;
  replyTo?: ChatMessage | null;
  deletedBySender: boolean;
  editedAt: string | null;
  reactions: ChatReactionSummary[];
  readByCount: number;
  isOwn: boolean;
  isPinned: boolean;
  createdAt: string;
}

export interface ChatReactionSummary {
  type: ChatReactionType;
  count: number;
  userIds: string[];
}

export interface GroupMember {
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  city: string;
  level: string;
  role: 'admin' | 'member';
  joinedAt: string;
  isOnline: boolean;
}

export interface UserSearchResult {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  city: string;
  level: string;
  verified: boolean;
}
