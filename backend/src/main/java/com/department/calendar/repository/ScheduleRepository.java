package com.department.calendar.repository;

import com.department.calendar.domain.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    @Query("SELECT s FROM Schedule s JOIN FETCH s.department d " +
           "WHERE d.id = :departmentId " +
           "AND s.scheduleDate <= :endDate " +
           "AND COALESCE(s.endDate, s.scheduleDate) >= :startDate " +
           "ORDER BY s.scheduleDate ASC, s.startTime ASC NULLS LAST, s.id ASC")
    List<Schedule> findByDepartmentAndDateRange(
            @Param("departmentId") Long departmentId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT s FROM Schedule s JOIN FETCH s.department d " +
           "WHERE s.scheduleDate <= :endDate " +
           "AND COALESCE(s.endDate, s.scheduleDate) >= :startDate " +
           "ORDER BY s.scheduleDate ASC, s.startTime ASC NULLS LAST, s.id ASC")
    List<Schedule> findAllByDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
