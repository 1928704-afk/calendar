import React, { useEffect, useState } from 'react';
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
  CATEGORY_PRESETS,
  COLORS,
  DEPARTMENT_BG_COLORS,
  DEPARTMENT_COLORS,
  SHADOWS,
} from '../constants/theme';
import { api } from '../services/api';
import { Comment, Department, PrayerTargetCreateRequest, PrayerTargetItem, Schedule, ScheduleCategory } from '../types';
import { getTodayKSTString } from '../utils/dateUtils';
import {
  CalendarIcon,
  MessageSquareIcon,
  Trash2Icon,
  XIcon,
  UserIcon,
  SparklesIcon,
  ClockIcon,
  BuildingOfficeIcon,
} from './icons';

interface ScheduleFormModalProps {
  visible: boolean;
  editingSchedule: Schedule | null;
  defaultDate?: string;
  currentUserName: string;
  departments: Department[];
  currentDepartmentId: number;
  userDepartmentName?: string;
  myPrayerTargets?: PrayerTargetItem[];
  onAddNewPrayerTarget?: (data: PrayerTargetCreateRequest) => Promise<PrayerTargetItem | void>;
  onClose: () => void;
  onSubmit: (formData: {
    departmentId?: number;
    category: ScheduleCategory;
    title: string;
    authorName: string;
    targetName: string;
    scheduleDate: string;
    startTime?: string;
    endTime?: string;
    color: string;
    memo?: string;
    modifierName: string;
  }) => Promise<void>;
  onDelete?: (scheduleId: number, modifierName: string) => Promise<void>;
}

