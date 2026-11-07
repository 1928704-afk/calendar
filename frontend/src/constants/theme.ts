import { ScheduleCategory } from '../types';

/**
 * shadcn/ui & 21st.dev 디자인 시스템 토큰
 */
export const COLORS = {
  // Brand & Neutrals (Zinc / Slate)
  primary: '#0F172A', // Slate 900 (shadcn signature primary)
  primaryHover: '#1E293B', // Slate 800
  primaryLight: '#F1F5F9', // Slate 100
  accentBlue: '#2563EB', // Blue 600
  accentBlueLight: '#EFF6FF', // Blue 50

  background: '#F8FAFC', // Slate 50
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  
  // Text
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#64748B', // Slate 500
  textMuted: '#94A3B8', // Slate 400
  mutedForeground: '#64748B', // Slate 500 (shadcn muted-foreground)
  textDisabled: '#CBD5E1', // Slate 300
  
  // Borders & Dividers
  border: '#E2E8F0', // Slate 200
  borderSubtle: '#F1F5F9', // Slate 100
  borderDark: '#CBD5E1', // Slate 300
  
  // Status & Feedback
  danger: '#EF4444', // Red 500
  dangerLight: '#FEF2F2', // Red 50
  dangerBorder: '#FECACA', // Red 200
  success: '#10B981', // Emerald 500
  successLight: '#ECFDF5', // Emerald 50
  warning: '#F59E0B', // Amber 500
  warningLight: '#FFFBEB', // Amber 50
};

// 부서별 모던 톤온톤 컬러
export const DEPARTMENT_COLORS: Record<string, string> = {
  언약부: '#2563EB', // Blue 600
  밀알부: '#059669', // Emerald 600
  이레부: '#7C3AED', // Violet 600
  '전체 부서': '#334155', // Slate 700
};

export const DEPARTMENT_BG_COLORS: Record<string, string> = {
  언약부: '#EFF6FF',
  밀알부: '#ECFDF5',
  이레부: '#F5F3FF',
  '전체 부서': '#F1F5F9',
};

export interface CategoryPreset {
  category: ScheduleCategory;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  label: string;
}

export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    category: 'CAFE',
    title: '카페약속',
    color: '#D97706', // Amber 600
    bgColor: '#FEF3C7', // Amber 100
    borderColor: '#FDE68A',
    icon: 'coffee',
    label: '카페약속',
  },
  {
    category: 'MEAL',
    title: '점심약속',
    color: '#059669', // Emerald 600
    bgColor: '#D1FAE5', // Emerald 100
    borderColor: '#A7F3D0',
    icon: 'utensils',
    label: '점심약속',
  },
  {
    category: 'RALLY',
    title: '집회확정',
    color: '#E11D48', // Rose 600
    bgColor: '#FFE4E6', // Rose 100
    borderColor: '#FECDD3',
    icon: 'megaphone',
    label: '집회확정',
  },
];

// shadcn UI 그림자 & 라운딩 프리셋
export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 6,
  },
};
