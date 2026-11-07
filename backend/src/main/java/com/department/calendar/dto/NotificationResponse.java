package com.department.calendar.dto;

import com.department.calendar.domain.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;
    private String recipientName;
    private String senderName;
    private Long scheduleId;
    private String scheduleTitle;
    private String commentContent;
    @com.fasterxml.jackson.annotation.JsonProperty("isRead")
    private boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .recipientName(n.getRecipientName())
                .senderName(n.getSenderName())
                .scheduleId(n.getScheduleId())
                .scheduleTitle(n.getScheduleTitle())
                .commentContent(n.getCommentContent())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
