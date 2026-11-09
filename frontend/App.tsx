import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomTabBar } from './src/components/BottomTabBar';
import { CalendarView } from './src/components/CalendarView';
import { DayDetailModal } from './src/components/DayDetailModal';
import { Header } from './src/components/Header';
import { BellIcon } from './src/components/icons';
import { LoginModal } from './src/components/LoginModal';
import { MyPrayerListView } from './src/components/MyPrayerListView';
import { NotificationModal } from './src/components/NotificationModal';
import { PrayerListView } from './src/components/PrayerListView';
import { ScheduleFormModal } from './src/components/ScheduleFormModal';
import { TimelineView } from './src/components/TimelineView';
import { COLORS } from './src/constants/theme';
import { PRAYER_TARGETS } from './src/data/prayerData';
import { api } from './src/services/api';
import { getKSTDate } from './src/utils/dateUtils';
import {
  Department,
  MainTabType,
  NotificationItem,
  PrayerTargetItem,
  Schedule,
  TimelineData,
  UserSession,
} from './src/types';
import {
  syncScheduleToSheet,
  syncRallyPrayerToSheet,
  bulkSyncToSheet,
} from './src/services/googleSheet';

// 세션 스토리지 키 정의
const STORAGE_SESSION_KEY = 'CALENDAR_USER_SESSION';

const loadSessionFromStorage = (): UserSession | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.error('Failed to load session from storage:', e);
  }
  return null;
};

const saveSessionToStorage = (session: UserSession | null) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (session) {
        window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    }
  } catch (e) {
    console.error('Failed to save session to storage:', e);
  }
};

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 1, name: '언약부', sortOrder: 1 },
  { id: 2, name: '밀알부', sortOrder: 2 },
  { id: 3, name: '이레부', sortOrder: 3 },
];

