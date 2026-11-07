package com.department.calendar.service;

import com.department.calendar.domain.Comment;
import com.department.calendar.domain.Schedule;
import com.department.calendar.dto.CommentCreateRequest;
import com.department.calendar.dto.CommentResponse;
import com.department.calendar.repository.CommentRepository;
import com.department.calendar.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final ScheduleRepository scheduleRepository;
    private final NotificationService notificationService;

    /**
     * 일정에 달린 댓글 목록 조회
     */
    public List<CommentResponse> getComments(Long scheduleId) {
        return commentRepository.findByScheduleIdOrderByCreatedAtAsc(scheduleId).stream()
                .map(CommentResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 댓글 작성
     */
    @Transactional
    public CommentResponse createComment(Long scheduleId, CommentCreateRequest request) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일정입니다. (id: " + scheduleId + ")"));

        Comment comment = Comment.builder()
                .schedule(schedule)
                .authorName(request.getAuthorName())
                .content(request.getContent())
                .build();

        Comment saved = commentRepository.save(comment);

        // 일정 작성자에게 새 댓글 알림 생성
        try {
            notificationService.createCommentNotification(schedule, request.getAuthorName(), request.getContent());
        } catch (Exception e) {
            // 알림 실패가 댓글 작성을 롤백시키지 않도록 예외 격리
        }

        return CommentResponse.from(saved);
    }

    /**
     * 댓글 삭제
     */
    @Transactional
    public void deleteComment(Long commentId, String requesterName) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다. (id: " + commentId + ")"));

        // 작성자 검증
        if (requesterName != null && !requesterName.trim().isEmpty() &&
                !comment.getAuthorName().equals(requesterName.trim())) {
            throw new IllegalArgumentException("본인이 작성한 댓글만 삭제할 수 있습니다. (작성자: " + comment.getAuthorName() + ")");
        }

        commentRepository.delete(comment);
    }
}
