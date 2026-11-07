package com.department.calendar.controller;

import com.department.calendar.common.ApiResponse;
import com.department.calendar.dto.NotificationResponse;
import com.department.calendar.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 알림 목록 조회
     */
    @GetMapping
    public ApiResponse<List<NotificationResponse>> getNotifications(@RequestParam String userName) {
        return ApiResponse.ok(notificationService.getNotifications(userName));
    }

    /**
     * 읽지 않은 알림 개수 조회
     */
    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> getUnreadCount(@RequestParam String userName) {
        long count = notificationService.getUnreadCount(userName);
        Map<String, Long> result = new HashMap<>();
        result.put("unreadCount", count);
        return ApiResponse.ok(result);
    }

    /**
     * 단일 알림 읽음 처리
     */
    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ApiResponse.ok(null, "알림을 읽음 처리했습니다.");
    }

    /**
     * 전체 알림 읽음 처리
     */
    @PatchMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(@RequestParam String userName) {
        notificationService.markAllAsRead(userName);
        return ApiResponse.ok(null, "모든 알림을 읽음 처리했습니다.");
    }
}
