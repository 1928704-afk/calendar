export type ScheduleCategory = 'CAFE' | 'MEAL' | 'RALLY' | 'CUSTOM';

export interface Department {
  id: number;
  name: string;
  sortOrder: number;
}

export interface Schedule {
  id: number;
  departmentId: number;
  departmentName: string;
  category: ScheduleCategory;
  title: string;
  authorName: string;
  targetName: string;
  scheduleDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD (기간 일정)
  startTime?: string | null; // HH:mm
  endTime?: string | null; // HH:mm
  color: string;
  memo?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // "월", "화" ...
  schedules: Schedule[];
}

export interface TimelineData {
  year: number;
  week: number;
  month?: number;
  weekOfMonth?: number;
  weekLabel?: string;
  startDate: string;
  endDate: string;
  days: TimelineDay[];
}

export interface MonthlyTimelineData {
  year: number;
  month: number;
  days: TimelineDay[];
}

export interface LoginResponse {
  departmentId: number;
  departmentName: string;
  userName: string;
  loginAt: string;
}

export interface UserSession {
  departmentId: number;
  departmentName: string;
  userName: string;
  loginAt: string;
}

export interface Comment {
  id: number;
  scheduleId: number;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PrayerTargetItem {
  id: number;
  department: string;
  leader: string;
  target: string;
  relationship?: string;
  age?: string;
  createdAt?: string;
  isRally?: boolean;
}

export interface PrayerTargetCreateRequest {
  department: string;
  leader: string;
  target: string;
  relationship?: string;
  age?: string;
  isRally?: boolean;
}

export interface NotificationItem {
  id: number;
  recipientName: string;
  senderName: string;
  scheduleId: number;
  scheduleTitle: string;
  commentContent: string;
  isRead: boolean;
  createdAt: string;
}


export type MainTabType = 'calendar' | 'prayers' | 'myPrayers';
