package com.department.calendar.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification", indexes = {
        @Index(name = "idx_noti_recipient", columnList = "recipient_name, is_read")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_name", nullable = false, length = 50)
    private String recipientName; // 알림 수신자 (일정 작성자)

    @Column(name = "sender_name", nullable = false, length = 50)
    private String senderName; // 알림 발신자 (댓글 작성자)

    @Column(name = "schedule_id", nullable = false)
    private Long scheduleId; // 해당 일정 ID

    @Column(name = "schedule_title", nullable = false, length = 100)
    private String scheduleTitle; // 해당 일정 제목

    @Column(name = "comment_content", nullable = false, length = 255)
    private String commentContent; // 댓글 미리보기 내용

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false; // 읽음 여부

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public void markAsRead() {
        this.isRead = true;
    }
}
