package com.department.calendar.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimelineDayResponse {

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    private String dayOfWeek; // "월", "화", "수" ...
    private List<ScheduleResponse> schedules;
}