export default function App() {
  // 컴포넌트 마운트 전 로컬 세션 동기 복원 (새로고침 시 로그인 풀림 방지)
  const initialSession = loadSessionFromStorage();

  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>(initialSession);
  const [loginModalVisible, setLoginModalVisible] = useState<boolean>(!initialSession);

  // 하단 탭 상태: 'calendar' | 'prayers' | 'myPrayers'
  const [currentTab, setCurrentTab] = useState<MainTabType>('calendar');

  // 현재 보고 있는 카테고리/부서 ID (로그인 세션 부서 ID 또는 전체 부서 0)
  const [currentDeptId, setCurrentDeptId] = useState<number>(
    initialSession ? initialSession.departmentId : 0
  );

  // 뷰 모드 ('calendar' | 'timeline')
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');

  // 날짜/주차 상태 (한국 시간 KST 기준)
  const [currentDate, setCurrentDate] = useState<Date>(() => getKSTDate());
  const [currentYear, setCurrentYear] = useState<number>(() => getKSTDate().getFullYear());
  const [currentWeek, setCurrentWeek] = useState<number>(45);

  // 캘린더 데이터 상태
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // 기도명단 데이터 상태
  const [prayers, setPrayers] = useState<PrayerTargetItem[]>(PRAYER_TARGETS);
  const [loadingPrayers, setLoadingPrayers] = useState<boolean>(false);

  // 모달 상태
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formDefaultDate, setFormDefaultDate] = useState<string>('');

  const [dayDetailVisible, setDayDetailVisible] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>('');
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<Schedule[]>([]);

  // 알림 상태
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notificationModalVisible, setNotificationModalVisible] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);

  // 안드로이드 및 모든 모바일 브라우저에서 일관된 Pretendard 폰트 강제 주입
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'global-pretendard-font-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          *, *::before, *::after, [dir="auto"], [class*="css-text-"], [class*="r-fontFamily-"] {
            font-family: "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            letter-spacing: -0.015em;
            word-break: keep-all;
            overflow-wrap: break-word;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // 1. 초기 부서 목록 및 기도명단 로드
  useEffect(() => {
    fetchDepartments();
    loadPrayers();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoadingDepts(true);
      const list = await api.getDepartments();
      if (list && list.length > 0) {
        setDepartments(list);
      }
    } catch (err: any) {
      console.warn('부서 목록 로드 실패 (기본 부서 유지):', err);
    } finally {
      setLoadingDepts(false);
    }
  };

  // 기도명단 로드 (서버 데이터와 기본 167건 명단을 스마트 병합하여 명단 유실 원천 차단)
  const loadPrayers = async () => {
    try {
      setLoadingPrayers(true);
      const serverList = await api.getPrayers();

      // 1. 기본 167건 명단 맵 구성
      const prayerMap = new Map<string, PrayerTargetItem>();
      PRAYER_TARGETS.forEach((p) => {
        const key = `${(p.department || '').trim()}_${(p.leader || '').trim()}_${(p.target || '').trim()}`;
        prayerMap.set(key, { ...p });
      });

      // 2. 서버 데이터가 있으면 상태(isRally 등) 및 새 등록자 반영
      if (serverList && Array.isArray(serverList) && serverList.length > 0) {
        serverList.forEach((sp) => {
          const key = `${(sp.department || '').trim()}_${(sp.leader || '').trim()}_${(sp.target || '').trim()}`;
          const existing = prayerMap.get(key);
          if (existing) {
            prayerMap.set(key, {
              ...existing,
              id: sp.id || existing.id,
              isRally: sp.isRally !== undefined ? sp.isRally : existing.isRally,
              relationship: sp.relationship || existing.relationship,
              age: sp.age || existing.age,
            });
          } else {
            prayerMap.set(key, sp);
          }
        });
      }

      setPrayers(Array.from(prayerMap.values()));
    } catch (err: any) {
      console.warn('기도명단 API 로드 실패, 기본 명단 유지:', err);
    } finally {
      setLoadingPrayers(false);
    }
  };

  // 2. 일정 데이터 로드 (currentDeptId 기준: 0이면 전체 부서, 특정 부서면 해당 부서)
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // 월간 일정 로드
      const monthly = await api.getMonthlySchedules(currentDeptId, year, month);
      setSchedules(monthly);

      // 주간 타임라인 로드
      const timeline = await api.getTimelineSchedules(currentDeptId, currentYear, currentWeek);
      setTimelineData(timeline);
    } catch (err: any) {
      console.error('일정 데이터 로드 실패:', err);
    } finally {
      setLoadingData(false);
    }
  }, [currentDeptId, currentDate, currentYear, currentWeek]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 알림 로드 함수 (폴링 지원)
  const loadNotifications = useCallback(async (isPolling = false) => {
    if (!userSession?.userName) return;
    try {
      const list = await api.getNotifications(userSession.userName);
      const unread = list.filter((n) => !n.isRead).length;

      // 폴링 중 새 알림이 감지된 경우 (이전보다 미읽음 증가)
      if (isPolling && unread > unreadCount && list.length > 0) {
        const latest = list[0];
        if (!latest.isRead) {
          setToastNotification(latest);
          setTimeout(() => setToastNotification(null), 5000);

          // 브라우저 웹 푸시 알림
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                new Notification(`💬 [${latest.senderName}] 새 댓글`, {
                  body: `'${latest.scheduleTitle}' 일정: ${latest.commentContent}`,
                });
              } catch (e) {}
            }
          }
        }
      }

      setNotifications(list);
      setUnreadCount(unread);
    } catch (e) {}
  }, [userSession, unreadCount]);

  // 브라우저 알림 권한 1회 요청
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // 12초 주기 백그라운드 알림 폴링
  useEffect(() => {
    if (userSession?.userName) {
      loadNotifications(false);
      const interval = setInterval(() => {
        loadNotifications(true);
      }, 12000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userSession?.userName, loadNotifications]);

  // 알림 클릭 -> 읽음 처리 및 해당 일정 열기
  const handleSelectNotification = async (item: NotificationItem) => {
    try {
      await api.markNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {}

    setNotificationModalVisible(false);
    setToastNotification(null);

    // 해당 일정 찾아서 열기
    const found = schedules.find((s) => s.id === item.scheduleId);
    if (found) {
      setEditingSchedule(found);
      setFormModalVisible(true);
    } else {
      try {
        const fullSchedules = await api.getMonthlySchedules(0, currentDate.getFullYear(), currentDate.getMonth() + 1);
        setSchedules(fullSchedules);
        const match = fullSchedules.find((s) => s.id === item.scheduleId);
        if (match) {
          setEditingSchedule(match);
          setFormModalVisible(true);
        }
      } catch (err) {}
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!userSession?.userName) return;
    try {
      await api.markAllNotificationsAsRead(userSession.userName);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  // 간이 로그인 핸들러: 소속 부서 + 이름 입력 후 세션 영구 저장
  const handleLogin = async (deptId: number, userName: string) => {
    const res = await api.simpleLogin(deptId, userName);
    const session: UserSession = {
      departmentId: res.departmentId,
      departmentName: res.departmentName,
      userName: res.userName,
      loginAt: res.loginAt,
    };
    setUserSession(session);
    saveSessionToStorage(session);
    setCurrentDeptId(res.departmentId);
    setLoginModalVisible(false);
  };

  // 로그아웃
  const handleLogout = () => {
    setUserSession(null);
    saveSessionToStorage(null);
    setCurrentDeptId(0);
    setNotifications([]);
    setUnreadCount(0);
    setLoginModalVisible(true);
  };

  // 상단 카테고리 전환 핸들러
  const handleSelectDepartment = (deptId: number, deptName: string) => {
    if (!userSession) {
      setLoginModalVisible(true);
      return;
    }
    setCurrentDeptId(deptId);
  };

  // 월 변경
  const handleChangeMonth = (delta: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
  };

  // 오늘(한국 시간 KST 기준)로 이동
  const handleGoToday = () => {
    const today = getKSTDate();
    setCurrentDate(today);
    setCurrentYear(today.getFullYear());
  };

  // 캘린더 날짜 탭 -> 해당 날짜 상세 모달
  const handleSelectDate = (dateString: string, daySchedules: Schedule[]) => {
    setSelectedDayDate(dateString);
    setSelectedDaySchedules(daySchedules);
    setDayDetailVisible(true);
  };

  // 일정 카드/칩 탭 -> 수정 또는 상세 보기 모달
  const handleSelectSchedule = (schedule: Schedule) => {
    if (!userSession) {
      setLoginModalVisible(true);
      return;
    }
    setEditingSchedule(schedule);
    setFormModalVisible(true);
  };

  // 특정 날짜에 새 일정 등록
  const handleOpenCreateForDate = (dateString: string) => {
    if (!userSession) {
      setLoginModalVisible(true);
      return;
    }
    setEditingSchedule(null);
    setFormDefaultDate(dateString);
    setFormModalVisible(true);
  };

  // FAB 버튼 -> 새 일정 등록
  const handleOpenCreateFAB = () => {
    if (!userSession) {
      setLoginModalVisible(true);
      return;
    }
    setEditingSchedule(null);
    setFormDefaultDate(currentDate.toISOString().split('T')[0]);
    setFormModalVisible(true);
  };

  // 일정 저장
  const handleSubmitForm = async (formData: any) => {
    if (!userSession) {
      setLoginModalVisible(true);
      return;
    }
    if (editingSchedule) {
      const deptId = editingSchedule.departmentId;
      await api.updateSchedule(deptId, editingSchedule.id, formData);
    } else {
      const deptId = formData.departmentId || userSession.departmentId || 1;
      const { modifierName, ...createData } = formData;
      await api.createSchedule(deptId, createData);
    }

    // 캘린더 일정 등록/수정 시 구글 시트에 실시간 동기화
    const targetDept = departments.find((d) => d.id === (formData.departmentId || userSession.departmentId));
    syncScheduleToSheet({
      scheduleDate: formData.scheduleDate,
      department: targetDept ? targetDept.name : (userSession.departmentName || ''),
      title: formData.title,
      authorName: userSession.userName,
      targetName: formData.targetName || '',
      memo: formData.memo || '',
    });

    // 캘린더 일정 등록/수정 시 선택되거나 입력된 대상자를 자동으로 대집회 기도명단에 추가
    if (formData.targetName && formData.targetName.trim()) {
      const targetNameTrimmed = formData.targetName.trim();
      const existing =
        prayers.find(
          (p) =>
            p.target.trim() === targetNameTrimmed &&
            p.leader.trim() === userSession.userName.trim()
        ) || prayers.find((p) => p.target.trim() === targetNameTrimmed);

      if (existing) {
        // 이미 명단에 있는 대상자인데 대집회 등록이 안되어 있다면 자동 등록
        if (!existing.isRally) {
          await handleToggleRally(existing.id, true);
        }
      } else {
        // 명단에 없는 신규 대상자면 내 기도명단 및 대집회 기도명단에 자동 등록
        await handleAddPrayer({
          department: userSession.departmentName || '언약부',
          leader: userSession.userName,
          target: targetNameTrimmed,
          isRally: true,
        });
      }
    }

    await loadData();
  };

  // 일정 삭제
  const handleDeleteSchedule = async (scheduleId: number, modifierName: string) => {
    if (!userSession) return;
    const targetSchedule = schedules.find((s) => s.id === scheduleId);
    const deptId = targetSchedule?.departmentId || userSession.departmentId || 1;
    await api.deleteSchedule(deptId, scheduleId, modifierName);
    await loadData();
  };

  // 새 전도 대상자 등록 핸들러 (내 기도명단 또는 대집회 명단에서 추가)
  const handleAddPrayer = async (data: {
    department: string;
    leader: string;
    target: string;
    relationship?: string;
    age?: string;
    isRally?: boolean;
  }) => {
    try {
      const newPrayer = await api.createPrayer(data);
      setPrayers((prev) => [newPrayer, ...prev]);
    } catch (e) {
      // 로컬 추가 fallback
      const localId = Date.now();
      const localItem: PrayerTargetItem = {
        id: localId,
        department: data.department,
        leader: data.leader,
        target: data.target,
        relationship: data.relationship,
        age: data.age,
        isRally: Boolean(data.isRally),
      };
      setPrayers((prev) => [localItem, ...prev]);
    }

    // 대집회 대상자로 추가된 경우 구글 시트 대집회 기도명단 탭에 실시간 동기화
    if (data.isRally) {
      syncRallyPrayerToSheet({
        department: data.department,
        leader: data.leader,
        target: data.target,
        relationship: data.relationship,
        age: data.age,
      });
    }
  };

  // 대집회 기도명단 등록/해제 토글 핸들러 (낙관적 즉시 업데이트)
  const handleToggleRally = async (id: number, isRally?: boolean) => {
    const targetItem = prayers.find((p) => p.id === id);
    const willBeRally = typeof isRally === 'boolean' ? isRally : (targetItem ? !targetItem.isRally : true);

    // 1. UI 즉시 반영 (0초 반응)
    setPrayers((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, isRally: willBeRally };
        }
        return p;
      })
    );

    // 대집회에 등록된 경우 구글 시트 대집회 기도명단 탭에 실시간 동기화
    if (willBeRally && targetItem) {
      syncRallyPrayerToSheet({
        department: targetItem.department,
        leader: targetItem.leader,
        target: targetItem.target,
        relationship: targetItem.relationship,
        age: targetItem.age,
      });
    }

    // 2. 백엔드 API 호출
    try {
      await api.togglePrayerRally(id, isRally);
    } catch (e) {
      console.warn('API togglePrayerRally 실패:', e);
    }
  };

  // 전도 대상자 삭제 핸들러 (낙관적 즉시 삭제)
  const handleDeletePrayer = async (id: number) => {
    // 1. UI 즉시 삭제 반영 (0초 반응)
    setPrayers((prev) => prev.filter((p) => p.id !== id));

    // 2. 백엔드 API 호출
    try {
      await api.deletePrayer(id);
    } catch (e) {
      console.warn('API deletePrayer 실패:', e);
      loadPrayers();
    }
  };

  const isAllDept = currentDeptId === 0;

  // 내 기도명단 카운트 계산
  const myPrayerCount = useMemo(() => {
    if (!userSession) return 0;
    return prayers.filter((p) => p.leader.trim() === userSession.userName.trim()).length;
  }, [prayers, userSession]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* [1] 캘린더 탭 화면 */}
      {currentTab === 'calendar' && (
        <>
          <Header
            userSession={userSession}
            currentDeptId={currentDeptId}
            departments={departments}
            unreadCount={unreadCount}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
            onSelectDepartment={handleSelectDepartment}
            onOpenNotification={() => setNotificationModalVisible(true)}
            onOpenLogin={() => setLoginModalVisible(true)}
            onLogout={handleLogout}
          />

          <View style={styles.body}>
            {loadingData && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingBannerText}>일정을 동기화하는 중...</Text>
              </View>
            )}

            {viewMode === 'calendar' ? (
              <CalendarView
                currentDate={currentDate}
                schedules={schedules}
                isAllDept={isAllDept}
                onChangeMonth={handleChangeMonth}
                onGoToday={handleGoToday}
                onSelectDate={handleSelectDate}
                onSelectSchedule={handleSelectSchedule}
              />
            ) : (
              <TimelineView
                departmentId={currentDeptId}
                initialYear={currentDate.getFullYear()}
                initialMonth={currentDate.getMonth() + 1}
                isAllDept={isAllDept}
                onSelectSchedule={handleSelectSchedule}
                onAddScheduleForDate={handleOpenCreateForDate}
              />
            )}
          </View>

          {/* 플로팅 새 일정 추가 버튼 (FAB) */}
          <TouchableOpacity
            style={[styles.fab, !userSession && styles.fabDisabled]}
            onPress={handleOpenCreateFAB}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>＋</Text>
            <Text style={styles.fabText}>{userSession ? '일정 등록' : '로그인 필요'}</Text>
          </TouchableOpacity>
        </>
      )}

      {/* [2] 26년 기도명단 탭 화면 (전체/부서별 기도명단 & 대집회 기도명단) */}
      {currentTab === 'prayers' && (
        <View style={styles.body}>
          <PrayerListView
            prayers={prayers}
            loading={loadingPrayers}
            currentUserName={userSession?.userName || ''}
            onRefresh={loadPrayers}
            onAddPrayer={handleAddPrayer}
            onToggleRally={handleToggleRally}
          />
        </View>
      )}

      {/* [3] 내 기도명단 탭 화면 (내 전도 대상자만 필터링) */}
      {currentTab === 'myPrayers' && (
        <View style={styles.body}>
          <MyPrayerListView
            userSession={userSession}
            prayers={prayers}
            loading={loadingPrayers}
            onOpenLogin={() => setLoginModalVisible(true)}
            onAddPrayer={handleAddPrayer}
            onDeletePrayer={handleDeletePrayer}
            onToggleRally={handleToggleRally}
          />
        </View>
      )}

      {/* 최하단 고정 탭바 (캘린더 / 기도명단 / 내 기도명단) */}
      <BottomTabBar
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        myPrayerCount={myPrayerCount}
      />

      {/* 모달 1: 간이 로그인 모달 */}
      <LoginModal
        visible={loginModalVisible}
        departments={departments}
        loading={loadingDepts}
        onLogin={handleLogin}
        onClose={() => setLoginModalVisible(false)}
      />

      {/* 모달 2: 일자별 상세 모달 */}
      <DayDetailModal
        visible={dayDetailVisible}
        dateString={selectedDayDate}
        schedules={selectedDaySchedules}
        isAllDept={isAllDept}
        currentUserName={userSession?.userName || ''}
        onClose={() => setDayDetailVisible(false)}
        onSelectSchedule={handleSelectSchedule}
        onAddSchedule={handleOpenCreateForDate}
      />

      {/* 모달 3: 일정 등록/수정 모달 */}
      <ScheduleFormModal
        visible={formModalVisible}
        editingSchedule={editingSchedule}
        defaultDate={formDefaultDate}
        currentUserName={userSession?.userName || ''}
        departments={departments}
        currentDepartmentId={userSession?.departmentId || 1}
        userDepartmentName={userSession?.departmentName || '언약부'}
        myPrayerTargets={
          userSession
            ? prayers.filter((p) => p.leader.trim() === userSession.userName.trim())
            : []
        }
        onAddNewPrayerTarget={handleAddPrayer}
        onClose={() => {
          setFormModalVisible(false);
          setEditingSchedule(null);
        }}
        onSubmit={handleSubmitForm}
        onDelete={handleDeleteSchedule}
      />

      {/* 상단 새 댓글 실시간 플로팅 토스트 배너 */}
      {toastNotification && (
        <TouchableOpacity
          style={styles.notificationToast}
          onPress={() => handleSelectNotification(toastNotification)}
          activeOpacity={0.9}
        >
          <View style={styles.toastIconCircle}>
            <BellIcon size={16} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toastTitle} numberOfLines={1}>
              💬 {toastNotification.senderName}님이 내 일정에 댓글 작성
            </Text>
            <Text style={styles.toastBody} numberOfLines={1}>
              [{toastNotification.scheduleTitle}] {toastNotification.commentContent}
            </Text>
          </View>
          <Text style={styles.toastActionText}>확인</Text>
        </TouchableOpacity>
      )}

      {/* 알림 센터 모달 */}
      <NotificationModal
        visible={notificationModalVisible}
        notifications={notifications}
        unreadCount={unreadCount}
        onClose={() => setNotificationModalVisible(false)}
        onSelectNotification={handleSelectNotification}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.card,
    height: '100%',
    ...(Platform.OS === 'web'
      ? ({
          height: '100vh',
          maxHeight: '100dvh',
          overflow: 'hidden',
        } as any)
      : {}),
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 64, // 하단 고정 탭바 높이만큼 여백 확보
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  loadingBannerText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 78, // 하단 탭바(64px) 바로 위
    backgroundColor: COLORS.primary, // #0F172A
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 1001,
  },
  fabDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#CBD5E1',
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationToast: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    left: 16,
    right: 16,
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 9999,
  },
  toastIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastBody: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  toastActionText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