export const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  visible,
  editingSchedule,
  defaultDate,
  currentUserName,
  departments,
  currentDepartmentId,
  userDepartmentName,
  myPrayerTargets = [],
  onAddNewPrayerTarget,
  onClose,
  onSubmit,
  onDelete,
}) => {
  const isEditing = !!editingSchedule;

  // 본인이 작성한 글인지 검증
  const isMySchedule =
    !isEditing ||
    (editingSchedule &&
      (editingSchedule.authorName === currentUserName ||
        editingSchedule.createdBy === currentUserName));

  // 다른 사람의 글일 경우 인풋창이 아닌 전용 상세보기 모드로 렌더링
  const isDetailView = isEditing && !isMySchedule;

  const [selectedDeptId, setSelectedDeptId] = useState<number>(
    currentDepartmentId > 0 ? currentDepartmentId : (departments[0]?.id || 1)
  );
  const [category, setCategory] = useState<ScheduleCategory>('CAFE');
  const [title, setTitle] = useState('카페약속');
  const [color, setColor] = useState('#D97706');
  const [authorName, setAuthorName] = useState(currentUserName);
  const [targetName, setTargetName] = useState('');
  const [scheduleDate, setScheduleDate] = useState(
    defaultDate || getTodayKSTString()
  );
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 약속 대상자 드롭다운 및 신규 대상 등록 상태
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [newTargetName, setNewTargetName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newAge, setNewAge] = useState('');
  const [addingTarget, setAddingTarget] = useState(false);

  // 댓글 관련 상태
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // 댓글 목록 불러오기
  const loadComments = async (scheduleId: number) => {
    try {
      setLoadingComments(true);
      const data = await api.getComments(scheduleId);
      setComments(data || []);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  // 신규 전도대상자 등록 후 약속대상자로 자동 선택
  const handleAddNewTarget = async () => {
    if (!newTargetName.trim()) {
      Alert.alert('입력 확인', '전도 대상자 이름을 입력해주세요.');
      return;
    }

    try {
      setAddingTarget(true);
      const userDept =
        userDepartmentName ||
        departments.find((d) => d.id === selectedDeptId)?.name ||
        '언약부';

      if (onAddNewPrayerTarget) {
        await onAddNewPrayerTarget({
          department: userDept,
          leader: currentUserName,
          target: newTargetName.trim(),
          relationship: newRelationship.trim() || undefined,
          age: newAge.trim() || undefined,
          isRally: true, // 캘린더에서 추가된 대상자는 자동으로 대집회 기도명단에 추가
        });
      }

      // 약속대상자로 자동 선택
      setTargetName(newTargetName.trim());
      setShowAddTargetModal(false);
      setShowTargetDropdown(false);
      setNewTargetName('');
      setNewRelationship('');
      setNewAge('');
      Alert.alert(
        '등록 완료',
        `'${newTargetName.trim()}' 님이 대집회 기도명단에 등록되고 약속대상자로 자동 선택되었습니다! 🎉`
      );
    } catch (err) {
      Alert.alert('오류', '대상자 등록 중 문제가 발생했습니다.');
    } finally {
      setAddingTarget(false);
    }
  };

  // 모달 데이터 및 댓글 초기화
  useEffect(() => {
    setShowTargetDropdown(false);
    setShowAddTargetModal(false);
    if (editingSchedule) {
      setSelectedDeptId(editingSchedule.departmentId);
      setCategory(editingSchedule.category || 'CUSTOM');
      setTitle(editingSchedule.title);
      setColor(editingSchedule.color);
      setAuthorName(editingSchedule.authorName);
      setTargetName(editingSchedule.targetName);
      setScheduleDate(editingSchedule.scheduleDate);
      setMemo(editingSchedule.memo || '');
      loadComments(editingSchedule.id);
    } else {
      setSelectedDeptId(
        currentDepartmentId > 0 ? currentDepartmentId : (departments[0]?.id || 1)
      );
      setCategory('CAFE');
      setTitle('카페약속');
      setColor('#D97706');
      setAuthorName(currentUserName);
      setTargetName('');
      setScheduleDate(defaultDate || getTodayKSTString());
      setMemo('');
      setComments([]);
    }
    setNewCommentText('');
    setErrorMsg('');
  }, [editingSchedule, defaultDate, currentUserName, currentDepartmentId, visible]);

  // 빠른 자동 채우기 버튼 클릭 시 (제목, 카테고리, 색상 자동 매핑)
  const handleSelectPreset = (preset: typeof CATEGORY_PRESETS[0]) => {
    if (!isMySchedule) return;
    setCategory(preset.category);
    setTitle(preset.title);
    setColor(preset.color);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('일정 제목을 입력해주세요.');
      return;
    }
    if (!targetName.trim()) {
      setErrorMsg('약속 대상자명을 입력해주세요.');
      return;
    }
    if (!scheduleDate.trim()) {
      setErrorMsg('일정 날짜를 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await onSubmit({
        departmentId: selectedDeptId,
        category,
        title: title.trim(),
        authorName: authorName.trim() || currentUserName,
        targetName: targetName.trim(),
        scheduleDate,
        color,
        memo: memo.trim() || undefined,
        modifierName: currentUserName,
      });
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingSchedule || !onDelete || !isMySchedule) return;
    try {
      setSubmitting(true);
      await onDelete(editingSchedule.id, currentUserName);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || '삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 등록 처리
  const handleCreateComment = async () => {
    if (!editingSchedule || !newCommentText.trim()) return;
    const author = currentUserName.trim() || '익명';

    try {
      setSubmittingComment(true);
      await api.createComment(editingSchedule.id, {
        authorName: author,
        content: newCommentText.trim(),
      });
      setNewCommentText('');
      await loadComments(editingSchedule.id);
    } catch (e: any) {
      Alert.alert('댓글 등록 실패', e.message || '댓글 등록에 실패했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 댓글 삭제 처리
  const handleDeleteComment = async (commentId: number) => {
    if (!editingSchedule) return;
    try {
      await api.deleteComment(editingSchedule.id, commentId, currentUserName);
      await loadComments(editingSchedule.id);
    } catch (e: any) {
      Alert.alert('댓글 삭제 실패', e.message || '댓글 삭제에 실패했습니다.');
    }
  };

  // 공통 댓글 섹션 (shadcn Comments Feed 스타일)
  const renderCommentsSection = () => {
    if (!isEditing || !editingSchedule) return null;

    return (
      <View style={styles.commentsSection}>
        <View style={styles.commentsHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MessageSquareIcon size={15} color={COLORS.primary} />
            <Text style={styles.commentsTitle}>댓글 ({comments.length})</Text>
          </View>
        </View>

        {/* 댓글 목록 */}
        {loadingComments ? (
          <View style={styles.commentsLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.commentsEmpty}>
            <Text style={styles.commentsEmptyText}>
              등록된 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
            </Text>
          </View>
        ) : (
          <View style={styles.commentsList}>
            {comments.map((comment) => {
              const isMyComment = comment.authorName === currentUserName;
              return (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentItemHeader}>
                    <View style={styles.commentAuthorRow}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {comment.authorName ? comment.authorName.charAt(0) : '?'}
                        </Text>
                      </View>
                      <Text style={styles.commentAuthorText}>{comment.authorName}</Text>
                      {isMyComment && (
                        <View style={styles.myCommentBadge}>
                          <Text style={styles.myCommentBadgeText}>내 댓글</Text>
                        </View>
                      )}
                      <Text style={styles.commentDateText}>
                        {comment.createdAt ? comment.createdAt.substring(5, 16) : ''}
                      </Text>
                    </View>
                    {isMyComment && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.id)}
                        style={styles.deleteCommentBtn}
                        activeOpacity={0.7}
                      >
                        <Trash2Icon size={12} color={COLORS.danger} />
                        <Text style={styles.deleteCommentBtnText}>삭제</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentContentText}>{comment.content}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 댓글 작성 폼 */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentTextInput}
            value={newCommentText}
            onChangeText={setNewCommentText}
            placeholder={
              currentUserName
                ? `${currentUserName}(으)로 댓글 작성...`
                : '댓글을 입력하세요...'
            }
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.commentSubmitButton,
              (!newCommentText.trim() || submittingComment) &&
                styles.commentSubmitButtonDisabled,
            ]}
            onPress={handleCreateComment}
            disabled={!newCommentText.trim() || submittingComment}
            activeOpacity={0.8}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.commentSubmitButtonText}>등록</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandleBar} />

          {/* 헤더 */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isDetailView ? (
                <CalendarIcon size={18} color={COLORS.primary} />
              ) : (
                <SparklesIcon size={18} color={COLORS.primary} />
              )}
              <Text style={styles.sheetTitle}>
                {isDetailView
                  ? '일정 상세'
                  : isEditing
                  ? '내 일정 수정'
                  : '새 일정 작성'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <XIcon size={18} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* 1. 타인 글인 경우: 카드형 상세보기 모드 (Detail View) */}
            {isDetailView ? (
              <View style={styles.detailContainer}>
                {/* 상단 히어로 카드 */}
                <View
                  style={[
                    styles.detailHeroCard,
                    { borderLeftColor: editingSchedule?.color || COLORS.primary },
                  ]}
                >
                  <View style={styles.detailBadgeRow}>
                    <View
                      style={[
                        styles.detailDeptBadge,
                        {
                          backgroundColor:
                            DEPARTMENT_BG_COLORS[editingSchedule?.departmentName || ''] ||
                            '#F1F5F9',
                          borderColor:
                            DEPARTMENT_COLORS[editingSchedule?.departmentName || ''] ||
                            COLORS.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailDeptBadgeText,
                          {
                            color:
                              DEPARTMENT_COLORS[editingSchedule?.departmentName || ''] ||
                              COLORS.primary,
                          },
                        ]}
                      >
                        {editingSchedule?.departmentName}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.detailCategoryBadge,
                        { backgroundColor: editingSchedule?.color || COLORS.primary },
                      ]}
                    >
                      <Text style={styles.detailCategoryBadgeText}>
                        {editingSchedule?.category === 'RALLY'
                          ? '집회확정'
                          : editingSchedule?.category === 'MEAL'
                          ? '식사약속'
                          : editingSchedule?.category === 'CAFE'
                          ? '카페약속'
                          : '일반일정'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailTitleText}>{editingSchedule?.title}</Text>
                </View>

                {/* 상세 항목 리스트 */}
                <View style={styles.detailCard}>
                  {/* 일시 */}
                  <View style={styles.detailRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CalendarIcon size={13} color={COLORS.mutedForeground} />
                      <Text style={styles.detailLabel}>일시</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {editingSchedule?.endDate &&
                      editingSchedule.endDate > editingSchedule.scheduleDate
                        ? `${editingSchedule.scheduleDate} ~ ${editingSchedule.endDate} (기간 일정)`
                        : `${editingSchedule?.scheduleDate} ${
                            editingSchedule?.startTime
                              ? `${editingSchedule.startTime}${
                                  editingSchedule?.endTime ? ` ~ ${editingSchedule.endTime}` : ''
                                }`
                              : '(종일)'
                          }`}
                    </Text>
                  </View>

                  {/* 작성자 & 약속 대상 */}
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <UserIcon size={13} color={COLORS.mutedForeground} />
                      <Text style={styles.detailLabel}>작성자</Text>
                    </View>
                    <Text style={[styles.detailValue, { fontWeight: '700', color: COLORS.textPrimary }]}>
                      {editingSchedule?.authorName}
                    </Text>
                  </View>

                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <SparklesIcon size={13} color={COLORS.mutedForeground} />
                      <Text style={styles.detailLabel}>약속 대상</Text>
                    </View>
                    <Text style={[styles.detailValue, { fontWeight: '700', color: COLORS.accentBlue }]}>
                      {editingSchedule?.targetName}
                    </Text>
                  </View>

                  {/* 메모 */}
                  <View style={styles.detailDivider} />
                  <View style={styles.detailMemoSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <MessageSquareIcon size={13} color={COLORS.mutedForeground} />
                      <Text style={styles.detailLabel}>메모 내용</Text>
                    </View>
                    <View style={styles.detailMemoBubble}>
                      <Text style={styles.detailMemoText}>
                        {editingSchedule?.memo ? editingSchedule.memo : '등록된 메모가 없습니다.'}
                      </Text>
                    </View>
                  </View>

                  {/* 최종 수정 정보 안내 */}
                  {editingSchedule?.updatedBy && (
                    <View style={styles.detailMetaInfo}>
                      <Text style={styles.detailMetaText}>
                        최근 수정: {editingSchedule.updatedBy} ({editingSchedule.updatedAt?.substring(0, 16)})
                      </Text>
                    </View>
                  )}
                </View>

                {/* 댓글 섹션 */}
                {renderCommentsSection()}

                {/* 하단 닫기 버튼 (shadcn Button default) */}
                <TouchableOpacity style={styles.detailCloseButton} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.detailCloseButtonText}>확인 (닫기)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* 2. 본인 글 또는 새 글 작성인 경우: 인풋 수정/등록 폼 모드 */
              <>
                {/* 1. 자동 채우기 빠른 버튼 3종 (shadcn Toggle Pill) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <SparklesIcon size={14} color={COLORS.primary} />
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>빠른 일정 프리셋</Text>
                </View>
                <View style={styles.presetButtonsRow}>
                  {CATEGORY_PRESETS.map((preset) => {
                    const isSelected = title === preset.title;
                    return (
                      <TouchableOpacity
                        key={preset.category}
                        style={[
                          styles.presetButton,
                          {
                            backgroundColor: isSelected ? preset.color : preset.bgColor,
                            borderColor: preset.color,
                          },
                        ]}
                        onPress={() => handleSelectPreset(preset)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.presetButtonText,
                            { color: isSelected ? '#FFFFFF' : preset.color },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 2. 제목 입력 (shadcn Input) */}
                <Text style={styles.inputLabel}>일정 제목 *</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="예: 점심약속, 카페교제"
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* 3. 유저명(작성자) & 약속 대상자 */}
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>작성자 (내 이름)</Text>
                    <TextInput
                      style={[styles.textInput, styles.readOnlyInput]}
                      value={authorName}
                      editable={false}
                    />
                  </View>
                  <View style={{ flex: 1.2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.inputLabel}>약속 대상자 *</Text>
                      <TouchableOpacity
                        onPress={() => setShowTargetDropdown(!showTargetDropdown)}
                        style={styles.dropdownBadgeBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dropdownBadgeBtnText}>
                          {showTargetDropdown ? '닫기 ▲' : '내 기도명단 ▼'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 입력창 + 드롭다운 버튼 */}
                    <View style={styles.targetInputContainer}>
                      <TextInput
                        style={[styles.textInput, { flex: 1, marginBottom: 0, paddingRight: 30 }]}
                        value={targetName}
                        onChangeText={setTargetName}
                        placeholder="이름 입력 또는 선택"
                        placeholderTextColor={COLORS.textMuted}
                        onFocus={() => setShowTargetDropdown(true)}
                      />
                      <TouchableOpacity
                        style={styles.targetDropdownTriggerBtn}
                        onPress={() => setShowTargetDropdown(!showTargetDropdown)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dropdownArrowIcon}>
                          {showTargetDropdown ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 내 기도명단 드롭다운 메뉴 (펼쳐졌을 때) */}
                {showTargetDropdown && (
                  <View style={styles.dropdownContainer}>
                    <View style={styles.dropdownHeader}>
                      <Text style={styles.dropdownHeaderText}>
                        🙏 내 기도명단 ({myPrayerTargets.length}명)
                      </Text>
                      <TouchableOpacity onPress={() => setShowTargetDropdown(false)}>
                        <Text style={styles.dropdownCloseText}>✕ 닫기</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      style={styles.dropdownScroll}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {myPrayerTargets.length === 0 ? (
                        <View style={styles.dropdownEmpty}>
                          <Text style={styles.dropdownEmptyText}>
                            내 기도명단에 등록된 대상이 없습니다.
                          </Text>
                        </View>
                      ) : (
                        myPrayerTargets.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.dropdownItem,
                              targetName === item.target && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setTargetName(item.target);
                              setShowTargetDropdown(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.dropdownItemLeft}>
                              <View style={styles.dropdownItemDot} />
                              <Text style={styles.dropdownItemName}>{item.target}</Text>
                              {item.relationship && item.relationship !== '-' ? (
                                <View style={styles.dropdownRelBadge}>
                                  <Text style={styles.dropdownRelBadgeText}>
                                    {item.relationship}
                                  </Text>
                                </View>
                              ) : null}
                              {item.age && item.age !== '-' ? (
                                <Text style={styles.dropdownAgeText}>
                                  {item.age.includes('대') || item.age.includes('살')
                                    ? item.age
                                    : `${item.age}세`}
                                </Text>
                              ) : null}
                            </View>
                            {targetName === item.target && (
                              <Text style={styles.dropdownCheckmark}>선택됨 ✓</Text>
                            )}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>

                    {/* 드롭다운 메뉴 가장 아래: 대상 추가하기 선택 버튼 */}
                    <TouchableOpacity
                      style={styles.dropdownAddButton}
                      onPress={() => {
                        setShowTargetDropdown(false);
                        setShowAddTargetModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dropdownAddButtonText}>
                        ➕ 대상 추가하기 (새 전도대상자 등록 후 자동선택)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 4. 날짜 입력 */}
                <Text style={styles.inputLabel}>일정 날짜 (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={scheduleDate}
                  onChangeText={setScheduleDate}
                  placeholder="2026-11-07"
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* 5. 메모 입력 */}
                <Text style={styles.inputLabel}>메모 (선택)</Text>
                <TextInput
                  style={[styles.textInput, styles.memoInput]}
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="약속 장소, 전달 사항 등을 적어주세요."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                {/* 댓글 섹션 (수정 모드일 때도 표시) */}
                {renderCommentsSection()}

                {/* 하단 액션 버튼 */}
                <View style={styles.actionButtons}>
                  {isEditing && onDelete ? (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={handleDelete}
                      disabled={submitting}
                      activeOpacity={0.8}
                    >
                      <Trash2Icon size={14} color={COLORS.danger} />
                      <Text style={styles.deleteButtonText}>일정 삭제</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.saveButton, submitting && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {isEditing ? '수정 완료' : '일정 등록'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* 2. 새 전도 대상자 등록 팝업 모달 */}
    <Modal
      visible={showAddTargetModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAddTargetModal(false)}
    >
      <View style={styles.addTargetOverlay}>
        <View style={styles.addTargetCard}>
          <View style={styles.addTargetHeader}>
            <Text style={styles.addTargetTitle}>➕ 새 전도 대상자 등록</Text>
            <TouchableOpacity onPress={() => setShowAddTargetModal(false)}>
              <Text style={styles.addTargetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.addTargetNotice}>
            내 기도명단에 새로 등록되며, 이번 일정의 약속대상자로 자동 선택됩니다.
          </Text>

          <Text style={styles.inputLabel}>대상자 이름 *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="예: 김철수"
            value={newTargetName}
            onChangeText={setNewTargetName}
            autoFocus
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>관계 (선택)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="예: 친구, 직장동료"
                value={newRelationship}
                onChangeText={setNewRelationship}
              />
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.inputLabel}>나이 (선택)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="예: 25세"
                value={newAge}
                onChangeText={setNewAge}
              />
            </View>
          </View>

          <View style={styles.addTargetBtnRow}>
            <TouchableOpacity
              style={styles.addTargetCancelBtn}
              onPress={() => setShowAddTargetModal(false)}
              disabled={addingTarget}
            >
              <Text style={styles.addTargetCancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addTargetSubmitBtn, addingTarget && { opacity: 0.7 }]}
              onPress={handleAddNewTarget}
              disabled={addingTarget}
            >
              <Text style={styles.addTargetSubmitBtnText}>
                {addingTarget ? '등록 중...' : '등록 & 약속대상자로 선택'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '92%',
    ...SHADOWS.lg,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  // 상세보기 모드 스타일
  detailContainer: {
    gap: 14,
    paddingTop: 4,
  },
  detailHeroCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailDeptBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  detailDeptBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  detailCategoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  detailCategoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  detailTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
    ...SHADOWS.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  detailMemoSection: {
    gap: 6,
  },
  detailMemoBubble: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailMemoText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  detailMetaInfo: {
    marginTop: 2,
    alignItems: 'flex-end',
  },
  detailMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  detailCloseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 6,
    ...SHADOWS.sm,
  },
  detailCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // 댓글 스타일
  commentsSection: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  commentsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  commentsLoading: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  commentsEmpty: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  commentsEmptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  commentsList: {
    gap: 8,
  },
  commentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  commentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  commentAuthorText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  myCommentBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  myCommentBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  commentDateText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
  deleteCommentBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  deleteCommentBtnText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
  commentContentText: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    alignItems: 'flex-end',
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16, // 모바일 브라우저 자동 확대 방지
    color: COLORS.textPrimary,
    maxHeight: 70,
  },
  commentSubmitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  commentSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // 폼 입력 모드 스타일
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16, // 모바일 브라우저 자동 확대 방지
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  readOnlyInput: {
    backgroundColor: '#F8FAFC',
    color: COLORS.textSecondary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  memoInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 11.5,
    marginTop: 8,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.dangerLight,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 13.5,
    fontWeight: '700',
  },
  saveButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // 약속 대상자 드롭다운 관련 스타일
  targetInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  targetDropdownTriggerBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownArrowIcon: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  dropdownBadgeBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 4,
  },
  dropdownBadgeBtnText: {
    fontSize: 10.5,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: -8,
    marginBottom: 14,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownHeaderText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dropdownCloseText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: '600',
    padding: 2,
  },
  dropdownScroll: {
    maxHeight: 160,
  },
  dropdownEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownItemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  dropdownItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dropdownRelBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dropdownRelBadgeText: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  dropdownAgeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  dropdownCheckmark: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.primary,
  },
  dropdownAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
  },
  dropdownAddButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },

  // 새 대상자 등록 팝업 모달 스타일
  addTargetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addTargetCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 10,
    ...SHADOWS.md,
  },
  addTargetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addTargetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  addTargetCloseText: {
    fontSize: 16,
    color: COLORS.textMuted,
    padding: 4,
  },
  addTargetNotice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: '#FFF7ED',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    lineHeight: 16,
  },
  addTargetBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  addTargetCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  addTargetCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  addTargetSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#EA580C',
  },
  addTargetSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
