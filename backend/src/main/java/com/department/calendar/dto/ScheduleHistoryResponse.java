package com.department.calendar.dto;

import com.department.calendar.domain.ScheduleHistory;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleHistoryResponse {
    private Long id;
    private Long scheduleId;
    private Long departmentId;
    private String action;
    private String modifierName;
    private String changesSummary;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime modifiedAt;

    public static ScheduleHistoryResponse from(ScheduleHistory history) {
        return ScheduleHistoryResponse.builder()
                .id(history.getId())
                .scheduleId(history.getScheduleId())
                .departmentId(history.getDepartmentId())
                .action(history.getAction())
                .modifierName(history.getModifierName())
                .changesSummary(history.getChangesSummary())
                .modifiedAt(history.getModifiedAt())
                .build();
    }
}
