import type {
  Report,
  ReportCategory,
  CategoryGroup,
  Department,
  Notification,
  Badge,
  RewardHistory,
  LeaderboardEntry,
  TrustScoreHistory,
  AnalyticsData,
  User,
} from '@/types';

export const INFRASTRUCTURE_CATEGORIES: { value: ReportCategory; label: string; icon: string }[] = [
  { value: 'pothole', label: 'Pothole', icon: 'CircleDot' },
  { value: 'road-crack', label: 'Road Crack', icon: 'Minus' },
  { value: 'broken-streetlight', label: 'Broken Streetlight', icon: 'LightbulbOff' },
  { value: 'water-leakage', label: 'Water Leakage', icon: 'Droplets' },
  { value: 'garbage', label: 'Garbage', icon: 'Trash2' },
  { value: 'open-drain', label: 'Open Drain', icon: 'Waves' },
  { value: 'road-block', label: 'Road Block', icon: 'Construction' },
  { value: 'traffic-signal-damage', label: 'Traffic Signal Damage', icon: 'TrafficCone' },
  { value: 'illegal-construction', label: 'Illegal Construction', icon: 'Building2' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

export const TRAFFIC_CATEGORIES: { value: ReportCategory; label: string; icon: string }[] = [
  { value: 'helmet-missing', label: 'Helmet Missing', icon: 'HardHat' },
  { value: 'triple-riding', label: 'Triple Riding', icon: 'Users' },
  { value: 'wrong-side-driving', label: 'Wrong Side Driving', icon: 'ArrowLeftRight' },
  { value: 'illegal-parking', label: 'Illegal Parking', icon: 'Car' },
  { value: 'signal-jumping', label: 'Signal Jumping', icon: 'TrafficCone' },
  { value: 'mobile-phone-usage', label: 'Mobile Phone Usage', icon: 'Smartphone' },
  { value: 'seatbelt-missing', label: 'Seatbelt Missing', icon: 'ShieldAlert' },
  { value: 'dangerous-driving', label: 'Dangerous Driving', icon: 'AlertTriangle' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  ...Object.fromEntries(INFRASTRUCTURE_CATEGORIES.map((c) => [c.value, c.label])),
  ...Object.fromEntries(TRAFFIC_CATEGORIES.map((c) => [c.value, c.label])),
} as Record<ReportCategory, string>;

export const DEPARTMENTS: Department[] = [
  { id: 'municipal-eng', name: 'Municipal Engineering', categories: ['pothole', 'road-crack', 'road-block', 'illegal-construction'], icon: 'Building2' },
  { id: 'electrical', name: 'Electrical Department', categories: ['broken-streetlight', 'traffic-signal-damage'], icon: 'Lightbulb' },
  { id: 'sanitation', name: 'Sanitation Department', categories: ['garbage', 'open-drain'], icon: 'Trash2' },
  { id: 'water-supply', name: 'Water Supply Department', categories: ['water-leakage'], icon: 'Droplets' },
  { id: 'traffic-police', name: 'Traffic Police', categories: ['helmet-missing', 'triple-riding', 'wrong-side-driving', 'signal-jumping', 'mobile-phone-usage', 'seatbelt-missing', 'dangerous-driving'], icon: 'ShieldCheck' },
  { id: 'enforcement', name: 'Enforcement Cell', categories: ['illegal-parking'], icon: 'ShieldAlert' },
];

export function getDepartmentForCategory(category: ReportCategory): string {
  const dept = DEPARTMENTS.find((d) => d.categories.includes(category));
  return dept?.name ?? 'Municipal Engineering';
}

export function getCategoryGroup(category: ReportCategory): CategoryGroup {
  if (INFRASTRUCTURE_CATEGORIES.some((c) => c.value === category)) return 'infrastructure';
  return 'traffic';
}

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  'ai-processing': '#3b82f6',
  verified: '#10b981',
  rejected: '#ef4444',
  assigned: '#8b5cf6',
  under_progress: '#f59e0b',
  resolved: '#22c55e',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  'ai-processing': 'AI Processing',
  verified: 'Verified',
  rejected: 'Rejected',
  assigned: 'Assigned',
  under_progress: 'Under Progress',
  resolved: 'Resolved',
};

// ============ Mock Users ============

export const MOCK_USERS: User[] = [
  {
    id: 'u1', name: 'Aarav Sharma', email: 'aarav@demo.com', role: 'citizen',
    phone: '+91 98765 43210', city: 'Bengaluru', joinedAt: '2024-08-15',
    points: 4850, trustScore: 92, level: 'Gold', rank: 3,
    reportsSubmitted: 47, reportsVerified: 41, reportsRejected: 6,
  },
  {
    id: 'u2', name: 'Priya Patel', email: 'priya@demo.com', role: 'citizen',
    phone: '+91 98123 45678', city: 'Mumbai', joinedAt: '2024-06-20',
    points: 7200, trustScore: 96, level: 'Platinum', rank: 1,
    reportsSubmitted: 68, reportsVerified: 63, reportsRejected: 5,
  },
  {
    id: 'u3', name: 'Admin Officer', email: 'admin@demo.com', role: 'admin',
    city: 'Bengaluru', joinedAt: '2024-01-01',
    points: 0, trustScore: 100, level: 'City Guardian', rank: 0,
    reportsSubmitted: 0, reportsVerified: 0, reportsRejected: 0,
  },
];

// ============ Mock Reports ============

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();

export const MOCK_REPORTS: Report[] = [
  {
    id: 'r1', incidentId: 'CIVIC-2025-0001', category: 'pothole', categoryGroup: 'infrastructure',
    title: 'Large pothole on MG Road', description: 'Deep pothole near the signal, causing traffic jams and vehicle damage.',
    status: 'verified', severity: 'high',
    location: { lat: 12.9756, lng: 77.6044, address: 'MG Road, near Trinity Circle', city: 'Bengaluru' },
    timestamp: hoursAgo(2), reporterId: 'u1', reporterName: 'Aarav Sharma',
    department: 'Municipal Engineering', evidenceUrls: [],
    vehicleNumber: undefined,
    aiResult: {
      isRelevant: true, priority: 75, description: 'Large pothole detected on MG Road near Trinity Circle.', reason: 'Valid infrastructure issue detected with high confidence.',
      detectedObjects: [{ label: 'pothole', confidence: 0.94, bbox: { x: 120, y: 180, width: 200, height: 80 } }],
      confidenceScore: 0.94, severity: 'high', duplicateProbability: 0.12, evidenceQuality: 0.88,
      recommendedAction: 'Immediate repair required. Assign to Municipal Engineering with priority.',
      incidentSummary: 'A large pothole (approx 2m diameter) detected on MG Road near Trinity Circle. High risk of vehicle damage and traffic disruption.',
      processingSteps: [],
    },
  },
  {
    id: 'r2', incidentId: 'CIVIC-2025-0002', category: 'helmet-missing', categoryGroup: 'traffic',
    title: 'Rider without helmet on Brigade Road', description: 'Two-wheeler rider without helmet, caught on camera at signal.',
    status: 'assigned', severity: 'medium',
    location: { lat: 12.9716, lng: 77.6019, address: 'Brigade Road Junction', city: 'Bengaluru' },
    timestamp: hoursAgo(5), reporterId: 'u2', reporterName: 'Priya Patel',
    department: 'Traffic Police', evidenceUrls: [],
    vehicleNumber: 'KA01 AB 1234', vehicleType: 'Motorcycle',
    aiResult: {
      isRelevant: true, priority: 60, description: 'Rider without helmet detected on motorcycle at signal.', reason: 'Valid traffic violation detected with clear evidence.',
      detectedObjects: [{ label: 'person', confidence: 0.97, bbox: { x: 80, y: 60, width: 120, height: 180 } }, { label: 'motorcycle', confidence: 0.95, bbox: { x: 60, y: 140, width: 160, height: 100 } }],
      vehicleNumber: 'KA01 AB 1234', vehicleType: 'Motorcycle', detectedViolation: 'Helmet Missing',
      confidenceScore: 0.91, severity: 'medium', duplicateProbability: 0.05, evidenceQuality: 0.85,
      recommendedAction: 'Issue e-challan. Forward to Traffic Police for enforcement.',
      incidentSummary: 'Two-wheeler rider detected without helmet at Brigade Road Junction. Vehicle number KA01 AB 1234 identified via OCR.',
      processingSteps: [],
    },
  },
  {
    id: 'r3', incidentId: 'CIVIC-2025-0003', category: 'garbage', categoryGroup: 'infrastructure',
    title: 'Garbage dumping near Indiranagar park', description: 'Large pile of garbage dumped on the roadside near the park entrance.',
    status: 'resolved', severity: 'medium',
    location: { lat: 12.9719, lng: 77.6412, address: '100 Feet Road, Indiranagar', city: 'Bengaluru' },
    timestamp: hoursAgo(24), reporterId: 'u1', reporterName: 'Aarav Sharma',
    department: 'Sanitation Department', evidenceUrls: [],
    aiResult: {
      isRelevant: true, priority: 50, description: 'Large garbage pile detected near park entrance.', reason: 'Valid infrastructure issue — sanitation hazard detected.',
      detectedObjects: [{ label: 'garbage-pile', confidence: 0.89, bbox: { x: 50, y: 100, width: 300, height: 200 } }],
      confidenceScore: 0.89, severity: 'medium', duplicateProbability: 0.22, evidenceQuality: 0.78,
      recommendedAction: 'Dispatch sanitation team for cleanup. Monitor for recurring dumping.',
      incidentSummary: 'Garbage pile detected near Indiranagar park entrance. Estimated 3-4 cubic meters of waste.',
      processingSteps: [],
    },
  },
  {
    id: 'r4', incidentId: 'CIVIC-2025-0004', category: 'broken-streetlight', categoryGroup: 'infrastructure',
    title: 'Streetlight not working on Outer Ring Road', description: 'Multiple streetlights non-functional on a 200m stretch.',
    status: 'under_progress', severity: 'high',
    location: { lat: 12.9352, lng: 77.6245, address: 'Outer Ring Road, Marathahalli', city: 'Bengaluru' },
    timestamp: hoursAgo(48), reporterId: 'u2', reporterName: 'Priya Patel',
    department: 'Electrical Department', evidenceUrls: [],
    aiResult: {
      isRelevant: true, priority: 72, description: 'Non-functional streetlights detected on ORR stretch.', reason: 'Valid infrastructure issue — public safety hazard at night.',
      detectedObjects: [{ label: 'streetlight', confidence: 0.92, bbox: { x: 200, y: 50, width: 40, height: 120 } }],
      confidenceScore: 0.92, severity: 'high', duplicateProbability: 0.08, evidenceQuality: 0.90,
      recommendedAction: 'Urgent repair needed. High accident risk at night.',
      incidentSummary: 'Non-functional streetlights detected on ORR Marathahalli stretch. Safety hazard for night commuters.',
      processingSteps: [],
    },
  },
  {
    id: 'r5', incidentId: 'CIVIC-2025-0005', category: 'wrong-side-driving', categoryGroup: 'traffic',
    title: 'Wrong-side driving on flyover', description: 'Car driving on the wrong side of the flyover ramp.',
    status: 'verified', severity: 'critical',
    location: { lat: 12.9698, lng: 77.7500, address: 'Mysore Road Flyover', city: 'Bengaluru' },
    timestamp: hoursAgo(8), reporterId: 'u1', reporterName: 'Aarav Sharma',
    department: 'Traffic Police', evidenceUrls: [],
    vehicleNumber: 'KA05 MN 5678', vehicleType: 'Car',
    aiResult: {
      isRelevant: true, priority: 90, description: 'Car driving wrong side on flyover ramp.', reason: 'Critical traffic violation detected with clear vehicle identification.',
      detectedObjects: [{ label: 'car', confidence: 0.96, bbox: { x: 100, y: 120, width: 180, height: 120 } }],
      vehicleNumber: 'KA05 MN 5678', vehicleType: 'Car', detectedViolation: 'Wrong Side Driving',
      confidenceScore: 0.93, severity: 'critical', duplicateProbability: 0.03, evidenceQuality: 0.91,
      recommendedAction: 'Immediate traffic police dispatch. Issue challan and flag for repeat monitoring.',
      incidentSummary: 'Vehicle KA05 MN 5678 detected driving on the wrong side of Mysore Road flyover. Critical safety hazard.',
      processingSteps: [],
    },
  },
  {
    id: 'r6', incidentId: 'CIVIC-2025-0006', category: 'water-leakage', categoryGroup: 'infrastructure',
    title: 'Water pipeline leakage on Jayanagar 4th Block', description: 'Water flowing on the road from a broken pipeline for 2 days.',
    status: 'pending', severity: 'medium',
    location: { lat: 12.9250, lng: 77.5938, address: 'Jayanagar 4th Block', city: 'Bengaluru' },
    timestamp: hoursAgo(3), reporterId: 'u2', reporterName: 'Priya Patel',
    department: 'Water Supply Department', evidenceUrls: [],
  },
  {
    id: 'r7', incidentId: 'CIVIC-2025-0007', category: 'illegal-parking', categoryGroup: 'traffic',
    title: 'Cars parked on footpath near Koramangala', description: 'Multiple vehicles blocking the footpath.',
    status: 'assigned', severity: 'low',
    location: { lat: 12.9352, lng: 77.6245, address: 'Koramangala 80 Feet Road', city: 'Bengaluru' },
    timestamp: hoursAgo(12), reporterId: 'u1', reporterName: 'Aarav Sharma',
    department: 'Enforcement Cell', evidenceUrls: [],
    vehicleNumber: 'Multiple', vehicleType: 'Various',
    aiResult: {
      isRelevant: true, priority: 35, description: 'Multiple vehicles parked on footpath blocking pedestrian path.', reason: 'Valid traffic violation — illegal parking detected.',
      detectedObjects: [{ label: 'car', confidence: 0.88, bbox: { x: 50, y: 100, width: 100, height: 80 } }],
      vehicleType: 'Various', detectedViolation: 'Illegal Parking',
      confidenceScore: 0.86, severity: 'low', duplicateProbability: 0.15, evidenceQuality: 0.80,
      recommendedAction: 'Dispatch enforcement team for towing and challan.',
      incidentSummary: 'Multiple vehicles detected parked on footpath at Koramangala 80 Feet Road.',
      processingSteps: [],
    },
  },
  {
    id: 'r8', incidentId: 'CIVIC-2025-0008', category: 'open-drain', categoryGroup: 'infrastructure',
    title: 'Open drain cover missing in Whitefield', description: 'Dangerous open drain on the sidewalk.',
    status: 'rejected', severity: 'high',
    location: { lat: 12.9698, lng: 77.7500, address: 'Whitefield Main Road', city: 'Bengaluru' },
    timestamp: hoursAgo(72), reporterId: 'u2', reporterName: 'Priya Patel',
    department: 'Sanitation Department', evidenceUrls: [],
    aiResult: {
      isRelevant: true, priority: 65, description: 'Possible open drain detected but image quality is insufficient.', reason: 'Likely valid infrastructure issue but low evidence quality.',
      detectedObjects: [{ label: 'drain', confidence: 0.72, bbox: { x: 150, y: 200, width: 180, height: 60 } }],
      confidenceScore: 0.72, severity: 'high', duplicateProbability: 0.45, evidenceQuality: 0.55,
      recommendedAction: 'Insufficient evidence quality. Request resubmission with clearer photo.',
      incidentSummary: 'Possible open drain detected in Whitefield but image quality insufficient for confirmation.',
      processingSteps: [],
    },
  },
  {
    id: 'r9', incidentId: 'CIVIC-2025-0009', category: 'triple-riding', categoryGroup: 'traffic',
    title: 'Triple riding on two-wheeler', description: 'Three people on a motorcycle on Hebbal Flyover.',
    status: 'verified', severity: 'high',
    location: { lat: 13.0358, lng: 77.5970, address: 'Hebbal Flyover', city: 'Bengaluru' },
    timestamp: hoursAgo(16), reporterId: 'u1', reporterName: 'Aarav Sharma',
    department: 'Traffic Police', evidenceUrls: [],
    vehicleNumber: 'KA03 XY 9012', vehicleType: 'Motorcycle',
    aiResult: {
      isRelevant: true, priority: 78, description: 'Three persons on a single motorcycle detected on flyover.', reason: 'Valid traffic violation — triple riding detected with clear evidence.',
      detectedObjects: [{ label: 'person', confidence: 0.95, bbox: { x: 100, y: 50, width: 80, height: 120 } }, { label: 'person', confidence: 0.93, bbox: { x: 140, y: 70, width: 70, height: 100 } }, { label: 'motorcycle', confidence: 0.96, bbox: { x: 80, y: 130, width: 140, height: 90 } }],
      vehicleNumber: 'KA03 XY 9012', vehicleType: 'Motorcycle', detectedViolation: 'Triple Riding',
      confidenceScore: 0.90, severity: 'high', duplicateProbability: 0.07, evidenceQuality: 0.87,
      recommendedAction: 'Issue e-challan for triple riding. High accident risk.',
      incidentSummary: 'Three persons detected on motorcycle KA03 XY 9012 on Hebbal Flyover. Triple riding violation confirmed.',
      processingSteps: [],
    },
  },
  {
    id: 'r10', incidentId: 'CIVIC-2025-0010', category: 'pothole', categoryGroup: 'infrastructure',
    title: 'Pothole cluster on Silk Board Junction', description: 'Multiple potholes causing severe traffic congestion.',
    status: 'under_progress', severity: 'critical',
    location: { lat: 12.9176, lng: 77.6223, address: 'Silk Board Junction', city: 'Bengaluru' },
    timestamp: hoursAgo(6), reporterId: 'u2', reporterName: 'Priya Patel',
    department: 'Municipal Engineering', evidenceUrls: [],
    duplicateOf: 'r1', clusterId: 'CL-001',
    aiResult: {
      isRelevant: true, priority: 88, description: 'Multiple potholes causing severe traffic congestion at junction.', reason: 'Valid infrastructure issue — high-severity duplicate detected.',
      detectedObjects: [{ label: 'pothole', confidence: 0.96, bbox: { x: 80, y: 150, width: 150, height: 70 } }],
      confidenceScore: 0.96, severity: 'critical', duplicateProbability: 0.78, evidenceQuality: 0.92,
      recommendedAction: 'Duplicate of CIVIC-2025-0001. Merge reports and expedite repair.',
      incidentSummary: 'Pothole cluster at Silk Board Junction. 78% duplicate match with existing report CIVIC-2025-0001.',
      processingSteps: [],
    },
  },
];

// ============ Mock Notifications ============

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'reward-credited', title: 'Reward Credited!', message: 'You earned 150 points for verified report CIVIC-2025-0001.', timestamp: hoursAgo(1), read: false, reportId: 'r1' },
  { id: 'n2', type: 'ai-completed', title: 'AI Analysis Complete', message: 'Your report CIVIC-2025-0005 has been analysed. Severity: Critical.', timestamp: hoursAgo(7), read: false, reportId: 'r5' },
  { id: 'n3', type: 'department-assigned', title: 'Department Assigned', message: 'Report CIVIC-2025-0002 assigned to Traffic Police.', timestamp: hoursAgo(5), read: true, reportId: 'r2' },
  { id: 'n4', type: 'issue-resolved', title: 'Issue Resolved', message: 'Garbage at Indiranagar has been cleaned up. Thank you!', timestamp: hoursAgo(20), read: true, reportId: 'r3' },
  { id: 'n5', type: 'repair-started', title: 'Repair Started', message: 'Streetlight repair on ORR Marathahalli has begun.', timestamp: hoursAgo(30), read: true, reportId: 'r4' },
];

