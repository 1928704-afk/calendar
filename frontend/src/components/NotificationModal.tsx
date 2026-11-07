import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { NotificationItem } from '../types';
import { BellIcon, CalendarIcon, MessageSquareIcon, XIcon } from './icons';

interface NotificationModalProps {
  visible: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  onClose: () => void;
  onSelectNotification: (item: NotificationItem) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  notifications,
  unreadCount,
  onClose,
  onSelectNotification,
  onMarkAllAsRead,
}) => {
  // 상대적 시간 포맷터
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffMin < 1) return '방금 전';
      if (diffMin < 60) return `${diffMin}분 전`;
      if (diffHour < 24) return `${diffHour}시간 전`;
      if (diffDay < 7) return `${diffDay}일 전`;
      return dateStr.split('T')[0];
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.bellBadge}>
                <BellIcon size={18} color={COLORS.primary} strokeWidth={2.4} />
              </View>
              <Text style={styles.title}>내 일정 알림</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={onMarkAllAsRead} style={styles.markAllBtn}>
                  <Text style={styles.markAllBtnText}>모두 읽음</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <XIcon size={18} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 알림 목록 */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <BellIcon size={28} color={COLORS.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>새로운 알림이 없습니다</Text>
                <Text style={styles.emptySubtitle}>
                  내가 작성한 일정에 다른 회원이 댓글을 남기면 이곳에서 바로 알려드립니다.
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const isItemRead = Boolean(item.isRead || (item as any).read);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemCard, !isItemRead && styles.itemCardUnread]}
                    onPress={() => onSelectNotification(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.itemSenderBadge}>
                        <Text style={styles.itemSenderText}>{item.senderName}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemTimeText}>{formatTimeAgo(item.createdAt)}</Text>
                        {!isItemRead && <View style={styles.unreadDot} />}
                      </View>
                    </View>

                  <View style={styles.itemScheduleRow}>
                    <CalendarIcon size={13} color={COLORS.primary} />
                    <Text style={styles.itemScheduleTitle} numberOfLines={1}>
                      {item.scheduleTitle}
                    </Text>
                  </View>

                  <View style={styles.commentBubble}>
                    <MessageSquareIcon size={13} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
                    <Text style={styles.commentText} numberOfLines={2}>
                      {item.commentContent}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
            )}
          </ScrollView>

          {/* 하단 닫기 바 */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.confirmButton} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.confirmButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    display: 'flex',
    flexDirection: 'column',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unreadCountBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
  },
  scrollArea: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  itemCardUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#93C5FD',
    borderWidth: 1.5,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSenderBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemSenderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  itemTimeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  itemScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemScheduleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  commentBubble: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    marginTop: 2,
  },
  commentText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
