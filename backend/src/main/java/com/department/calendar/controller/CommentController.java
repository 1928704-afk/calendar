package com.department.calendar.controller;

import com.department.calendar.common.ApiResponse;
import com.department.calendar.dto.CommentCreateRequest;
import com.department.calendar.dto.CommentResponse;
import com.department.calendar.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/schedules/{scheduleId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * 댓글 목록 조회
     */
    @GetMapping
    public ApiResponse<List<CommentResponse>> getComments(@PathVariable Long scheduleId) {
        return ApiResponse.ok(commentService.getComments(scheduleId));
    }

    /**
     * 댓글 작성
     */
    @PostMapping
    public ApiResponse<CommentResponse> createComment(
            @PathVariable Long scheduleId,
            @Valid @RequestBody CommentCreateRequest request) {
        return ApiResponse.ok(commentService.createComment(scheduleId, request), "댓글이 등록되었습니다.");
    }

    /**
     * 댓글 삭제
     */
    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> deleteComment(
            @PathVariable Long scheduleId,
            @PathVariable Long commentId,
            @RequestParam(required = false) String requesterName) {
        commentService.deleteComment(commentId, requesterName);
        return ApiResponse.ok(null, "댓글이 삭제되었습니다.");
    }
}
