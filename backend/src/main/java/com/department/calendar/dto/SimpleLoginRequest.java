package com.department.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleLoginRequest {

    @NotNull(message = "부서를 선택해주세요.")
    private Long departmentId;

    @NotBlank(message = "이름을 입력해주세요.")
    private String userName;
}
