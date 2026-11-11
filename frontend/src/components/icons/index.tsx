import React from 'react';
import { Platform, View } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

// 웹 전용 Lucide SVG 생성 헬퍼
const createSvgIcon = (
  paths: React.ReactNode,
  nativeFallback: (props: IconProps) => React.ReactElement
) => {
  return ({ size = 20, color = 'currentColor', strokeWidth = 2, style }: IconProps) => {
    if (Platform.OS === 'web') {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
        >
          {paths}
        </svg>
      );
    }
    return nativeFallback({ size, color, strokeWidth, style });
  };
};

/**
 * 1. CalendarIcon (캘린더)
 */
export const CalendarIcon = createSvgIcon(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </>,
  (p) => <Feather name="calendar" size={p.size} color={p.color} style={p.style} />
);

/**
 * 2. PrayerHandsIcon (기도 손 / 두 손 모음)
 */
export const PrayerHandsIcon = createSvgIcon(
  <>
    <path d="M12 4v16" />
    <path d="M7 8c1-1 3-2 5-2s4 1 5 2" />
    <path d="M7.5 13c1-1 2.5-1.5 4.5-1.5s3.5.5 4.5 1.5" />
    <path d="M6 18c2-1 4-1.5 6-1.5s4 .5 6 1.5" />
  </>,
  (p) => <MaterialCommunityIcons name="hands-pray" size={p.size} color={p.color} style={p.style} />
);

/**
 * 3. HeartHandshakeIcon (내 기도명단 / 사랑과 헌신)
 */
export const HeartHandshakeIcon = createSvgIcon(
  <>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.86.86 2.26.86 3.12 0L15 8.2" />
    <path d="m14 10 1.96-1.96a2.17 2.17 0 0 1 3.08 0c.86.86.86 2.26 0 3.12L16 14.2" />
  </>,
  (p) => <MaterialCommunityIcons name="hand-heart" size={p.size} color={p.color} style={p.style} />
);

/**
 * 4. HeartIcon (기도 체크 / 하트)
 */
export const HeartIcon = ({
  size = 20,
  color = 'currentColor',
  fill = 'none',
  strokeWidth = 2,
  style,
}: IconProps & { fill?: string }) => {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    );
  }
  return <Ionicons name={fill !== 'none' ? 'heart' : 'heart-outline'} size={size} color={color} style={style} />;
};

/**
 * 5. UsersIcon (다인원 / 부서 / 공동체)
 */
export const UsersIcon = createSvgIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
  (p) => <Feather name="users" size={p.size} color={p.color} style={p.style} />
);

/**
 * 6. UserIcon (개인 유저 / 작성자)
 */
export const UserIcon = createSvgIcon(
  <>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
  (p) => <Feather name="user" size={p.size} color={p.color} style={p.style} />
);

/**
 * 7. UserPlusIcon (대상자 추가)
 */
export const UserPlusIcon = createSvgIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </>,
  (p) => <Feather name="user-plus" size={p.size} color={p.color} style={p.style} />
);

/**
 * 8. BuildingOfficeIcon (부서 탭 아이콘)
 */
export const BuildingOfficeIcon = createSvgIcon(
  <>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M16 14h.01" />
  </>,
  (p) => <Ionicons name="business-outline" size={p.size} color={p.color} style={p.style} />
);

/**
 * 9. GlobeAltIcon (전체 부서 아이콘)
 */
export const GlobeAltIcon = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </>,
  (p) => <Feather name="globe" size={p.size} color={p.color} style={p.style} />
);

/**
 * 10. ClockIcon (타임라인 / 시각)
 */
export const ClockIcon = createSvgIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>,
  (p) => <Feather name="clock" size={p.size} color={p.color} style={p.style} />
);

/**
 * 11. MegaphoneIcon (대집회 / 공지 / 행사)
 */
export const MegaphoneIcon = createSvgIcon(
  <>
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </>,
  (p) => <Ionicons name="megaphone-outline" size={p.size} color={p.color} style={p.style} />
);

/**
 * 12. CoffeeIcon (카페 약속)
 */
export const CoffeeIcon = createSvgIcon(
  <>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </>,
  (p) => <Feather name="coffee" size={p.size} color={p.color} style={p.style} />
);