// ============ Mock Badges ============

export const MOCK_BADGES: Badge[] = [
  { id: 'b1', name: 'First Report', description: 'Submitted your first report', icon: 'Flag', earned: true, earnedAt: '2024-08-15' },
  { id: 'b2', name: 'Road Sentinel', description: 'Submitted 10 infrastructure reports', icon: 'ShieldCheck', earned: true, earnedAt: '2024-10-01' },
  { id: 'b3', name: 'Traffic Guardian', description: 'Submitted 10 traffic violation reports', icon: 'TrafficCone', earned: true, earnedAt: '2024-11-15' },
  { id: 'b4', name: 'Verified Reporter', description: 'Got 25 reports verified by AI', icon: 'BadgeCheck', earned: true, earnedAt: '2025-01-10' },
  { id: 'b5', name: 'Streak Master', description: 'Reported for 30 consecutive days', icon: 'Flame', earned: false },
  { id: 'b6', name: 'City Guardian', description: 'Reached 5000 points', icon: 'Crown', earned: false },
  { id: 'b7', name: 'Duplicate Hunter', description: 'Helped identify 5 duplicate reports', icon: 'Copy', earned: true, earnedAt: '2025-02-20' },
  { id: 'b8', name: 'Road Protector', description: 'Reached 10000 points', icon: 'Award', earned: false },
];

