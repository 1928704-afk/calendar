import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  COLORS,
  DEPARTMENT_BG_COLORS,
  DEPARTMENT_COLORS,
  SHADOWS,
} from '../constants/theme';
import { Department, UserSession } from '../types';
import {
  BellIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  GlobeAltIcon,
  LogInIcon,
  LogOutIcon,
} from './icons';

interface HeaderProps {
  userSession: UserSession | null;
  currentDeptId: number; // 현재 캘린더에서 보고 있는 부서 ID (0이면 전체 부서)
  departments?: Department[]; // 전체 부서 목록
  unreadCount?: number; // 안 읽은 알림 개수
  viewMode: 'calendar' | 'timeline';
  onToggleViewMode: (mode: 'calendar' | 'timeline') => void;
  onSelectDepartment: (deptId: number, deptName: string) => void;
  onOpenNotification?: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userSession,
  currentDeptId,
  departments = [],
  unreadCount = 0,
  viewMode,
  onToggleViewMode,
  onSelectDepartment,
  onOpenNotification,
  onOpenLogin,
  onLogout,
}) => {
  const isLoggedIn = !!userSession;
  const userDeptId = userSession?.departmentId || 1;
  const userDeptName = userSession?.departmentName || '소속 부서';

  // 기본 부서 목록 fallback
  const deptList: Department[] =
    departments.length > 0
      ? departments
      : [
          { id: 1, name: '언약부', sortOrder: 1 },
          { id: 2, name: '밀알부', sortOrder: 2 },
          { id: 3, name: '이레부', sortOrder: 3 },
        ];

  const handleDeptClick = (deptId: number, deptName: string) => {
    onSelectDepartment(deptId, deptName);
  };

  const handleModeClick = (mode: 'calendar' | 'timeline') => {
    onToggleViewMode(mode);
  };

  const userInitial = userSession?.userName ? userSession.userName.charAt(0) : '?';

  return (
    <View style={styles.container}>
      {/* 1. 상단 브랜드 바 & 사용자 프로필 / 로그인 */}
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          <View style={styles.logoBadge}>
            <CalendarIcon size={18} color={COLORS.primary} strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.brandTitle}>전도 캘린더</Text>
            <Text style={styles.brandSubtitle}>부서별 공유 일정 & 기도명단</Text>
          </View>
        </View>

        <View style={styles.rightActionGroup}>
          {/* 알림 벨 버튼 */}
          {isLoggedIn && (
            <TouchableOpacity
              style={styles.bellButton}
              onPress={onOpenNotification}
              activeOpacity={0.7}
            >
              <BellIcon size={18} color={COLORS.primary} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <View style={styles.bellBadgeDot}>
                  <Text style={styles.bellBadgeDotText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {isLoggedIn ? (
            <View style={styles.profileBox}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.profileBadgeRow}>
                  <View
                    style={[
                      styles.deptPill,
                      {
                        backgroundColor: DEPARTMENT_BG_COLORS[userDeptName] || '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deptPillText,
                        { color: DEPARTMENT_COLORS[userDeptName] || COLORS.primary },
                      ]}
                    >
                      {userDeptName}
                    </Text>
                  </View>
                  <Text style={styles.userNameText}>{userSession.userName}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.ghostLogoutButton}
                onPress={onLogout}
                activeOpacity={0.7}
              >
                <LogOutIcon size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.primaryLoginButton}
              onPress={onOpenLogin}
              activeOpacity={0.85}
            >
              <LogInIcon size={14} color="#FFFFFF" />
              <Text style={styles.primaryLoginButtonText}>로그인</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. 네비게이션 컨트롤 바: 부서 필터(내 부서 / 전체 부서) & 뷰 모드 전환 */}
      <View style={styles.controlRow}>
        {/* 부서 선택 필터 (내 부서 & 전체 부서) */}
        <View style={styles.deptSegmentTrack}>
          {/* 내 부서 탭 */}
          <TouchableOpacity
            style={[
              styles.deptTabButton,
              isLoggedIn && currentDeptId === userDeptId && styles.deptTabButtonActive,
            ]}
            onPress={() => {
              if (!isLoggedIn) {
                onOpenLogin();
                return;
              }
              onSelectDepartment(userDeptId, userDeptName);
            }}
            activeOpacity={0.75}
          >
            <BuildingOfficeIcon
              size={13}
              color={
                isLoggedIn && currentDeptId === userDeptId
                  ? DEPARTMENT_COLORS[userDeptName] || COLORS.primary
                  : COLORS.textSecondary
              }
              strokeWidth={isLoggedIn && currentDeptId === userDeptId ? 2.4 : 1.8}
            />
            <Text
              style={[
                styles.deptTabText,
                isLoggedIn && currentDeptId === userDeptId && [
                  styles.deptTabTextActive,
                  { color: DEPARTMENT_COLORS[userDeptName] || COLORS.primary },
                ],
              ]}
            >
              {isLoggedIn ? userDeptName : '내 부서'}
            </Text>
          </TouchableOpacity>

          {/* 전체 부서 탭 */}
          <TouchableOpacity
            style={[
              styles.deptTabButton,
              currentDeptId === 0 && styles.deptTabButtonActive,
            ]}
            onPress={() => onSelectDepartment(0, '전체 부서')}
            activeOpacity={0.75}
          >
            <GlobeAltIcon
              size={13}
              color={currentDeptId === 0 ? COLORS.primary : COLORS.textSecondary}
              strokeWidth={currentDeptId === 0 ? 2.4 : 1.8}
            />
            <Text
              style={[
                styles.deptTabText,
                currentDeptId === 0 && styles.deptTabTextActive,
              ]}
            >
              전체 부서
            </Text>
          </TouchableOpacity>
        </View>

        {/* 뷰 모드 세그먼트 (달력 / 타임라인) */}
        <View style={styles.modeSegmentTrack}>
          <TouchableOpacity
            style={[
              styles.modeSegmentButton,
              viewMode === 'calendar' && styles.modeSegmentButtonActive,
            ]}
            onPress={() => handleModeClick('calendar')}
            activeOpacity={0.8}
          >
            <CalendarIcon
              size={13}
              color={viewMode === 'calendar' ? COLORS.primary : COLORS.textSecondary}
              strokeWidth={viewMode === 'calendar' ? 2.4 : 1.8}
            />
            <Text
              style={[
                styles.modeSegmentText,
                viewMode === 'calendar' && styles.modeSegmentTextActive,
              ]}
            >
              달력
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeSegmentButton,
              viewMode === 'timeline' && styles.modeSegmentButtonActive,
            ]}
            onPress={() => handleModeClick('timeline')}
            activeOpacity={0.8}
          >
            <ClockIcon
              size={13}
              color={viewMode === 'timeline' ? COLORS.primary : COLORS.textSecondary}
              strokeWidth={viewMode === 'timeline' ? 2.4 : 1.8}
            />
            <Text
              style={[
                styles.modeSegmentText,
                viewMode === 'timeline' && styles.modeSegmentTextActive,
              ]}
            >
              타임라인
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  rightActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeDotText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileInfo: {
    justifyContent: 'center',
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deptPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  deptPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  userNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ghostLogoutButton: {
    padding: 4,
    borderRadius: 6,
  },
  primaryLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
    ...SHADOWS.sm,
  },
  primaryLoginButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  deptSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 10,
    gap: 3,
    flex: 1,
    maxWidth: 240,
  },
  deptTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    gap: 5,
  },
  deptTabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  deptTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deptTabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modeSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 10,
    gap: 3,
  },
  modeSegmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    gap: 4,
  },
  modeSegmentButtonActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  modeSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeSegmentTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: COLORS.textDisabled,
  },
});
