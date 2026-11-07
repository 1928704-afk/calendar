package com.department.calendar.service;

import com.department.calendar.domain.Department;
import com.department.calendar.domain.Schedule;
import com.department.calendar.domain.ScheduleCategory;
import com.department.calendar.domain.ScheduleHistory;
import com.department.calendar.dto.*;
import com.department.calendar.repository.ScheduleHistoryRepository;
import com.department.calendar.repository.ScheduleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleHistoryRepository scheduleHistoryRepository;
    private final DepartmentService departmentService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper redisObjectMapper;

    private static final long CACHE_TTL_MINUTES = 10;

    /**
     * 월별 일정 목록 조회 (Redis 캐시 적용, departmentId=0 이면 전체 부서)
     */
    public List<ScheduleResponse> getMonthlySchedules(Long departmentId, int year, int month) {
        String cacheKey = (departmentId == 0L)
                ? String.format("dept:all:schedules:%04d-%02d", year, month)
                : String.format("dept:%d:schedules:%04d-%02d", departmentId, year, month);

        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("Redis 캐시 히트: {}", cacheKey);
                return redisObjectMapper.convertValue(cached, new TypeReference<List<ScheduleResponse>>() {});
            }
        } catch (Exception e) {
            log.warn("Redis 캐시 조회 실패, DB로 직접 조회합니다. key={}, err={}", cacheKey, e.getMessage());
        }

        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<Schedule> schedules = (departmentId == 0L)
                ? scheduleRepository.findAllByDateRange(startDate, endDate)
                : scheduleRepository.findByDepartmentAndDateRange(departmentId, startDate, endDate);

        List<ScheduleResponse> responses = schedules.stream()
                .map(ScheduleResponse::from)
                .collect(Collectors.toList());

        try {
            redisTemplate.opsForValue().set(cacheKey, responses, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
            log.debug("Redis 캐시 저장 완료: {}", cacheKey);
        } catch (Exception e) {
            log.warn("Redis 캐시 저장 실패: key={}, err={}", cacheKey, e.getMessage());
        }

        return responses;
    }

    /**
     * 주차별 타임라인 일정 조회 (Redis 캐시 적용, departmentId=0 이면 전체 부서)
     */
    public TimelineResponse getTimelineSchedules(Long departmentId, int year, int week) {
        String cacheKey = (departmentId == 0L)
                ? String.format("dept:all:timeline:%04d-W%02d", year, week)
                : String.format("dept:%d:timeline:%04d-W%02d", departmentId, year, week);

        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("Redis 타임라인 캐시 히트: {}", cacheKey);
                return redisObjectMapper.convertValue(cached, TimelineResponse.class);
            }
        } catch (Exception e) {
            log.warn("Redis 타임라인 캐시 조회 실패. key={}, err={}", cacheKey, e.getMessage());
        }

        WeekFields weekFields = WeekFields.of(Locale.KOREA);
        LocalDate firstDayOfYear = LocalDate.of(year, 1, 1);
        LocalDate weekStart = firstDayOfYear.with(weekFields.weekOfYear(), week).with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        // 월별 주차 계산 (해당 주 목요일 기준)
        LocalDate thursday = weekStart.plusDays(3);
        int month = thursday.getMonthValue();
        int weekOfMonth = (thursday.getDayOfMonth() - 1) / 7 + 1;
        String weekLabel = String.format("%d월 %d주차", month, weekOfMonth);

        List<Schedule> schedules = (departmentId == 0L)
                ? scheduleRepository.findAllByDateRange(weekStart, weekEnd)
                : scheduleRepository.findByDepartmentAndDateRange(departmentId, weekStart, weekEnd);

        List<TimelineDayResponse> dayResponses = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate currentDate = weekStart.plusDays(i);
            String dayOfWeekStr = currentDate.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.KOREAN);

            // 해당 날짜가 일정 기간(scheduleDate ~ endDate) 내에 포함되는지 확인
            List<ScheduleResponse> daySchedules = schedules.stream()
                    .filter(s -> {
                        LocalDate start = s.getScheduleDate();
                        LocalDate end = (s.getEndDate() != null) ? s.getEndDate() : start;
                        return !currentDate.isBefore(start) && !currentDate.isAfter(end);
                    })
                    .map(ScheduleResponse::from)
                    .collect(Collectors.toList());

            dayResponses.add(TimelineDayResponse.builder()
                    .date(currentDate)
                    .dayOfWeek(dayOfWeekStr)
                    .schedules(daySchedules)
                    .build());
        }

        TimelineResponse timelineResponse = TimelineResponse.builder()
                .year(year)
                .week(week)
                .month(month)
                .weekOfMonth(weekOfMonth)
                .weekLabel(weekLabel)
                .startDate(weekStart)
                .endDate(weekEnd)
                .days(dayResponses)
                .build();

        try {
            redisTemplate.opsForValue().set(cacheKey, timelineResponse, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.warn("Redis 타임라인 캐시 저장 실패: key={}, err={}", cacheKey, e.getMessage());
        }

        return timelineResponse;
    }

    /**
     * 월간 타임라인 일정 조회 (비어있는 요일 제외, 일정이 있는 날짜만 포함)
     */
    public MonthlyTimelineResponse getMonthlyTimeline(Long departmentId, int year, int month) {
        String cacheKey = (departmentId == 0L)
                ? String.format("dept:all:timeline:monthly:%04d-%02d", year, month)
                : String.format("dept:%d:timeline:monthly:%04d-%02d", departmentId, year, month);

        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("Redis 월간 타임라인 캐시 히트: {}", cacheKey);
                return redisObjectMapper.convertValue(cached, MonthlyTimelineResponse.class);
            }
        } catch (Exception e) {
            log.warn("Redis 월간 타임라인 캐시 조회 실패. key={}, err={}", cacheKey, e.getMessage());
        }

        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate monthStart = yearMonth.atDay(1);
        LocalDate monthEnd = yearMonth.atEndOfMonth();

        List<Schedule> schedules = (departmentId == 0L)
                ? scheduleRepository.findAllByDateRange(monthStart, monthEnd)
                : scheduleRepository.findByDepartmentAndDateRange(departmentId, monthStart, monthEnd);

        int totalDays = yearMonth.lengthOfMonth();
        List<TimelineDayResponse> dayResponses = new ArrayList<>();

        for (int i = 1; i <= totalDays; i++) {
            LocalDate currentDate = yearMonth.atDay(i);
            String dayOfWeekStr = currentDate.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.KOREAN);

            // 해당 날짜가 일정 기간(scheduleDate ~ endDate) 내에 포함되는지 확인
            List<ScheduleResponse> daySchedules = schedules.stream()
                    .filter(s -> {
                        LocalDate sStart = s.getScheduleDate();
                        LocalDate sEnd = (s.getEndDate() != null) ? s.getEndDate() : sStart;
                        return !currentDate.isBefore(sStart) && !currentDate.isAfter(sEnd);
                    })
                    .map(ScheduleResponse::from)
                    .collect(Collectors.toList());

            // 비어있는 날짜는 제외하고 일정이 있는 날짜만 포함
            if (!daySchedules.isEmpty()) {
                dayResponses.add(TimelineDayResponse.builder()
                        .date(currentDate)
                        .dayOfWeek(dayOfWeekStr)
                        .schedules(daySchedules)
                        .build());
            }
        }

        MonthlyTimelineResponse response = MonthlyTimelineResponse.builder()
                .year(year)
                .month(month)
                .days(dayResponses)
                .build();

        try {
            redisTemplate.opsForValue().set(cacheKey, response, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.warn("Redis 월간 타임라인 캐시 저장 실패: key={}, err={}", cacheKey, e.getMessage());
        }

        return response;
    }

    /**
     * 일정 생성
     */
    @Transactional
    public ScheduleResponse createSchedule(Long departmentId, ScheduleCreateRequest request) {
        Long targetDeptId = (departmentId != null && departmentId > 0)
                ? departmentId
                : (request.getDepartmentId() != null && request.getDepartmentId() > 0 ? request.getDepartmentId() : 1L);

        Department department = departmentService.getDepartmentEntity(targetDeptId);

        ScheduleCategory category = request.getCategory();
        if (category == null) {
            category = ScheduleCategory.fromTitle(request.getTitle());
        }

        String color = request.getColor();
        if (color == null || color.isBlank()) {
            color = category.getDefaultColor();
        }

        LocalDate endDate = (request.getEndDate() != null) ? request.getEndDate() : request.getScheduleDate();

        Schedule schedule = Schedule.builder()
                .department(department)
                .category(category)
                .title(request.getTitle().trim())
                .authorName(request.getAuthorName().trim())
                .targetName(request.getTargetName().trim())
                .scheduleDate(request.getScheduleDate())
                .endDate(endDate)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .color(color)
                .memo(request.getMemo())
                .createdBy(request.getAuthorName().trim())
                .updatedBy(request.getAuthorName().trim())
                .build();

        Schedule saved = scheduleRepository.save(schedule);

        // 생성 이력 저장
        scheduleHistoryRepository.save(ScheduleHistory.builder()
                .scheduleId(saved.getId())
                .departmentId(saved.getDepartment().getId())
                .action("CREATE")
                .modifierName(saved.getCreatedBy())
                .changesSummary(String.format("일정 생성: %s (%s -> %s)", saved.getTitle(), saved.getAuthorName(), saved.getTargetName()))
                .build());

        evictDepartmentCache(saved.getDepartment().getId());
        return ScheduleResponse.from(saved);
    }

    /**
     * 일정 수정 (본인이 작성한 글만 수정 가능)
     */
    @Transactional
    public ScheduleResponse updateSchedule(Long departmentId, Long scheduleId, ScheduleUpdateRequest request) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일정입니다. id=" + scheduleId));

        if (departmentId != null && departmentId > 0 && !schedule.getDepartment().getId().equals(departmentId)) {
            throw new IllegalArgumentException("해당 부서의 일정이 아닙니다.");
        }

        String modifier = (request.getModifierName() != null && !request.getModifierName().isBlank())
                ? request.getModifierName().trim()
                : request.getAuthorName().trim();

        // 본인 작성글만 수정 가능 검증
        if (!schedule.getAuthorName().equals(modifier) && !schedule.getCreatedBy().equals(modifier)) {
            throw new IllegalArgumentException("본인이 작성한 일정만 수정할 수 있습니다. (작성자: " + schedule.getAuthorName() + ")");
        }

        String summary = String.format("일정 수정: '%s'(%s) -> '%s'(%s) by %s",
                schedule.getTitle(), schedule.getTargetName(),
                request.getTitle(), request.getTargetName(), modifier);

        LocalDate endDate = (request.getEndDate() != null) ? request.getEndDate() : request.getScheduleDate();

        schedule.updateWiki(
                request.getTitle().trim(),
                request.getCategory(),
                request.getAuthorName().trim(),
                request.getTargetName().trim(),
                request.getScheduleDate(),
                endDate,
                request.getStartTime(),
                request.getEndTime(),
                request.getColor(),
                request.getMemo(),
                modifier
        );

        // 수정 이력 기록
        scheduleHistoryRepository.save(ScheduleHistory.builder()
                .scheduleId(schedule.getId())
                .departmentId(schedule.getDepartment().getId())
                .action("UPDATE")
                .modifierName(modifier)
                .changesSummary(summary)
                .build());

        evictDepartmentCache(schedule.getDepartment().getId());
        return ScheduleResponse.from(schedule);
    }

    /**
     * 일정 삭제 (본인이 작성한 글만 삭제 가능)
     */
    @Transactional
    public void deleteSchedule(Long departmentId, Long scheduleId, String modifierName) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일정입니다. id=" + scheduleId));

        if (departmentId != null && departmentId > 0 && !schedule.getDepartment().getId().equals(departmentId)) {
            throw new IllegalArgumentException("해당 부서의 일정이 아닙니다.");
        }

        String modifier = (modifierName != null && !modifierName.isBlank()) ? modifierName.trim() : "알수없음";

        // 본인 작성글만 삭제 가능 검증
        if (!schedule.getAuthorName().equals(modifier) && !schedule.getCreatedBy().equals(modifier)) {
            throw new IllegalArgumentException("본인이 작성한 일정만 삭제할 수 있습니다. (작성자: " + schedule.getAuthorName() + ")");
        }

        scheduleHistoryRepository.save(ScheduleHistory.builder()
                .scheduleId(schedule.getId())
                .departmentId(schedule.getDepartment().getId())
                .action("DELETE")
                .modifierName(modifier)
                .changesSummary(String.format("일정 삭제: %s (%s -> %s) by %s",
                        schedule.getTitle(), schedule.getAuthorName(), schedule.getTargetName(), modifier))
                .build());

        Long targetDeptId = schedule.getDepartment().getId();
        scheduleRepository.delete(schedule);
        evictDepartmentCache(targetDeptId);
    }

    /**
     * 특정 일정의 위키 수정 이력 조회
     */
    public List<ScheduleHistoryResponse> getScheduleHistories(Long scheduleId) {
        return scheduleHistoryRepository.findByScheduleIdOrderByModifiedAtDesc(scheduleId).stream()
                .map(ScheduleHistoryResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 부서의 최근 변경 내역 조회
     */
    public List<ScheduleHistoryResponse> getDepartmentHistories(Long departmentId) {
        return scheduleHistoryRepository.findTop20ByDepartmentIdOrderByModifiedAtDesc(departmentId).stream()
                .map(ScheduleHistoryResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 해당 부서의 Redis 일정 캐시 패턴 삭제 (무효화)
     */
    private void evictDepartmentCache(Long departmentId) {
        try {
            Set<String> keys = redisTemplate.keys(String.format("dept:%d:*", departmentId));
            Set<String> allKeys = redisTemplate.keys("dept:all:*");
            Set<String> combined = new HashSet<>();
            if (keys != null) combined.addAll(keys);
            if (allKeys != null) combined.addAll(allKeys);

            if (!combined.isEmpty()) {
                redisTemplate.delete(combined);
                log.info("부서 {} 및 전체 관련 캐시 {}개 무효화 완료", departmentId, combined.size());
            }
        } catch (Exception e) {
            log.warn("Redis 캐시 무효화 중 오류 발생: {}", e.getMessage());
        }
    }
}