// ============ Mock Reward History ============

export const MOCK_REWARDS: RewardHistory[] = [
  { id: 'rw1', title: 'Report CIVIC-2025-0001 verified', points: 150, type: 'report-verified', timestamp: hoursAgo(1) },
  { id: 'rw2', title: 'Report CIVIC-2025-0005 verified', points: 200, type: 'report-verified', timestamp: hoursAgo(7) },
  { id: 'rw3', title: '7-day reporting streak', points: 100, type: 'streak', timestamp: hoursAgo(24) },
  { id: 'rw4', title: 'Report CIVIC-2025-0009 verified', points: 180, type: 'report-verified', timestamp: hoursAgo(16) },
  { id: 'rw5', title: 'Duplicate detection bonus', points: 50, type: 'duplicate-detected', timestamp: hoursAgo(6) },
  { id: 'rw6', title: 'Milestone: 40 verified reports', points: 500, type: 'milestone', timestamp: hoursAgo(48) },
];

// ============ Mock Leaderboard ============

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u2', name: 'Priya Patel', points: 7200, level: 'Platinum', reportsVerified: 63, trustScore: 96, city: 'Mumbai' },
  { rank: 2, userId: 'u4', name: 'Rahul Verma', points: 5600, level: 'Gold', reportsVerified: 52, trustScore: 91, city: 'Delhi' },
  { rank: 3, userId: 'u1', name: 'Aarav Sharma', points: 4850, level: 'Gold', reportsVerified: 41, trustScore: 92, city: 'Bengaluru' },
  { rank: 4, userId: 'u5', name: 'Sneha Reddy', points: 4200, level: 'Gold', reportsVerified: 38, trustScore: 89, city: 'Hyderabad' },
  { rank: 5, userId: 'u6', name: 'Arjun Nair', points: 3800, level: 'Silver', reportsVerified: 34, trustScore: 87, city: 'Kochi' },
  { rank: 6, userId: 'u7', name: 'Kavya Singh', points: 3200, level: 'Silver', reportsVerified: 29, trustScore: 85, city: 'Jaipur' },
  { rank: 7, userId: 'u8', name: 'Vikram Rao', points: 2800, level: 'Silver', reportsVerified: 25, trustScore: 83, city: 'Chennai' },
  { rank: 8, userId: 'u9', name: 'Anita Gupta', points: 2200, level: 'Bronze', reportsVerified: 20, trustScore: 80, city: 'Kolkata' },
  { rank: 9, userId: 'u10', name: 'Rohan Das', points: 1800, level: 'Bronze', reportsVerified: 16, trustScore: 78, city: 'Pune' },
  { rank: 10, userId: 'u11', name: 'Meera Joshi', points: 1200, level: 'Bronze', reportsVerified: 12, trustScore: 75, city: 'Ahmedabad' },
];

