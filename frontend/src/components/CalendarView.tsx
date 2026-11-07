import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { Schedule } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, MegaphoneIcon } from './icons';

interface CalendarViewProps {
  currentDate: Date;
  schedules: Schedule[];
  isAllDept?: boolean;
  onChangeMonth: (delta: number) => void;
  onGoToday: () => void;
  onSelectDate: (dateString: string, daySchedules: Schedule[]) => void;
  onSelectSchedule: (schedule: Schedule) => void;
}

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarDayItem {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface MultiDayBarInfo {
  schedule: Schedule;
  startCol: number;
  endCol: number;
  isStartOfSchedule: boolean;
  isEndOfSchedule: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  schedules,
  isAllDept = false,
  onChangeMonth,
  onGoToday,
  onSelectDate,
  onSelectSchedule,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // 기간 일정 (2일 이상 지속되는 일정, 예: 11월 대집회)
  // 동일 제목 & 동일 기간인 집회/기간 일정은 언제나 딱 1개만 단일화하여 노출
  const multiDaySchedules = useMemo(() => {
    const list = schedules.filter(
      (s) => s.endDate && s.endDate > s.scheduleDate
    );

    const uniqueMap = new Map<string, Schedule>();
    for (const item of list) {
      const key = `${item.title.trim()}-${item.scheduleDate}-${item.endDate}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }
    return Array.from(uniqueMap.values());
  }, [schedules]);

  // 단일 일자별 전체 일정 매핑 (상세 모달용: 기간 일정 + 단일 일정 모두 포함)
  const allSchedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      const sDate = schedule.scheduleDate;
      const eDate = schedule.endDate || schedule.scheduleDate;

      if (eDate > sDate) {
        const cur = new Date(sDate);
        const end = new Date(eDate);
        while (cur <= end) {
          const ds = cur.toISOString().split('T')[0];
          const list = map.get(ds) || [];
          if (!list.some((item) => item.id === schedule.id || (item.title.trim() === schedule.title.trim() && item.scheduleDate === schedule.scheduleDate))) {
            list.push(schedule);
          }
          map.set(ds, list);
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        const list = map.get(sDate) || [];
        list.push(schedule);
        map.set(sDate, list);
      }
    }
    return map;
  }, [schedules]);

  // 셀 내부에 칩으로 노출할 단일 일정 (기간 일정은 첫째 줄 긴 막대로 표시되므로 칩에서 제외)
  const singleDaySchedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      if (!schedule.endDate || schedule.endDate === schedule.scheduleDate) {
        const list = map.get(schedule.scheduleDate) || [];
        list.push(schedule);
        map.set(schedule.scheduleDate, list);
      }
    }
    return map;
  }, [schedules]);

  // 해당 월의 캘린더 일자 배열 생성 (7의 배수)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDayIndex = firstDay.getDay(); // 0 (일) ~ 6 (토)
    const totalDays = lastDay.getDate();

    // 이전 달 마지막 날들
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const days: CalendarDayItem[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // 이전 달 패딩
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const ds = prevDate.toISOString().split('T')[0];
      days.push({
        dateString: ds,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: ds === todayStr,
      });
    }

    // 이번 달 날짜들
    for (let i = 1; i <= totalDays; i++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      const ds = `${year}-${mStr}-${dStr}`;
      days.push({
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: ds === todayStr,
      });
    }

    // 다음 달 패딩 (7의 배수로 맞춤)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextDate = new Date(year, month + 1, i);
        const ds = nextDate.toISOString().split('T')[0];
        days.push({
          dateString: ds,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: ds === todayStr,
        });
      }
    }

    return days;
  }, [year, month]);

  // 1주일(7일) 단위로 분할된 2차원 배열
  const weeks = useMemo(() => {
    const list: CalendarDayItem[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      list.push(calendarDays.slice(i, i + 7));
    }
    return list;
  }, [calendarDays]);

  // 각 주별 걸쳐있는 기간 일정 막대 계산
  const getMultiDayBarsForWeek = (week: CalendarDayItem[]): MultiDayBarInfo[] => {
    const weekStart = week[0].dateString;
    const weekEnd = week[6].dateString;
    const bars: MultiDayBarInfo[] = [];

    for (const schedule of multiDaySchedules) {
      const sEnd = schedule.endDate || schedule.scheduleDate;
      // 일정이 현재 주와 겹치는지 확인
      if (schedule.scheduleDate <= weekEnd && sEnd >= weekStart) {
        let startCol = 0;
        let endCol = 6;
        let isStart = false;
        let isEnd = false;

        const sIdx = week.findIndex((d) => d.dateString === schedule.scheduleDate);
        if (sIdx !== -1) {
          startCol = sIdx;
          isStart = true;
        }

        const eIdx = week.findIndex((d) => d.dateString === sEnd);
        if (eIdx !== -1) {
          endCol = eIdx;
          isEnd = true;
        }

        bars.push({
          schedule,
          startCol,
          endCol,
          isStartOfSchedule: isStart,
          isEndOfSchedule: isEnd,
        });
      }
    }

    return bars;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. 캘린더 네비게이션 헤더 (shadcn Outline Button 스타일) */}
      <View style={styles.navHeader}>
        <View style={styles.monthTitleGroup}>
          <Text style={styles.monthTitle}>
            {year}년 {month + 1}월
          </Text>
          <Text style={styles.scheduleTotalLabel}>
            일정 {schedules.length}개
          </Text>
        </View>

        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.outlineNavButton}
            onPress={() => onChangeMonth(-1)}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon size={16} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineTodayButton}
            onPress={onGoToday}
            activeOpacity={0.75}
          >
            <Text style={styles.outlineTodayButtonText}>오늘</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineNavButton}
            onPress={() => onChangeMonth(1)}
            activeOpacity={0.7}
          >
            <ChevronRightIcon size={16} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 요일 헤더 (shadcn Table Header 감성) */}
      <View style={styles.weekHeader}>
        {WEEK_DAYS.map((day, idx) => (
          <View key={day} style={styles.weekCol}>
            <Text
              style={[
                styles.weekText,
                idx === 0 && { color: COLORS.danger },
                idx === 6 && { color: COLORS.accentBlue },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 3. 캘린더 그리드 바디 */}
      <View style={styles.calendarBody}>
        {weeks.map((week, wIdx) => {
          const weekBars = getMultiDayBarsForWeek(week);
          const hasBars = weekBars.length > 0;
          const barSlotHeight = weekBars.length * 22; // 막대 개수당 22px 높이

          return (
            <View key={`week-row-${wIdx}`} style={styles.weekRowContainer}>
              {/* 7일간의 날짜 셀 그리드 */}
              <View style={styles.daysRow}>
                {week.map((item, colIdx) => {
                  const allDaySchedules = allSchedulesByDate.get(item.dateString) || [];
                  const singleSchedules = singleDaySchedulesByDate.get(item.dateString) || [];
                  const hasMore = singleSchedules.length > 2;
                  const visibleSchedules = singleSchedules.slice(0, 2);
                  const hiddenCount = singleSchedules.length - 2;
                  const isSunday = colIdx === 0;
                  const isSaturday = colIdx === 6;

                  return (
                    <TouchableOpacity
                      key={`${item.dateString}-${colIdx}`}
                      style={[
                        styles.cell,
                        !item.isCurrentMonth && styles.cellOtherMonth,
                        item.isToday && styles.cellToday,
                      ]}
                      onPress={() => onSelectDate(item.dateString, allDaySchedules)}
                      activeOpacity={0.75}
                    >
                      {/* 날짜 숫자 */}
                      <View style={styles.cellHeader}>
                        <View
                          style={[
                            styles.dayNumberBadge,
                            item.isToday && styles.dayNumberBadgeToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumberText,
                              !item.isCurrentMonth && styles.dayNumberTextDimmed,
                              isSunday && styles.textSunday,
                              isSaturday && styles.textSaturday,
                              item.isToday && styles.dayNumberTextToday,
                            ]}
                          >
                            {item.dayNumber}
                          </Text>
                        </View>
                      </View>

                      {/* 단일 일정 칩 목록 (첫째줄 막대 슬롯 높이만큼 paddingTop 부여) */}
                      <View
                        style={[
                          styles.scheduleChipsContainer,
                          hasBars && { paddingTop: barSlotHeight + 2 },
                        ]}
                      >
                        {visibleSchedules.map((schedule) => (
                          <TouchableOpacity
                            key={schedule.id}
                            style={[
                              styles.scheduleChip,
                              { backgroundColor: schedule.color || COLORS.accentBlue },
                            ]}
                            onPress={() => onSelectSchedule(schedule)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={styles.scheduleChipText}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {schedule.authorName} {schedule.targetName}
                            </Text>
                          </TouchableOpacity>
                        ))}

                        {/* 추가 일정 축약 뱃지 (shadcn Badge 스타일) */}
                        {hasMore && (
                          <View style={styles.moreBadge}>
                            <Text style={styles.moreBadgeText}>
                              +{hiddenCount}개 더보기
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 달력 내부 첫째줄에 위치하는 긴 막대 (21st.dev Alert/Highlight bar 스타일) */}
              {weekBars.map((bar, barIdx) => {
                const colSpan = bar.endCol - bar.startCol + 1;
                const leftPercent = (bar.startCol / 7) * 100;
                const widthPercent = (colSpan / 7) * 100;
                const topPos = 24 + barIdx * 22;

                return (
                  <TouchableOpacity
                    key={`bar-${bar.schedule.id}-${wIdx}-${barIdx}`}
                    style={[
                      styles.continuousBar,
                      {
                        top: topPos,
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        backgroundColor: bar.schedule.color || '#DC2626',
                        borderTopLeftRadius: bar.isStartOfSchedule ? 5 : 0,
                        borderBottomLeftRadius: bar.isStartOfSchedule ? 5 : 0,
                        borderTopRightRadius: bar.isEndOfSchedule ? 5 : 0,
                        borderBottomRightRadius: bar.isEndOfSchedule ? 5 : 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      },
                    ]}
                    onPress={() => onSelectSchedule(bar.schedule)}
                    activeOpacity={0.85}
                  >
                    <MegaphoneIcon size={12} color="#FFFFFF" />
                    <Text style={styles.continuousBarText} numberOfLines={1}>
                      {bar.schedule.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  monthTitleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  scheduleTotalLabel: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  outlineNavButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outlineNavButtonText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  outlineTodayButton: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outlineTodayButtonText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 9,
  },
  weekCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  calendarBody: {
    backgroundColor: COLORS.card,
  },
  weekRowContainer: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  daysRow: {
    flexDirection: 'row',
    width: '100%',
  },
  cell: {
    flex: 1,
    minHeight: 100,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
    padding: 3,
    backgroundColor: COLORS.card,
    position: 'relative',
  },
  cellOtherMonth: {
    backgroundColor: '#FAFAFA',
  },
  cellToday: {
    backgroundColor: '#F8FAFC',
  },
  cellHeader: {
    alignItems: 'flex-start',
    marginBottom: 2,
    height: 22,
  },
  dayNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberBadgeToday: {
    backgroundColor: COLORS.primary, // shadcn dark solid badge
  },
  dayNumberText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayNumberTextDimmed: {
    color: COLORS.textDisabled,
  },
  dayNumberTextToday: {
    color: '#FFFFFF',
  },
  textSunday: {
    color: COLORS.danger,
  },
  textSaturday: {
    color: COLORS.accentBlue,
  },
  // 11월 대집회 연속 막대
  continuousBar: {
    position: 'absolute',
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 7,
    zIndex: 10,
    ...SHADOWS.sm,
  },
  continuousBarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  scheduleChipsContainer: {
    flex: 1,
    gap: 3,
  },
  scheduleChip: {
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderRadius: 5,
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  scheduleChipText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  moreBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moreBadgeText: {
    fontSize: 8.5,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
});
