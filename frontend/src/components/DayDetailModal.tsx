import React from 'react';
import {
  Modal,
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
import { Schedule } from '../types';
import { ArrowRightIcon, MessageSquareIcon, PlusIcon, XIcon } from './icons';

interface DayDetailModalProps {
  visible: boolean;
  dateString: string;
  schedules: Schedule[];
  isAllDept?: boolean;
  currentUserName?: string;
  onClose: () => void;
  onSelectSchedule: (schedule: Schedule) => void;
  onAddSchedule: (dateString: string) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  visible,
  dateString,
  schedules,
  isAllDept = false,
  currentUserName = '',
  onClose,
  onSelectSchedule,
  onAddSchedule,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* 바텀시트 상단 핸들 바 */}
          <View style={styles.sheetHandleBar} />

          {/* 헤더 (shadcn SheetHeader) */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{dateString} 일정</Text>
              <Text style={styles.subtitle}>
                총 {schedules.length}개의 일정이 등록되어 있습니다
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <XIcon size={18} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* 일정 목록 (shadcn Card List) */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {schedules.length > 0 ? (
              schedules.map((schedule) => {
                const isMySchedule =
                  schedule.authorName === currentUserName ||
                  schedule.createdBy === currentUserName;

                return (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[
                      styles.card,
                      { borderLeftColor: schedule.color || COLORS.accentBlue },
                    ]}
                    onPress={() => {
                      onClose();
                      onSelectSchedule(schedule);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.badgeGroup}>
                        {schedule.departmentName ? (
                          <View
                            style={[
                              styles.deptBadge,
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
                                styles.deptBadgeText,
                                {
                                  color:
                                    DEPARTMENT_COLORS[schedule.departmentName] || COLORS.primary,
                                },
                              ]}
                            >
                              {schedule.departmentName}
                            </Text>
                          </View>
                        ) : null}
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: schedule.color || COLORS.accentBlue },
                          ]}
                        >
                          <Text style={styles.categoryBadgeText}>{schedule.title}</Text>
                        </View>
                      </View>
                      <Text style={styles.timeText}>
                        {schedule.startTime
                          ? `${schedule.startTime} ~ ${schedule.endTime || ''}`
                          : '종일'}
                      </Text>
                    </View>

                    <View style={styles.personRow}>
                      <Text style={styles.personText}>
                        <Text style={styles.label}>작성: </Text>
                        {schedule.authorName}
                      </Text>
                      <ArrowRightIcon size={12} color={COLORS.mutedForeground} />
                      <Text style={styles.personText}>
                        <Text style={styles.label}>대상: </Text>
                        {schedule.targetName}
                      </Text>
                    </View>

                    {schedule.memo ? (
                      <View style={styles.memoBox}>
                        <MessageSquareIcon size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.memoText}>{schedule.memo}</Text>
                      </View>
                    ) : null}

                    <View style={styles.footerRow}>
                      <Text style={styles.updatedText}>
                        최근수정: {schedule.updatedBy} ({schedule.updatedAt.substring(11, 16)})
                      </Text>
                      <Text
                        style={[
                          styles.editHintText,
                          !isMySchedule && { color: COLORS.textSecondary },
                        ]}
                      >
                        {isMySchedule ? '내 글 수정' : '상세보기'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>등록된 일정이 없습니다.</Text>
              </View>
            )}
          </ScrollView>

          {/* 일정 추가 버튼 (shadcn Primary Button) */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              onClose();
              onAddSchedule(dateString);
            }}
            activeOpacity={0.85}
          >
            <PlusIcon size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>이 날짜에 새 일정 등록</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    maxHeight: '82%',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  list: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
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
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personText: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  arrow: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  memoBox: {
    backgroundColor: '#F8FAFC',
    padding: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  memoText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  updatedText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
  editHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentBlue,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
