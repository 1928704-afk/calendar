import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  COLORS,
  DEPARTMENT_BG_COLORS,
  DEPARTMENT_COLORS,
  SHADOWS,
} from '../constants/theme';
import { api } from '../services/api';
import { Schedule } from '../types';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PlusIcon,
  SparklesIcon,
  ArrowRightIcon,
} from './icons';

interface TimelineViewProps {
  departmentId: number;
  initialYear: number;
  initialMonth: number; // 1-12
  isAllDept?: boolean;
  onSelectSchedule: (schedule: Schedule) => void;
  onAddScheduleForDate: (dateString: string) => void;
}

// 타임라인 아이템 (기간 행사 또는 단일 날짜 일정 묶음)
export type TimelineItem =
  | {
      type: 'period';
      id: string;
      startDate: string;
      endDate: string;
      dateDisplay: string;
      schedule: Schedule;
    }
  | {
      type: 'day';
      id: string;
      date: string;
      dayOfWeek: string;
      dateDisplay: string;
      schedules: Schedule[];
    };

// 요일 반환 헬퍼
const getDayOfWeekStr = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[d.getDay()] || '';
};

// "2026-11-23" -> "11.23(월)"
const formatDateWithDay = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const m = parts[1];
  const d = parts[2];
  const dayOfWeek = getDayOfWeekStr(dateStr);
  return `${m}.${d}(${dayOfWeek})`;
};

// 기간 표기: "11.23(월) ~ 11.29(일)"
const formatPeriodDate = (startDate: string, endDate: string): string => {
  return `${formatDateWithDay(startDate)} ~ ${formatDateWithDay(endDate)}`;
};

const PAGE_SIZE = 4; // 한 번에 노출할 타임라인 항목 수 (무한 스크롤 단위)

