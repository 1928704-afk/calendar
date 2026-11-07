package com.department.calendar.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PrayerTargetCreateRequest {

    @NotBlank(message = "부서는 필수입니다.")
    private String department;

    @NotBlank(message = "인도자명은 필수입니다.")
    private String leader;

    @NotBlank(message = "전도 대상자명은 필수입니다.")
    private String target;

    private String relationship;
    private String age;
    private Boolean isRally;
}
