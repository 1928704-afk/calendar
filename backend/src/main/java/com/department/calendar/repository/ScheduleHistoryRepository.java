package com.department.calendar.repository;

import com.department.calendar.domain.ScheduleHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleHistoryRepository extends JpaRepository<ScheduleHistory, Long> {
    List<ScheduleHistory> findByScheduleIdOrderByModifiedAtDesc(Long scheduleId);
    List<ScheduleHistory> findTop20ByDepartmentIdOrderByModifiedAtDesc(Long departmentId);
}
