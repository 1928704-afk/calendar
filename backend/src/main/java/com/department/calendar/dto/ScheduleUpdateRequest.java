package com.department.calendar.dto;

import com.department.calendar.domain.ScheduleCategory;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScheduleUpdateRequest {

    private ScheduleCategory category;

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;

    @NotBlank(message = "작성자(유저명)를 입력해주세요.")
    private String authorName;

    @NotBlank(message = "대상자명을 입력해주세요.")
    private String targetName;

    @NotNull(message = "일정 날짜를 입력해주세요.")
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

    private String modifierName; // 수정한 사용자 (위키형 추적용)
}