/**
 * 13. UtensilsIcon (식사 약속)
 */
export const UtensilsIcon = createSvgIcon(
  <>
    <path d="M18 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    <path d="M8 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2" />
    <path d="M5 11v11" />
  </>,
  (p) => <Ionicons name="restaurant-outline" size={p.size} color={p.color} style={p.style} />
);

/**
 * 14. MessageSquareIcon (댓글 / 메모)
 */
export const MessageSquareIcon = createSvgIcon(
  <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </>,
  (p) => <Feather name="message-square" size={p.size} color={p.color} style={p.style} />
);

/**
 * 15. SearchIcon (검색)
 */
export const SearchIcon = createSvgIcon(
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>,
  (p) => <Feather name="search" size={p.size} color={p.color} style={p.style} />
);

/**
 * 16. ChevronLeftIcon (이전 / 뒤로)
 */
export const ChevronLeftIcon = createSvgIcon(
  <>
    <polyline points="15 18 9 12 15 6" />
  </>,
  (p) => <Feather name="chevron-left" size={p.size} color={p.color} style={p.style} />
);

/**
 * 17. ChevronRightIcon (다음 / 앞으로)
 */
export const ChevronRightIcon = createSvgIcon(
  <>
    <polyline points="9 18 15 12 9 6" />
  </>,
  (p) => <Feather name="chevron-right" size={p.size} color={p.color} style={p.style} />
);

/**
 * 18. RotateCwIcon (새로고침)
 */
export const RotateCwIcon = createSvgIcon(
  <>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </>,
  (p) => <Feather name="rotate-cw" size={p.size} color={p.color} style={p.style} />
);

/**
 * 19. PlusIcon (추가 / FAB)
 */
export const PlusIcon = createSvgIcon(
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>,
  (p) => <Feather name="plus" size={p.size} color={p.color} style={p.style} />
);

/**
 * 20. Trash2Icon (삭제)
 */
export const Trash2Icon = createSvgIcon(
  <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </>,
  (p) => <Feather name="trash-2" size={p.size} color={p.color} style={p.style} />
);

/**
 * 21. XIcon (닫기)
 */
export const XIcon = createSvgIcon(
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>,
  (p) => <Feather name="x" size={p.size} color={p.color} style={p.style} />
);

/**
 * 22. LockIcon (자물쇠 / 보안)
 */
export const LockIcon = createSvgIcon(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
  (p) => <Feather name="lock" size={p.size} color={p.color} style={p.style} />
);

/**
 * 23. LogInIcon (로그인)
 */
export const LogInIcon = createSvgIcon(
  <>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </>,
  (p) => <Feather name="log-in" size={p.size} color={p.color} style={p.style} />
);

/**
 * 24. LogOutIcon (로그아웃)
 */
export const LogOutIcon = createSvgIcon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </>,
  (p) => <Feather name="log-out" size={p.size} color={p.color} style={p.style} />
);

/**
 * 25. SparklesIcon (AI / 강조 / 혜택)
 */
export const SparklesIcon = createSvgIcon(
  <>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </>,
  (p) => <Ionicons name="sparkles" size={p.size} color={p.color} style={p.style} />
);

/**
 * 26. ArrowRightIcon (화살표)
 */
export const ArrowRightIcon = createSvgIcon(
  <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>,
  (p) => <Feather name="arrow-right" size={p.size} color={p.color} style={p.style} />
);

/**
 * 27. BellIcon (알림 벨)
 */
export const BellIcon = createSvgIcon(
  <>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </>,
  (p) => <Feather name="bell" size={p.size} color={p.color} style={p.style} />
);

/**
 * 28. ActivityIcon (실시간 모니터링 / 시스템 상태)
 */
export const ActivityIcon = createSvgIcon(
  <>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </>,
  (p) => <Feather name="activity" size={p.size} color={p.color} style={p.style} />
);

/**
 * 29. RefreshIcon (새로고침)
 */
export const RefreshIcon = createSvgIcon(
  <>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </>,
  (p) => <Feather name="refresh-cw" size={p.size} color={p.color} style={p.style} />
);

