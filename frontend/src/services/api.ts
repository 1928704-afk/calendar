import { ApiResponse, Comment, Department, LoginResponse, MonthlyTimelineData, NotificationItem, PrayerTargetCreateRequest, PrayerTargetItem, Schedule, TimelineData, UserSession } from '../types';
import { captureApiIssue } from './monitoring';

const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    // Expo Dev Server(8082) 단독 실행 시에만 8080으로 직접 요청
    if (window.location.port === '8082') {
      return 'http://localhost:8080/api/v1';
    }
    // Cloudflare Pages 올인원 배포 및 통합 서버에서는 자체 Functions 상대 경로 사용
    return '/api/v1';
  }
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const startTime = Date.now();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const durationMs = Date.now() - startTime;
    const json: ApiResponse<T> = await response.json();

    if (!response.ok || !json.success) {
      const errMsg = json.message || '요청 처리 중 오류가 발생했습니다.';
      captureApiIssue(endpoint, response.status, errMsg, durationMs);
      throw new Error(errMsg);
    }

    // 2초 이상 API 응답 지연 시 성능 저하 자동 감지 리포팅
    if (durationMs >= 2000) {
      captureApiIssue(endpoint, response.status, 'Slow API Response', durationMs);
    }

    return json.data;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    // 이미 captureApiIssue가 처리되지 않은 네트워크 단절/JSON 파싱 에러 포착
    if (error?.name === 'TypeError' || error?.name === 'SyntaxError') {
      captureApiIssue(endpoint, 0, error.message || '네트워크 또는 응답 파싱 오류', durationMs);
    }
    throw error;
  }
}

export const api = {
  // 부서 목록 조회
  getDepartments: (): Promise<Department[]> => {
    return request<Department[]>('/departments');
  },

  // 간이 로그인
  simpleLogin: (departmentId: number, userName: string): Promise<LoginResponse> => {
    return request<LoginResponse>('/auth/simple-login', {
      method: 'POST',
      body: JSON.stringify({ departmentId, userName }),
    });
  },

  // 월별 일정 목록 조회
  getMonthlySchedules: (departmentId: number, year: number, month: number): Promise<Schedule[]> => {
    return request<Schedule[]>(`/departments/${departmentId}/schedules?year=${year}&month=${month}`);
  },

  // 주차별 타임라인 조회
  getTimelineSchedules: (departmentId: number, year: number, week: number): Promise<TimelineData> => {
    return request<TimelineData>(`/departments/${departmentId}/schedules/timeline?year=${year}&week=${week}`);
  },

  // 월간 타임라인 조회 (무한 스크롤용)
  getMonthlyTimeline: (departmentId: number, year: number, month: number): Promise<MonthlyTimelineData> => {
    return request<MonthlyTimelineData>(`/departments/${departmentId}/schedules/monthly-timeline?year=${year}&month=${month}`);
  },

  // 일정 생성
  createSchedule: (
    departmentId: number,
    data: {
      category?: string;
      title: string;
      authorName: string;
      targetName: string;
      scheduleDate: string;
      startTime?: string | null;
      endTime?: string | null;
      color?: string;
      memo?: string;
    }
  ): Promise<Schedule> => {
    return request<Schedule>(`/departments/${departmentId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 일정 수정 (위키형 누구나 수정)
  updateSchedule: (
    departmentId: number,
    scheduleId: number,
    data: {
      category?: string;
      title: string;
      authorName: string;
      targetName: string;
      scheduleDate: string;
      startTime?: string | null;
      endTime?: string | null;
      color?: string;
      memo?: string;
      modifierName?: string;
    }
  ): Promise<Schedule> => {
    return request<Schedule>(`/departments/${departmentId}/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 일정 삭제 (위키형 누구나 삭제)
  deleteSchedule: (departmentId: number, scheduleId: number, modifierName?: string): Promise<void> => {
    const query = modifierName ? `?modifierName=${encodeURIComponent(modifierName)}` : '';
    return request<void>(`/departments/${departmentId}/schedules/${scheduleId}${query}`, {
      method: 'DELETE',
    });
  },

  // 댓글 목록 조회
  getComments: (scheduleId: number): Promise<Comment[]> => {
    return request<Comment[]>(`/schedules/${scheduleId}/comments`);
  },

  // 댓글 작성
  createComment: (scheduleId: number, data: { authorName: string; content: string }): Promise<Comment> => {
    return request<Comment>(`/schedules/${scheduleId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 댓글 삭제
  deleteComment: (scheduleId: number, commentId: number, requesterName: string): Promise<void> => {
    const query = requesterName ? `?requesterName=${encodeURIComponent(requesterName)}` : '';
    return request<void>(`/schedules/${scheduleId}/comments/${commentId}${query}`, {
      method: 'DELETE',
    });
  },

  // 기도 명단 조회 (부서별, 인도자별, 대집회 필터)
  getPrayers: async (department?: string, leader?: string, isRally?: boolean): Promise<PrayerTargetItem[]> => {
    try {
      const params = new URLSearchParams();
      if (department && department !== '전체' && department !== '전체 부서') {
        params.append('department', department);
      }
      if (leader) {
        params.append('leader', leader);
      }
      if (typeof isRally === 'boolean') {
        params.append('isRally', String(isRally));
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await request<PrayerTargetItem[]>(`/prayers${qs}`);
    } catch (e) {
      console.warn('API getPrayers 실패, 로컬 데이터로 대체합니다:', e);
      const { PRAYER_TARGETS } = await import('../data/prayerData');
      let filtered = [...PRAYER_TARGETS];
      if (department && department !== '전체' && department !== '전체 부서') {
        filtered = filtered.filter((p) => p.department === department);
      }
      if (leader) {
        filtered = filtered.filter((p) => p.leader === leader);
      }
      if (typeof isRally === 'boolean') {
        filtered = filtered.filter((p) => Boolean(p.isRally) === isRally);
      }
      return filtered;
    }
  },

  // 새 기도 대상 등록
  createPrayer: (data: PrayerTargetCreateRequest): Promise<PrayerTargetItem> => {
    return request<PrayerTargetItem>('/prayers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 대집회 기도명단 등록/해제 토글
  togglePrayerRally: (id: number, isRally?: boolean): Promise<PrayerTargetItem> => {
    const qs = typeof isRally === 'boolean' ? `?isRally=${isRally}` : '';
    return request<PrayerTargetItem>(`/prayers/${id}/rally${qs}`, {
      method: 'PATCH',
    });
  },

  // 기도 대상 삭제
  deletePrayer: (id: number): Promise<void> => {
    return request<void>(`/prayers/${id}`, {
      method: 'DELETE',
    });
  },

  // 알림 목록 조회
  getNotifications: (userName: string): Promise<NotificationItem[]> => {
    return request<NotificationItem[]>(`/notifications?userName=${encodeURIComponent(userName)}`);
  },

  // 안 읽은 알림 개수 조회
  getUnreadNotificationCount: (userName: string): Promise<{ unreadCount: number }> => {
    return request<{ unreadCount: number }>(`/notifications/unread-count?userName=${encodeURIComponent(userName)}`);
  },

  // 단일 알림 읽음 처리
  markNotificationAsRead: (id: number): Promise<void> => {
    return request<void>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  // 전체 알림 읽음 처리
  markAllNotificationsAsRead: (userName: string): Promise<void> => {
    return request<void>(`/notifications/read-all?userName=${encodeURIComponent(userName)}`, {
      method: 'PATCH',
    });
  },
};

