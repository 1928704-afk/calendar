package com.department.calendar.controller;

import com.department.calendar.common.ApiResponse;
import com.department.calendar.dto.*;
import com.department.calendar.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/departments/{departmentId}")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    /**
     * 월간 달력 일정 목록 조회
     */
    @GetMapping("/schedules")
    public ApiResponse<List<ScheduleResponse>> getMonthlySchedules(
            @PathVariable Long departmentId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        LocalDate now = LocalDate.now();
        int targetYear = (year != null) ? year : now.getYear();
        int targetMonth = (month != null) ? month : now.getMonthValue();

        return ApiResponse.ok(scheduleService.getMonthlySchedules(departmentId, targetYear, targetMonth));
    }

    /**
     * 주차별 타임라인 일정 목록 조회
     */
    @GetMapping("/schedules/timeline")
    public ApiResponse<TimelineResponse> getTimelineSchedules(
            @PathVariable Long departmentId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer week) {

        LocalDate now = LocalDate.now();
        int targetYear = (year != null) ? year : now.getYear();
        int targetWeek;
        if (week != null) {
            targetWeek = week;
        } else {
            WeekFields weekFields = WeekFields.of(Locale.KOREA);
            targetWeek = now.get(weekFields.weekOfYear());
        }

        return ApiResponse.ok(scheduleService.getTimelineSchedules(departmentId, targetYear, targetWeek));
    }

    /**
     * 월간 타임라인 일정 목록 조회 (무한 스크롤용)
     */
    @GetMapping("/schedules/monthly-timeline")
    public ApiResponse<MonthlyTimelineResponse> getMonthlyTimeline(
            @PathVariable Long departmentId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        LocalDate now = LocalDate.now();
        int targetYear = (year != null) ? year : now.getYear();
        int targetMonth = (month != null) ? month : now.getMonthValue();

        return ApiResponse.ok(scheduleService.getMonthlyTimeline(departmentId, targetYear, targetMonth));
    }

    /**
     * 일정 생성
     */
    @PostMapping("/schedules")
    public ApiResponse<ScheduleResponse> createSchedule(
            @PathVariable Long departmentId,
            @Valid @RequestBody ScheduleCreateRequest request) {
        return ApiResponse.ok(scheduleService.createSchedule(departmentId, request), "일정이 성공적으로 등록되었습니다.");
    }

    /**
     * 일정 수정 (위키형 누구나 수정)
     */
    @PutMapping("/schedules/{scheduleId}")
    public ApiResponse<ScheduleResponse> updateSchedule(
            @PathVariable Long departmentId,
            @PathVariable Long scheduleId,
            @Valid @RequestBody ScheduleUpdateRequest request) {
        return ApiResponse.ok(scheduleService.updateSchedule(departmentId, scheduleId, request), "일정이 성공적으로 수정되었습니다.");
    }

    /**
     * 일정 삭제 (위키형 누구나 삭제)
     */
    @DeleteMapping("/schedules/{scheduleId}")
    public ApiResponse<Void> deleteSchedule(
            @PathVariable Long departmentId,
            @PathVariable Long scheduleId,
            @RequestParam(required = false) String modifierName) {
        scheduleService.deleteSchedule(departmentId, scheduleId, modifierName);
        return ApiResponse.ok(null, "일정이 성공적으로 삭제되었습니다.");
    }

    /**
     * 특정 일정의 위키 수정 이력
     */
    @GetMapping("/schedules/{scheduleId}/histories")
    public ApiResponse<List<ScheduleHistoryResponse>> getScheduleHistories(
            @PathVariable Long departmentId,
            @PathVariable Long scheduleId) {
        return ApiResponse.ok(scheduleService.getScheduleHistories(scheduleId));
    }

    /**
     * 부서 전체의 최근 일정 변경 내역 (피드)
     */
    @GetMapping("/histories")
    public ApiResponse<List<ScheduleHistoryResponse>> getDepartmentHistories(
            @PathVariable Long departmentId) {
        return ApiResponse.ok(scheduleService.getDepartmentHistories(departmentId));
    }
}
