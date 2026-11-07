import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  COLORS,
  DEPARTMENT_BG_COLORS,
  DEPARTMENT_COLORS,
  SHADOWS,
} from '../constants/theme';
import { PrayerTargetCreateRequest, PrayerTargetItem } from '../types';

interface PrayerListViewProps {
  prayers: PrayerTargetItem[];
  loading?: boolean;
  currentUserName?: string;
  onRefresh?: () => void;
  onSelectLeader?: (leaderName: string) => void;
  onAddPrayer?: (data: PrayerTargetCreateRequest) => Promise<void>;
  onToggleRally?: (id: number, isRally?: boolean) => Promise<void>;
}

const DEPARTMENTS = ['전체', '언약부', '밀알부', '이레부'];
const SELECTABLE_DEPTS = ['언약부', '밀알부', '이레부'];

export const PrayerListView: React.FC<PrayerListViewProps> = ({
  prayers,
  loading = false,
  currentUserName = '',
  onRefresh,
  onSelectLeader,
  onAddPrayer,
  onToggleRally,
}) => {
  // 상단 탭: 'all' (26년 전체 명단) vs 'rally' (대집회 기도명단)
  const [listMode, setListMode] = useState<'all' | 'rally'>('all');
  const [selectedDept, setSelectedDept] = useState<string>('전체');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 대집회 대상자 신규 등록 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [newDept, setNewDept] = useState('언약부');
  const [newLeader, setNewLeader] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newAge, setNewAge] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 플로팅 토스트 알림 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2200);
  };

  // 대집회 등록 건수
  const rallyCount = useMemo(() => {
    return prayers.filter((p) => p.isRally).length;
  }, [prayers]);

  // 현재 모드에 따른 기본 대상 목록
  const basePrayers = useMemo(() => {
    if (listMode === 'rally') {
      return prayers.filter((p) => p.isRally);
    }
    return prayers;
  }, [prayers, listMode]);

  // 부서 및 검색어 필터링
  const filteredPrayers = useMemo(() => {
    return basePrayers.filter((item) => {
      // 1. 부서 필터
      if (selectedDept !== '전체' && item.department !== selectedDept) {
        return false;
      }
      // 2. 검색어 필터 (인도자, 전도대상, 관계)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const leaderMatch = item.leader.toLowerCase().includes(kw);
        const targetMatch = item.target.toLowerCase().includes(kw);
        const relMatch = item.relationship ? item.relationship.toLowerCase().includes(kw) : false;
        return leaderMatch || targetMatch || relMatch;
      }
      return true;
    });
  }, [basePrayers, selectedDept, searchKeyword]);

  // 인도자별로 그룹화 (전체 명단 모드 또는 대집회 모드에서 활용)
  const groupedByLeader = useMemo(() => {
    const map = new Map<string, { department: string; items: PrayerTargetItem[] }>();
    for (const p of filteredPrayers) {
      const key = `${p.department}_${p.leader}`;
      if (!map.has(key)) {
        map.set(key, { department: p.department, items: [] });
      }
      map.get(key)!.items.push(p);
    }
    return Array.from(map.entries()).map(([key, value]) => {
      const [dept, leader] = key.split('_');
      return {
        key,
        department: dept,
        leader,
        items: value.items,
      };
    });
  }, [filteredPrayers]);

  // 새 대집회 대상자 추가 처리
  const handleCreateRallyTarget = async () => {
    if (!newTarget.trim()) {
      Alert.alert('입력 확인', '전도 대상자 이름을 입력해주세요.');
      return;
    }
    if (!newLeader.trim()) {
      Alert.alert('입력 확인', '인도자(성도) 이름을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      if (onAddPrayer) {
        await onAddPrayer({
          department: newDept,
          leader: newLeader.trim(),
          target: newTarget.trim(),
          relationship: newRelationship.trim() || undefined,
          age: newAge.trim() || undefined,
          isRally: true,
        });
      }
      Alert.alert('등록 완료', `${newTarget.trim()} 님이 대집회 기도명단에 추가되었습니다! 🎉`);
      setModalVisible(false);
      setNewTarget('');
      setNewRelationship('');
      setNewAge('');
    } catch (err: any) {
      Alert.alert('등록 실패', '등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 대집회 명단 토글 (추가 / 제외)
  const handleToggle = (item: PrayerTargetItem) => {
    if (!onToggleRally) return;
    const nextStatus = !item.isRally;
    onToggleRally(item.id, nextStatus);
    if (!nextStatus) {
      showToast(`'${item.target}' 님이 대집회 명단에서 제외되었습니다.`);
    } else {
      showToast(`📢 '${item.target}' 님이 대집회 기도명단에 추가되었습니다!`);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. 최상단 모드 스위처 (26년 전체 기도명단 vs 대집회 기도명단) */}
      <View style={styles.modeSwitcherContainer}>
        <View style={styles.modeSwitcherTrack}>
          <TouchableOpacity
            style={[styles.modeTab, listMode === 'all' && styles.modeTabActive]}
            onPress={() => setListMode('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, listMode === 'all' && styles.modeTabTextActive]}>
              📋 26년 전체 명단
            </Text>
            <View style={[styles.modeBadge, listMode === 'all' && styles.modeBadgeActive]}>
              <Text style={[styles.modeBadgeText, listMode === 'all' && styles.modeBadgeTextActive]}>
                {prayers.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, listMode === 'rally' && styles.modeTabActiveRally]}
            onPress={() => setListMode('rally')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, listMode === 'rally' && styles.modeTabTextActiveRally]}>
              📢 대집회 기도명단
            </Text>
            <View style={[styles.modeBadge, listMode === 'rally' && styles.modeBadgeActiveRally]}>
              <Text
                style={[
                  styles.modeBadgeText,
                  listMode === 'rally' && styles.modeBadgeTextActiveRally,
                ]}
              >
                {rallyCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 헤더 영역 (제목, 새로고침/추가 버튼, 부서 필터, 검색창) */}
      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>
              {listMode === 'all' ? '🙏 2026 전도 대상자 기도명단' : '📢 2026 대집회 집중 기도명단'}
            </Text>
            <Text style={styles.subtitle}>
              {listMode === 'all'
                ? `총 ${filteredPrayers.length}명의 전도 대상자 (인도자 ${groupedByLeader.length}명)`
                : `대집회 집중 기도 대상자 총 ${filteredPrayers.length}명`}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            {listMode === 'rally' && onAddPrayer && (
              <TouchableOpacity
                style={styles.addRallyButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.addRallyButtonText}>+ 대상자 추가</Text>
              </TouchableOpacity>
            )}

            {onRefresh && (
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.7}>
                <Text style={styles.refreshButtonText}>새로고침 ↺</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 부서별 선택 버튼 */}
        <View style={styles.deptSegmentTrack}>
          {DEPARTMENTS.map((dept) => {
            const isSelected = selectedDept === dept;
            const deptColor = dept === '전체' ? COLORS.primary : DEPARTMENT_COLORS[dept] || COLORS.primary;

            return (
              <TouchableOpacity
                key={dept}
                style={[
                  styles.deptSegmentButton,
                  isSelected && styles.deptSegmentButtonActive,
                ]}
                onPress={() => setSelectedDept(dept)}
                activeOpacity={0.8}
              >
                {dept !== '전체' && (
                  <View
                    style={[
                      styles.deptDot,
                      { backgroundColor: deptColor },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.deptSegmentText,
                    isSelected && { color: deptColor, fontWeight: '800' },
                  ]}
                >
                  {dept}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 검색창 */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={
              listMode === 'all'
                ? '인도자 또는 전도 대상자 검색...'
                : '대집회 대상자 또는 인도자 검색...'
            }
            placeholderTextColor={COLORS.textMuted}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            clearButtonMode="while-editing"
          />
          {searchKeyword.trim().length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. 본문 목록 */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>기도 명단을 불러오는 중입니다...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredPrayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                {listMode === 'rally' ? '📢' : '🔍'}
              </Text>
              <Text style={styles.emptyTitle}>
                {listMode === 'rally'
                  ? '등록된 대집회 기도 대상자가 없습니다.'
                  : '검색 결과가 없습니다.'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {listMode === 'rally'
                  ? "상단의 '+ 대상자 추가' 버튼으로 직접 등록하거나,\n'내 기도명단' 화면에서 [대집회 기도명단 추가하기] 버튼을 눌러 등록해보세요!"
                  : '다른 검색어를 입력하시거나 부서를 변경해보세요.'}
              </Text>
              {listMode === 'rally' && onAddPrayer && (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyAddBtnText}>+ 대집회 대상자 지금 등록하기</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.groupList}>
              {groupedByLeader.map((group) => {
                const deptColor = DEPARTMENT_COLORS[group.department] || COLORS.primary;
                const deptBg = DEPARTMENT_BG_COLORS[group.department] || '#F1F5F9';

                return (
                  <View key={group.key} style={styles.leaderCard}>
                    {/* 인도자 헤더 */}
                    <View style={styles.leaderCardHeader}>
                      <View style={styles.leaderInfoLeft}>
                        <View
                          style={[
                            styles.deptBadge,
                            { backgroundColor: deptBg, borderColor: deptColor },
                          ]}
                        >
                          <Text style={[styles.deptBadgeText, { color: deptColor }]}>
                            {group.department}
                          </Text>
                        </View>
                        <Text style={styles.leaderNameText}>
                          인도자: <Text style={styles.leaderNameBold}>{group.leader}</Text>
                        </Text>
                      </View>

                      <View style={styles.targetCountBadge}>
                        <Text style={styles.targetCountBadgeText}>
                          {listMode === 'rally' ? '대집회 대상 ' : '대상자 '}
                          {group.items.length}명
                        </Text>
                      </View>
                    </View>

                    {/* 해당 인도자의 전도 대상자 목록 */}
                    <View style={styles.targetsContainer}>
                      {group.items.map((item, idx) => {
                        const isMyTarget = Boolean(
                          currentUserName &&
                            currentUserName.trim() !== '' &&
                            item.leader.trim() === currentUserName.trim()
                        );

                        return (
                          <View key={`${item.id}-${idx}`} style={styles.targetRow}>
                            <View style={styles.targetMainInfo}>
                              <View
                                style={[
                                  styles.targetBulletDot,
                                  item.isRally && { backgroundColor: '#EA580C' },
                                ]}
                              />
                              <Text style={styles.targetNameText}>{item.target}</Text>

                              {/* 대집회 뱃지 */}
                              {item.isRally && (
                                <View style={styles.rallyBadge}>
                                  <Text style={styles.rallyBadgeText}>📢 대집회</Text>
                                </View>
                              )}

                              {/* 관계 뱃지 */}
                              {item.relationship && item.relationship !== '-' ? (
                                <View style={styles.relationshipBadge}>
                                  <Text style={styles.relationshipBadgeText}>
                                    {item.relationship}
                                  </Text>
                                </View>
                              ) : null}

                              {/* 나이 뱃지 */}
                              {item.age && item.age !== '-' ? (
                                <View style={styles.ageBadge}>
                                  <Text style={styles.ageBadgeText}>
                                    {item.age.includes('대') || item.age.includes('살')
                                      ? item.age
                                      : `${item.age}세`}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* 대집회 명단 토글 / 제외 액션 버튼 (내 전도 대상자만 노출) */}
                            {onToggleRally && isMyTarget ? (
                              <TouchableOpacity
                                style={[
                                  styles.rallyActionButton,
                                  item.isRally
                                    ? styles.rallyActionButtonActive
                                    : styles.rallyActionButtonInactive,
                                ]}
                                onPress={() => handleToggle(item)}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.rallyActionText,
                                    item.isRally
                                      ? styles.rallyActionTextActive
                                      : styles.rallyActionTextInactive,
                                  ]}
                                >
                                  {item.isRally ? '대집회 제외 ✕' : '+ 대집회 추가'}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* 4. 새 대집회 대상자 추가 다이얼로그 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📢 대집회 기도 대상자 추가</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalNotice}>
              2026 대집회에 초청하여 집중 기도로 품을 대상자를 새로 등록합니다.
            </Text>

            {/* 부서 선택 */}
            <Text style={styles.inputLabel}>소속 부서 *</Text>
            <View style={styles.deptSelectRow}>
              {SELECTABLE_DEPTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.deptSelectBtn,
                    newDept === dept && styles.deptSelectBtnActive,
                  ]}
                  onPress={() => setNewDept(dept)}
                >
                  <Text
                    style={[
                      styles.deptSelectBtnText,
                      newDept === dept && styles.deptSelectBtnTextActive,
                    ]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 인도자 (성도명) */}
            <Text style={styles.inputLabel}>인도자 성도명 *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 홍길동"
              value={newLeader}
              onChangeText={setNewLeader}
            />

            {/* 전도 대상자 이름 */}
            <Text style={styles.inputLabel}>전도 대상자 이름 *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 김철수"
              value={newTarget}
              onChangeText={setNewTarget}
            />

            {/* 관계 & 나이 */}
            <View style={styles.inlineInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>관계 (선택)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 가족, 친구, 직장동료"
                  value={newRelationship}
                  onChangeText={setNewRelationship}
                />
              </View>
              <View style={{ width: 100 }}>
                <Text style={styles.inputLabel}>나이/연령 (선택)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 30대"
                  value={newAge}
                  onChangeText={setNewAge}
                />
              </View>
            </View>

            {/* 등록 및 취소 버튼 */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleCreateRallyTarget}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? '등록 중...' : '대집회 명단에 등록'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 플로팅 토스트 배너 */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // 상단 전체명단 vs 대집회 모드 탭 스위처
  modeSwitcherContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modeSwitcherTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  modeTabActiveRally: {
    backgroundColor: '#EA580C',
    ...SHADOWS.sm,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeTabTextActive: {
    color: COLORS.primary,
  },
  modeTabTextActiveRally: {
    color: '#FFFFFF',
  },
  modeBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modeBadgeActive: {
    backgroundColor: '#EFF6FF',
  },
  modeBadgeActiveRally: {
    backgroundColor: '#C2410C',
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  modeBadgeTextActive: {
    color: COLORS.primary,
  },
  modeBadgeTextActiveRally: {
    color: '#FFFFFF',
  },

  // 헤더 영역
  headerArea: {
    backgroundColor: COLORS.card,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addRallyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#EA580C',
  },
  addRallyButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  refreshButton: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refreshButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // 부서 선택 세그먼트 (shadcn Tabs 스타일)
  deptSegmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 10,
    gap: 3,
  },
  deptSegmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 7,
    gap: 5,
  },
  deptSegmentButtonActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  deptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deptSegmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // 검색창
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 2,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // 스크롤 리스트
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  groupList: {
    gap: 12,
  },

  // 인도자 카드
  leaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    ...SHADOWS.sm,
    gap: 10,
  },
  leaderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leaderInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  deptBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  leaderNameText: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
  },
  leaderNameBold: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  targetCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  targetsContainer: {
    gap: 8,
    paddingLeft: 4,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  targetMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  targetBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  targetNameText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rallyBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  rallyBadgeText: {
    fontSize: 10.5,
    color: '#C2410C',
    fontWeight: '800',
  },
  relationshipBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  relationshipBadgeText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  ageBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ageBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // 토글 액션 버튼
  rallyActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  rallyActionButtonActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  rallyActionButtonInactive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  rallyActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rallyActionTextActive: {
    color: '#DC2626',
  },
  rallyActionTextInactive: {
    color: '#C2410C',
  },

  // 빈 상태
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAddBtn: {
    marginTop: 8,
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.textMuted,
    padding: 4,
  },
  modalNotice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    backgroundColor: '#FFF7ED',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  deptSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deptSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  deptSelectBtnActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  deptSelectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deptSelectBtnTextActive: {
    color: '#C2410C',
    fontWeight: '800',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: COLORS.textPrimary,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#EA580C',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 플로팅 토스트 스타일
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    zIndex: 99999,
    elevation: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
