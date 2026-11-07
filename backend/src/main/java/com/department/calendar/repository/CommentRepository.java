package com.department.calendar.repository;

import com.department.calendar.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByScheduleIdOrderByCreatedAtAsc(Long scheduleId);
}
