package com.department.calendar.dto;

import com.department.calendar.domain.Schedule;
import com.department.calendar.domain.ScheduleCategory;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleResponse {
    private Long id;
    private Long departmentId;
    private String departmentName;
    private ScheduleCategory category;
    private String title;
    private String authorName;
    private String targetName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate scheduleDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    private String color;
    private String memo;
    private String createdBy;
    private String updatedBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    public static ScheduleResponse from(Schedule schedule) {
        return ScheduleResponse.builder()
                .id(schedule.getId())
                .departmentId(schedule.getDepartment().getId())
                .departmentName(schedule.getDepartment().getName())
                .category(schedule.getCategory())
                .title(schedule.getTitle())
                .authorName(schedule.getAuthorName())
                .targetName(schedule.getTargetName())
                .scheduleDate(schedule.getScheduleDate())
                .endDate(schedule.getEndDate() != null ? schedule.getEndDate() : schedule.getScheduleDate())
                .startTime(schedule.getStartTime())
                .endTime(schedule.getEndTime())
                .color(schedule.getColor())
                .memo(schedule.getMemo())
                .createdBy(schedule.getCreatedBy())
                .updatedBy(schedule.getUpdatedBy())
                .createdAt(schedule.getCreatedAt())
                .updatedAt(schedule.getUpdatedAt())
                .build();
    }
}
