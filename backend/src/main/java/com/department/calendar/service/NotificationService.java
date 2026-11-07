package com.department.calendar.service;

import com.department.calendar.domain.Notification;
import com.department.calendar.domain.Schedule;
import com.department.calendar.dto.NotificationResponse;
import com.department.calendar.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * 특정 사용자에게 온 알림 목록 조회
     */
    public List<NotificationResponse> getNotifications(String userName) {
        if (userName == null || userName.trim().isEmpty()) {
            return List.of();
        }
        return notificationRepository.findByRecipientNameOrderByCreatedAtDesc(userName.trim()).stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 읽지 않은 알림 개수 조회
     */
    public long getUnreadCount(String userName) {
        if (userName == null || userName.trim().isEmpty()) {
            return 0;
        }
        return notificationRepository.countByRecipientNameAndIsReadFalse(userName.trim());
    }

    /**
     * 댓글 알림 생성 (작성자가 본인 글에 단 댓글은 알림 제외)
     */
    @Transactional
    public void createCommentNotification(Schedule schedule, String commenterName, String commentContent) {
        if (schedule == null || schedule.getAuthorName() == null) {
            return;
        }

        String recipient = schedule.getAuthorName().trim();
        String sender = commenterName != null ? commenterName.trim() : "익명";

        // 본인이 작성한 일정에 본인이 단 댓글은 알림 생성하지 않음
        if (recipient.equalsIgnoreCase(sender)) {
            return;
        }

        String preview = commentContent != null ? commentContent.trim() : "";
        if (preview.length() > 100) {
            preview = preview.substring(0, 97) + "...";
        }

        Notification notification = Notification.builder()
                .recipientName(recipient)
                .senderName(sender)
                .scheduleId(schedule.getId())
                .scheduleTitle(schedule.getTitle())
                .commentContent(preview)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
    }

    /**
     * 단일 알림 읽음 처리
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(Notification::markAsRead);
    }

    /**
     * 사용자의 모든 알림 읽음 처리
     */
    @Transactional
    public void markAllAsRead(String userName) {
        if (userName != null && !userName.trim().isEmpty()) {
            notificationRepository.markAllAsRead(userName.trim());
        }
    }
}