export const TimelineView: React.FC<TimelineViewProps> = ({
  departmentId,
  initialYear,
  initialMonth,
  isAllDept = false,
  onSelectSchedule,
  onAddScheduleForDate,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);

  // 해당 월의 전체 타임라인 항목 (기간 행사 단일화 + 단일 날짜 일정)
  const [allItems, setAllItems] = useState<TimelineItem[]>([]);
  // 같은 달 내에서 현재까지 보여주는 항목 개수 (무한 스크롤)
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const scrollViewRef = useRef<any>(null);

  // 월 데이터 로드 및 타임라인 아이템 가공
  const loadMonthData = useCallback(
    async (year: number, month: number) => {
      try {
        setLoading(true);
        const data = await api.getMonthlyTimeline(departmentId, year, month);
        const rawDays = data.days || [];

        // 1. 기간 행사 단일화 및 단일 날짜 일정 분리
        const periodMap = new Map<string, Schedule>();
        const singleDayMap = new Map<string, { date: string; dayOfWeek: string; schedules: Schedule[] }>();

        rawDays.forEach((day) => {
          (day.schedules || []).forEach((sched) => {
            const isPeriod = sched.endDate && sched.endDate > sched.scheduleDate;
            if (isPeriod) {
              // 대집회 등 같은 행사는 전체 부서 모드이든 부서 모드이든 딱 1개만 등록
              const periodKey = `${sched.title.trim()}_${sched.scheduleDate}_${sched.endDate}`;
              if (!periodMap.has(periodKey)) {
                periodMap.set(periodKey, sched);
              }
            } else {
              // 단일 일정
              if (!singleDayMap.has(day.date)) {
                singleDayMap.set(day.date, {
                  date: day.date,
                  dayOfWeek: day.dayOfWeek,
                  schedules: [],
                });
              }
              const dayEntry = singleDayMap.get(day.date)!;
              if (!dayEntry.schedules.some((s) => s.id === sched.id)) {
                dayEntry.schedules.push(sched);
              }
            }
          });
        });

        const items: TimelineItem[] = [];

        // 기간 행사 추가 (날짜에 ~ 표기)
        periodMap.forEach((sched, key) => {
          items.push({
            type: 'period',
            id: `period_${key}`,
            startDate: sched.scheduleDate,
            endDate: sched.endDate!,
            dateDisplay: formatPeriodDate(sched.scheduleDate, sched.endDate!),
            schedule: sched,
          });
        });

        // 단일 날짜 일정 추가
        singleDayMap.forEach((entry) => {
          if (entry.schedules.length > 0) {
            items.push({
              type: 'day',
              id: `day_${entry.date}`,
              date: entry.date,
              dayOfWeek: entry.dayOfWeek,
              dateDisplay: formatDateWithDay(entry.date),
              schedules: entry.schedules,
            });
          }
        });

        // 시작 날짜 기준으로 오름차순 정렬
        items.sort((a, b) => {
          const dateA = a.type === 'period' ? a.startDate : a.date;
          const dateB = b.type === 'period' ? b.startDate : b.date;
          return dateA.localeCompare(dateB);
        });

        setAllItems(items);
        setVisibleCount(PAGE_SIZE);
      } catch (e) {
        console.error('Failed to load monthly timeline:', e);
      } finally {
        setLoading(false);
      }
    },
    [departmentId]
  );

  useEffect(() => {
    loadMonthData(currentYear, currentMonth);
  }, [loadMonthData, currentYear, currentMonth]);

  // 이전 달 이동
  const handlePrevMonth = () => {
    let y = currentYear;
    let m = currentMonth - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setCurrentYear(y);
    setCurrentMonth(m);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  // 다음 달 이동
  const handleNextMonth = () => {
    let y = currentYear;
    let m = currentMonth + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setCurrentYear(y);
    setCurrentMonth(m);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  // 이번 달(초기 월)로 리셋
  const handleGoCurrentMonth = () => {
    setCurrentYear(initialYear);
    setCurrentMonth(initialMonth);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // 같은 달 내 무한 스크롤
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const paddingToBottom = 80;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && !loadingMore && !loading && visibleCount < allItems.length) {
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allItems.length));
        setLoadingMore(false);
      }, 250);
    }
  };

  const visibleItems = allItems.slice(0, visibleCount);
  const hasMoreInMonth = visibleCount < allItems.length;

  return (
    <View style={styles.wrapper}>
      {/* 1. 상단 월단위 네비게이션 (shadcn Outline Buttons & Clean Title) */}
      <View style={styles.monthNavHeader}>
        <TouchableOpacity
          style={styles.outlineNavButton}
          onPress={handlePrevMonth}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={14} color={COLORS.textPrimary} />
          <Text style={styles.outlineNavButtonText}>이전달</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthTitleBox}
          onPress={handleGoCurrentMonth}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={16} color={COLORS.primary} />
            <Text style={styles.monthTitleText}>
              {currentYear}년 {currentMonth}월
            </Text>
          </View>
          <Text style={styles.monthCountBadge}>
            총 {allItems.length}개 행사 및 일정
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineNavButton}
          onPress={handleNextMonth}
          activeOpacity={0.7}
        >
          <Text style={styles.outlineNavButtonText}>다음달</Text>
          <ChevronRightIcon size={14} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 안내 캡션 바 (shadcn Alert 스타일) */}
      <View style={styles.alertNotice}>
        <SparklesIcon size={14} color={COLORS.primary} />
        <Text style={styles.alertNoticeText}>
          월 이동은 [이전달/다음달] 버튼으로 구분되며, 같은 달 내에서 스크롤 시 순차 로드됩니다.
        </Text>
      </View>

      {/* 2. 타임라인 피드 리스트 */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {currentYear}년 {currentMonth}월 일정을 불러오는 중입니다...
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          contentContainerStyle={styles.scrollContent}
        >
          {allItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CalendarIcon size={32} color={COLORS.mutedForeground} />
              </View>
              <Text style={styles.emptyTitle}>
                {currentYear}년 {currentMonth}월에는 등록된 일정이 없습니다.
              </Text>
              <Text style={styles.emptySubtitle}>
                하단의 ＋ 버튼을 눌러 새 일정을 등록해 보세요.
              </Text>
              <TouchableOpacity
                style={styles.primaryAddButton}
                onPress={() => onAddScheduleForDate(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)}
              >
                <PlusIcon size={14} color="#FFF" />
                <Text style={styles.primaryAddButtonText}>첫 일정 추가하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {visibleItems.map((item) => {
                // [A] 기간 행사 (대집회 등): 21st.dev Featured Banner Card 스타일
                if (item.type === 'period') {
                  const s = item.schedule;
                  return (
                    <View key={item.id} style={styles.periodSection}>
                      {/* 기간 일정 헤더 */}
                      <View style={styles.periodHeaderRow}>
                        <View style={styles.periodBadge}>
                          <MegaphoneIcon size={13} color={COLORS.danger} />
                          <Text style={styles.periodDateText}>{item.dateDisplay}</Text>
                        </View>
                        <View style={styles.periodDurationTag}>
                          <Text style={styles.periodDurationText}>연속 집회/행사</Text>
                        </View>
                      </View>

                      {/* 기간 일정 카드 */}
                      <TouchableOpacity
                        style={[
                          styles.periodCard,
                          { borderLeftColor: s.color || COLORS.danger },
                        ]}
                        onPress={() => onSelectSchedule(s)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.cardHeader}>
                          <View style={styles.badgeGroup}>
                            {isAllDept && (
                              <View
                                style={[
                                  styles.deptTag,
                                  {
                                    backgroundColor:
                                      DEPARTMENT_BG_COLORS[s.departmentName] || '#F1F5F9',
                                    borderColor:
                                      DEPARTMENT_COLORS[s.departmentName] || COLORS.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.deptTagText,
                                    {
                                      color:
                                        DEPARTMENT_COLORS[s.departmentName] || COLORS.primary,
                                    },
                                  ]}
                                >
                                  {s.departmentName}
                                </Text>
                              </View>
                            )}
                            <View
                              style={[
                                styles.categoryBadge,
                                { backgroundColor: s.color || COLORS.danger },
                              ]}
                            >
                              <Text style={styles.categoryBadgeText}>
                                {s.title}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ClockIcon size={11} color={COLORS.mutedForeground} />
                            <Text style={styles.periodRangeLabel}>
                              {item.dateDisplay}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.periodTitleLarge}>{s.title}</Text>

                        <View style={styles.namesRow}>
                          <Text style={styles.personText}>
                            <Text style={styles.personLabel}>작성: </Text>
                            {s.authorName}
                          </Text>
                          {s.targetName ? (
                            <>
                              <ArrowRightIcon size={12} color={COLORS.mutedForeground} />
                              <Text style={styles.personText}>
                                <Text style={styles.personLabel}>대상: </Text>
                                {s.targetName}
                              </Text>
                            </>
                          ) : null}
                        </View>

                        {s.memo ? (
                          <View style={styles.memoBox}>
                            <MessageSquareIcon size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.memoText} numberOfLines={2}>
                              {s.memo}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.periodCardFooter}>
                          <Text style={styles.periodHintText}>
                            ※ 같은 행사이므로 1개로 단일화하여 표시됩니다. (탭하여 상세/댓글 보기)
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                }

                // [B] 단일 날짜 일정 묶음 (21st.dev Timeline Spine Card 감성)
                return (
                  <View key={item.id} style={styles.daySection}>
                    {/* 날짜 헤더 */}
                    <View style={styles.dayHeaderRow}>
                      <View style={styles.dayBadge}>
                        <View style={styles.timelineDot} />
                        <Text
                          style={[
                            styles.dayOfWeekText,
                            item.dayOfWeek === '일' && { color: COLORS.danger },
                            item.dayOfWeek === '토' && { color: COLORS.accentBlue },
                          ]}
                        >
                          {item.dayOfWeek}요일
                        </Text>
                        <Text style={styles.dateText}>{item.date.substring(5)}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.addMiniButton}
                        onPress={() => onAddScheduleForDate(item.date)}
                        activeOpacity={0.7}
                      >
                        <PlusIcon size={12} color={COLORS.primary} />
                        <Text style={styles.addMiniButtonText}>일정 추가</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 일정 카드 목록 */}
                    <View style={styles.schedulesContainer}>
                      {item.schedules.map((schedule) => (
                        <TouchableOpacity
                          key={schedule.id}
                          style={[
                            styles.card,
                            { borderLeftColor: schedule.color || COLORS.accentBlue },
                          ]}
                          onPress={() => onSelectSchedule(schedule)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.cardHeader}>
                            <View style={styles.badgeGroup}>
                              {isAllDept && (
                                <View
                                  style={[
                                    styles.deptTag,
                                    {
                                      backgroundColor:
                                        DEPARTMENT_BG_COLORS[schedule.departmentName] || '#F1F5F9',
                                      borderColor:
                                        DEPARTMENT_COLORS[schedule.departmentName] || COLORS.border,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.deptTagText,
                                      {
                                        color:
                                          DEPARTMENT_COLORS[schedule.departmentName] || COLORS.primary,
                                      },
                                    ]}
                                  >
                                    {schedule.departmentName}
                                  </Text>
                                </View>
                              )}
                              <View
                                style={[
                                  styles.categoryBadge,
                                  { backgroundColor: schedule.color || COLORS.accentBlue },
                                ]}
                              >
                                <Text style={styles.categoryBadgeText}>
                                  {schedule.title}
                                </Text>
                              </View>
                            </View>

                            {schedule.startTime ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <ClockIcon size={12} color={COLORS.mutedForeground} />
                                <Text style={styles.timeText}>
                                  {schedule.startTime}
                                  {schedule.endTime ? ` ~ ${schedule.endTime}` : ''}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.timeText}>종일</Text>
                            )}
                          </View>

                          <View style={styles.namesRow}>
                            <Text style={styles.personText}>
                              <Text style={styles.personLabel}>작성: </Text>
                              {schedule.authorName}
                            </Text>
                            <ArrowRightIcon size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.personText}>
                              <Text style={styles.personLabel}>대상: </Text>
                              {schedule.targetName}
                            </Text>
                          </View>

                          {schedule.memo ? (
                            <View style={styles.memoBox}>
                              <MessageSquareIcon size={12} color={COLORS.mutedForeground} />
                              <Text style={styles.memoText} numberOfLines={2}>
                                {schedule.memo}
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* 하단 무한 스크롤 인디케이터 (shadcn Button / Alert 감성) */}
              <View style={styles.footerContainer}>
                {loadingMore ? (
                  <View style={styles.loadingMoreBox}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingMoreText}>
                      {currentMonth}월 추가 일정을 불러오는 중입니다...
                    </Text>
                  </View>
                ) : hasMoreInMonth ? (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allItems.length))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.loadMoreButtonText}>
                      ↓ {currentMonth}월 일정 더보기 ({visibleCount} / {allItems.length})
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.endBox}>
                    <Text style={styles.endOfListText}>
                      ✨ {currentYear}년 {currentMonth}월의 모든 일정({allItems.length}개)을 확인했습니다.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  monthNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  outlineNavButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  outlineNavButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  monthTitleBox: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  monthCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  alertNotice: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  alertNoticeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  timelineList: {
    padding: 16,
    gap: 16,
  },
  // 기간 행사 (대집회) 전용 21st.dev Banner Card 스타일
  periodSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 10,
    ...SHADOWS.sm,
  },
  periodHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  periodBadgeIcon: {
    fontSize: 13,
  },
  periodDateText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B91C1C',
  },
  periodDurationTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  periodDurationText: {
    fontSize: 10.5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...SHADOWS.sm,
    gap: 8,
  },
  periodRangeLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  periodTitleLarge: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  periodCardFooter: {
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  periodHintText: {
    fontSize: 10.5,
    color: '#9CA3AF',
  },
  // 단일 날짜 일정 스타일
  daySection: {
    gap: 8,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  dayOfWeekText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  addMiniButton: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addMiniButtonText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  schedulesContainer: {
    gap: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  deptTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  deptTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  namesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personText: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  personLabel: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  personArrow: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  memoBox: {
    backgroundColor: '#F8FAFC',
    padding: 7,
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  memoText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  primaryAddButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  primaryAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  footerContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  loadingMoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingMoreText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  loadMoreButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  loadMoreButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  endBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