// ============ Mock Trust Score History ============

export const MOCK_TRUST_HISTORY: TrustScoreHistory[] = [
  { month: 'Jan', score: 78, acceptanceRate: 72 },
  { month: 'Feb', score: 82, acceptanceRate: 78 },
  { month: 'Mar', score: 85, acceptanceRate: 82 },
  { month: 'Apr', score: 87, acceptanceRate: 85 },
  { month: 'May', score: 90, acceptanceRate: 88 },
  { month: 'Jun', score: 92, acceptanceRate: 91 },
];

// ============ Mock Analytics ============

export const MOCK_ANALYTICS: AnalyticsData = {
  monthlyReports: [
    { month: 'Jan', infrastructure: 120, traffic: 85 },
    { month: 'Feb', infrastructure: 145, traffic: 92 },
    { month: 'Mar', infrastructure: 160, traffic: 110 },
    { month: 'Apr', infrastructure: 180, traffic: 125 },
    { month: 'May', infrastructure: 210, traffic: 140 },
    { month: 'Jun', infrastructure: 240, traffic: 165 },
  ],
  departmentPerformance: [
    { department: 'Municipal Eng', resolved: 180, pending: 25, avgResolutionDays: 4.2 },
    { department: 'Traffic Police', resolved: 220, pending: 15, avgResolutionDays: 1.8 },
    { department: 'Electrical', resolved: 95, pending: 12, avgResolutionDays: 3.5 },
    { department: 'Sanitation', resolved: 150, pending: 8, avgResolutionDays: 2.1 },
    { department: 'Water Supply', resolved: 70, pending: 18, avgResolutionDays: 5.0 },
    { department: 'Enforcement', resolved: 110, pending: 5, avgResolutionDays: 1.2 },
  ],
  categoryBreakdown: [
    { category: 'Pothole', count: 145 },
    { category: 'Helmet Missing', count: 98 },
    { category: 'Garbage', count: 87 },
    { category: 'Broken Streetlight', count: 72 },
    { category: 'Illegal Parking', count: 65 },
    { category: 'Water Leakage', count: 48 },
    { category: 'Wrong Side', count: 42 },
    { category: 'Open Drain', count: 35 },
  ],
  responseTimes: [
    { department: 'Enforcement', avgDays: 1.2 },
    { department: 'Traffic Police', avgDays: 1.8 },
    { department: 'Sanitation', avgDays: 2.1 },
    { department: 'Electrical', avgDays: 3.5 },
    { department: 'Municipal Eng', avgDays: 4.2 },
    { department: 'Water Supply', avgDays: 5.0 },
  ],
  criticalAreas: [
    { area: 'Silk Board Junction', count: 28, lat: 12.9176, lng: 77.6223 },
    { area: 'MG Road', count: 22, lat: 12.9756, lng: 77.6044 },
    { area: 'Marathahalli ORR', count: 19, lat: 12.9352, lng: 77.6245 },
    { area: 'Hebbal Flyover', count: 15, lat: 13.0358, lng: 77.5970 },
    { area: 'Koramangala', count: 12, lat: 12.9352, lng: 77.6245 },
  ],
  citizenParticipation: [
    { month: 'Jan', activeCitizens: 340, newReports: 205 },
    { month: 'Feb', activeCitizens: 420, newReports: 237 },
    { month: 'Mar', activeCitizens: 510, newReports: 270 },
    { month: 'Apr', activeCitizens: 620, newReports: 305 },
    { month: 'May', activeCitizens: 750, newReports: 350 },
    { month: 'Jun', activeCitizens: 890, newReports: 405 },
  ],
};

