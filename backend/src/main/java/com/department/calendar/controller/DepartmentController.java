package com.department.calendar.controller;

import com.department.calendar.common.ApiResponse;
import com.department.calendar.dto.DepartmentResponse;
import com.department.calendar.dto.LoginResponse;
import com.department.calendar.dto.SimpleLoginRequest;
import com.department.calendar.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping("/departments")
    public ApiResponse<List<DepartmentResponse>> getDepartments() {
        return ApiResponse.ok(departmentService.getDepartments());
    }

    @PostMapping("/auth/simple-login")
    public ApiResponse<LoginResponse> simpleLogin(@Valid @RequestBody SimpleLoginRequest request) {
        return ApiResponse.ok(departmentService.simpleLogin(request), "성공적으로 입장하였습니다.");
    }
}
