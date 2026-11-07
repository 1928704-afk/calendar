import { PrayerTargetItem, Schedule } from '../types';

const STORAGE_KEY_WEBHOOK_URL = '@google_sheet_webhook_url';
export const DEFAULT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwYekYHH5XnVtsooDxdqDpTu_CAybNAhYQUbuu_-Ob89rAWfjSB4hLD39RWi1nUJRhRTw/exec';

let memoryWebhookUrl = DEFAULT_WEBHOOK_URL;

// 기본 URL이 있거나 사용자 입력 URL 가져오기
export const getGoogleSheetWebhookUrl = async (): Promise<string> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY_WEBHOOK_URL);
      if (saved) return saved;
    }
    return memoryWebhookUrl || DEFAULT_WEBHOOK_URL;
  } catch {
    return DEFAULT_WEBHOOK_URL;
  }
};

// 웹훅 URL 저장
export const setGoogleSheetWebhookUrl = async (url: string): Promise<void> => {
  try {
    memoryWebhookUrl = url.trim();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_WEBHOOK_URL, url.trim());
    }
  } catch (e) {
    console.error('웹훅 URL 저장 실패:', e);
  }
};

// 단일 일정 동기화 (전도 일정 기록 탭)
export const syncScheduleToSheet = async (schedule: {
  scheduleDate: string;
  department: string;
  title: string;
  authorName: string;
  targetName: string;
  memo?: string;
}): Promise<boolean> => {
  const webhookUrl = await getGoogleSheetWebhookUrl();
  if (!webhookUrl) return false;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // 구글 웹앱 리디렉션 대응
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'SCHEDULE',
        scheduleDate: schedule.scheduleDate,
        department: schedule.department,
        title: schedule.title,
        authorName: schedule.authorName,
        targetName: schedule.targetName,
        memo: schedule.memo || '',
      }),
    });
    return true;
  } catch (err) {
    console.warn('구글 시트 일정 전송 실패:', err);
    return false;
  }
};

// 단일 대집회 기도명단 동기화 (대집회 기도명단 탭)
export const syncRallyPrayerToSheet = async (prayer: {
  department: string;
  leader: string;
  target: string;
  relationship?: string;
  age?: string;
}): Promise<boolean> => {
  const webhookUrl = await getGoogleSheetWebhookUrl();
  if (!webhookUrl) return false;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'RALLY',
        department: prayer.department,
        leader: prayer.leader,
        target: prayer.target,
        relationship: prayer.relationship || '-',
        age: prayer.age || '-',
      }),
    });
    return true;
  } catch (err) {
    console.warn('구글 시트 대집회 기도명단 전송 실패:', err);
    return false;
  }
};

// 전체 데이터 일괄 동기화 (일정 목록 + 대집회 기도명단)
export const bulkSyncToSheet = async (
  schedules: Schedule[],
  rallyPrayers: PrayerTargetItem[],
  deptNameMap: Record<number, string>
): Promise<{ scheduleCount: number; rallyCount: number; success: boolean }> => {
  const webhookUrl = await getGoogleSheetWebhookUrl();
  if (!webhookUrl) {
    throw new Error('구글 시트 웹앱 URL이 설정되지 않았습니다.');
  }

  let scheduleSuccess = 0;
  let rallySuccess = 0;

  // 1. 대집회 기도명단 순차 전송
  for (const prayer of rallyPrayers) {
    await syncRallyPrayerToSheet({
      department: prayer.department,
      leader: prayer.leader,
      target: prayer.target,
      relationship: prayer.relationship,
      age: prayer.age,
    });
    rallySuccess++;
  }

  // 2. 일정 순차 전송
  for (const s of schedules) {
    const deptName = s.departmentName || deptNameMap[s.departmentId] || '전체';
    await syncScheduleToSheet({
      scheduleDate: s.scheduleDate,
      department: deptName,
      title: s.title,
      authorName: s.authorName,
      targetName: s.targetName,
      memo: s.memo || undefined,
    });
    scheduleSuccess++;
  }

  return {
    scheduleCount: scheduleSuccess,
    rallyCount: rallySuccess,
    success: true,
  };
};