export const FAQS = [
  { q: 'What is CivicEye AI?', a: 'CivicEye AI is an AI-powered civic reporting platform that lets citizens report infrastructure issues and traffic violations. Our AI analyses evidence, assigns departments, and tracks resolution.' },
  { q: 'How do I earn rewards?', a: 'You earn points for every verified report. Points accumulate to unlock levels (Bronze, Silver, Gold, Platinum) and badges. Higher trust scores earn bonus points.' },
  { q: 'What evidence can I submit?', a: 'You can upload photos, videos, record from your camera, or add voice notes. GPS and timestamp are captured automatically for accuracy.' },
  { q: 'How does AI verification work?', a: 'Our AI modules perform image quality checks, object detection (YOLO), OCR for vehicle numbers, duplicate detection, and severity analysis — all within seconds.' },
  { q: 'Which departments handle my reports?', a: 'Reports are automatically routed: road damage to Municipal Engineering, streetlights to Electrical, garbage to Sanitation, traffic violations to Traffic Police, and so on.' },
  { q: 'What is the Trust Score?', a: 'Your Trust Score reflects report accuracy and acceptance rate. Higher scores mean your reports get prioritised and earn more points.' },
  { q: 'Is my data secure?', a: 'Yes. All reports are encrypted and your personal information is protected. Only authorised department officials can access report details.' },
];

export const TESTIMONIALS = [
  { name: 'Aarav Sharma', role: 'Active Citizen, Bengaluru', text: 'CivicEye AI made reporting potholes effortless. I earned 4800 points and my neighbourhood roads got fixed in weeks!', avatar: 'AS' },
  { name: 'Priya Patel', role: 'Top Reporter, Mumbai', text: 'The AI detection is incredibly accurate. It caught vehicle numbers from blurry photos and the traffic police acted fast.', avatar: 'PP' },
  { name: 'Rahul Verma', role: 'City Guardian, Delhi', text: 'I love the leaderboard system. It gamifies civic duty and makes reporting addictive in the best way possible.', avatar: 'RV' },
  { name: 'Sneha Reddy', role: 'Community Leader, Hyderabad', text: 'The live map feature helped our neighbourhood track all pending issues in one view. Truly transparent governance.', avatar: 'SR' },
];
