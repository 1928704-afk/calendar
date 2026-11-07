import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { PrayerTargetItem, UserSession } from '../types';
import { MegaphoneIcon, Trash2Icon } from './icons';

interface MyPrayerListViewProps {
  userSession: UserSession | null;
  prayers: PrayerTargetItem[];
  loading?: boolean;
  onOpenLogin: () => void;
  onAddPrayer?: (data: { department: string; leader: string; target: string; relationship?: string; age?: string; isRally?: boolean }) => Promise<void>;
  onDeletePrayer?: (id: number) => Promise<void>;
  onToggleRally?: (id: number, isRally?: boolean) => Promise<void>;
}

export const MyPrayerListView: React.FC<MyPrayerListViewProps> = ({
  userSession,
  prayers,
  loading = false,
  onOpenLogin,
  onAddPrayer,
  onDeletePrayer,
  onToggleRally,
}) => {
  // 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 삭제 확인 모달 및 토스트 알림 상태
  const [deleteTarget, setDeleteTarget] = useState<PrayerTargetItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2200);
  };

  // 삭제 확정 처리 (낙관적 즉시 삭제)
  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeletePrayer) return;
    const targetItem = deleteTarget;
    setDeleteTarget(null);
    showToast(`🗑️ '${targetItem.target}' 님이 기도명단에서 삭제되었습니다.`);
    await onDeletePrayer(targetItem.id);
  };

  // 대집회 등록/해제 토글 (즉각 반응)
  const handleRallyToggle = (item: PrayerTargetItem) => {
    if (!onToggleRally) return;
    const nextState = !item.isRally;
    onToggleRally(item.id, nextState);
    if (nextState) {
      showToast(`📢 '${item.target}' 님이 대집회 기도명단에 추가되었습니다!`);
    } else {
      showToast(`'${item.target}' 님이 대집회 기도명단에서 제외되었습니다.`);
    }
  };

  // 기도 체크(응원) 상태
  const [prayedSet, setPrayedSet] = useState<Set<number>>(new Set());

  const togglePrayed = (id: number) => {
    setPrayedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 비로그인 상태일 때
  if (!userSession) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loginGuideCard}>
          <Text style={styles.loginGuideIcon}>🔒</Text>
          <Text style={styles.loginGuideTitle}>로그인이 필요한 서비스입니다</Text>
          <Text style={styles.loginGuideSubtitle}>
            소속 부서와 이름을 입력하고 로그인하시면{'\n'}나의 전도 대상자 기도 명단을 확인하실 수 있습니다.
          </Text>
          <TouchableOpacity
            style={styles.primaryLoginBtn}
            onPress={onOpenLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryLoginBtnText}>로그인하러 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 로그인 상태 -> 현재 유저명과 일치하는 명단 필터링
  const myPrayers = prayers.filter(
    (p) => p.leader.trim() === userSession.userName.trim()
  );

  const deptColor = DEPARTMENT_COLORS[userSession.departmentName] || COLORS.primary;
  const deptBg = DEPARTMENT_BG_COLORS[userSession.departmentName] || '#F1F5F9';

  // 새 기도 대상 추가
  const handleSaveNewPrayer = async () => {
    if (!targetName.trim()) {
      Alert.alert('알림', '전도 대상자 이름을 입력해주세요.');
      return;
    }

    if (!onAddPrayer) return;

    try {
      setSubmitting(true);
      await onAddPrayer({
        department: userSession.departmentName,
        leader: userSession.userName,
        target: targetName.trim(),
        relationship: relationship.trim() || undefined,
        age: age.trim() || undefined,
      });
      setTargetName('');
      setRelationship('');
      setAge('');
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('오류', e.message || '기도 대상 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. 상단 프로필 히어로 배너 (21st.dev Banner Card 스타일) */}
      <View style={styles.heroBanner}>
        <View style={styles.heroLeft}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{userSession.userName.charAt(0)}</Text>
          </View>
          <View>
            <View style={styles.heroBadgeRow}>
              <View style={[styles.deptBadge, { backgroundColor: deptBg, borderColor: deptColor }]}>
                <Text style={[styles.deptBadgeText, { color: deptColor }]}>
                  {userSession.departmentName}
                </Text>
              </View>
              <Text style={styles.heroUserName}>{userSession.userName} 님의 기도 명단</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              품고 기도하는 영혼: <Text style={{ fontWeight: '800', color: COLORS.primary }}>{myPrayers.length}명</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addMiniFab}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addMiniFabText}>+ 대상자 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 본문 리스트 */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>내 기도 명단을 불러오는 중입니다...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {myPrayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🕊️</Text>
              <Text style={styles.emptyTitle}>
                {userSession.userName} 님으로 등록된 기도 대상자가 없습니다.
              </Text>
              <Text style={styles.emptySubtitle}>
                전도하고자 하는 소중한 영혼의 이름을{'\n'}새로 등록하고 함께 기도해보세요.
              </Text>
              <TouchableOpacity
                style={styles.primaryAddBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryAddBtnText}>+ 첫 전도 대상자 등록하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {myPrayers.map((item, idx) => {
                const isPrayed = prayedSet.has(item.id);

                return (
                  <View key={item.id} style={styles.prayerCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.targetMainInfo}>
                        <View style={styles.numberBadge}>
                          <Text style={styles.numberBadgeText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.targetNameText}>{item.target}</Text>

                        {/* 관계 뱃지 */}
                        {item.relationship && item.relationship !== '-' ? (
                          <View style={styles.relBadge}>
                            <Text style={styles.relBadgeText}>{item.relationship}</Text>
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

                      {/* 삭제 버튼 (웹 호환 커스텀 모달 호출) */}
                      {onDeletePrayer && (
                        <TouchableOpacity
                          style={styles.deleteMiniBtn}
                          onPress={() => setDeleteTarget(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.deleteMiniBtnText}>삭제</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 대집회 기도명단 추가 버튼 (즉시 반응 및 토스트 안내) */}
                    <View style={styles.interactionRow}>
                      <TouchableOpacity
                        style={[
                          styles.rallyAddButton,
                          item.isRally && styles.rallyAddButtonActive,
                        ]}
                        onPress={() => handleRallyToggle(item)}
                        activeOpacity={0.8}
                      >
                        <MegaphoneIcon size={14} color={item.isRally ? '#FFFFFF' : '#DC2626'} />
                        <Text
                          style={[
                            styles.rallyAddButtonText,
                            item.isRally && styles.rallyAddButtonTextActive,
                          ]}
                        >
                          {item.isRally ? '대집회 기도명단 등록완료 ✓' : '대집회 기도명단 추가하기 ＋'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* 3. 새 전도 대상자 등록 모달 (shadcn Dialog 스타일) */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💖 새 전도 대상자 등록</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>인도자 (본인 이름)</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={`${userSession.userName} (${userSession.departmentName})`}
                editable={false}
              />

              <Text style={styles.fieldLabel}>전도 대상자 이름 *</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 김철수, 박지은"
                placeholderTextColor={COLORS.textMuted}
                value={targetName}
                onChangeText={setTargetName}
              />

              <Text style={styles.fieldLabel}>관계 (선택)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 친구, 직장동료, 가족"
                placeholderTextColor={COLORS.textMuted}
                value={relationship}
                onChangeText={setRelationship}
              />

              <Text style={styles.fieldLabel}>나이 (선택)</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 25, 30대"
                placeholderTextColor={COLORS.textMuted}
                value={age}
                onChangeText={setAge}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSaveNewPrayer}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>기도 대상자 등록하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. 삭제 확인 모달 (웹 및 모바일 100% 호환) */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmModalIconBox}>
              <Trash2Icon size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.confirmModalTitle}>기도 대상자 삭제</Text>
            <Text style={styles.confirmModalMessage}>
              <Text style={{ fontWeight: '800', color: COLORS.textPrimary }}>
                '{deleteTarget?.target}'
              </Text>{' '}
              님을 내 기도명단에서 삭제하시겠습니까?
            </Text>
            <View style={styles.confirmModalBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteTarget(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleConfirmDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmDeleteBtnText}>삭제하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. 즉각 반응 플로팅 토스트 배너 */}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loginGuideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
    maxWidth: 380,
    width: '100%',
    gap: 12,
  },
  loginGuideIcon: {
    fontSize: 44,
    marginBottom: 4,
  },
  loginGuideTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  loginGuideSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  primaryLoginBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  primaryLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  // 상단 히어로 배너
  heroBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  deptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroUserName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addMiniFab: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  addMiniFabText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // 리스트
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
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
  cardsList: {
    gap: 12,
  },
  prayerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    ...SHADOWS.sm,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  targetNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  relBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  relBadgeText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  ageBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ageBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  deleteMiniBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  deleteMiniBtnText: {
    fontSize: 11.5,
    color: COLORS.danger,
    fontWeight: '600',
  },
  interactionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  rallyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 6,
  },
  rallyAddButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  rallyAddButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  rallyAddButtonTextActive: {
    color: '#FFFFFF',
  },
  prayButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  prayButtonTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 44,
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
    lineHeight: 18,
  },
  primaryAddBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  primaryAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  formGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16, // 모바일 브라우저 자동 확대 방지
    color: COLORS.textPrimary,
  },
  readOnlyInput: {
    backgroundColor: '#F8FAFC',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
    ...SHADOWS.sm,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // 삭제 확인 모달 스타일
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.lg,
    gap: 12,
  },
  confirmModalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  confirmModalMessage: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  confirmModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 6,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 즉시 반응 플로팅 토스트 스타일
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
