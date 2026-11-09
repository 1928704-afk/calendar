/**
 * 한국 표준시(KST, UTC+9) 기준 일자 및 시간 유틸리티
 */

// KST 기준 현재 Date 객체 반환
export function getKSTDate(date?: Date): Date {
  const target = date || new Date();
  const utc = target.getTime() + target.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000);
}

// Date 객체를 타임존 왜곡 없이 'YYYY-MM-DD' 문자열로 변환
export function formatDateToKSTString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 한국 시간 기준 '오늘' 날짜 문자열 ('YYYY-MM-DD')
export function getTodayKSTString(): string {
  return formatDateToKSTString(getKSTDate());
}

// 연, 월(1~12), 일 숫자로 'YYYY-MM-DD' 안전 조합
export function buildDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// 한국 시간 기준 연도, 월, 일 정보 추출
export function getKSTYearMonthDay() {
  const now = getKSTDate();
  return {
    year: now.getFullYear(),
    month: now.getMonth(), // 0 ~ 11
    date: now.getDate(),
  };
}
