package com.department.calendar.service;

import com.department.calendar.domain.Department;
import com.department.calendar.dto.DepartmentResponse;
import com.department.calendar.dto.LoginResponse;
import com.department.calendar.dto.SimpleLoginRequest;
import com.department.calendar.repository.DepartmentRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    @PostConstruct
    @Transactional
    public void initDefaultDepartments() {
        if (departmentRepository.count() == 0) {
            log.info("기본 부서 데이터 초기화 시작...");
            List<String> defaultDepts = List.of("언약부", "밀알부", "이레부");
            int order = 1;
            for (String deptName : defaultDepts) {
                departmentRepository.save(Department.builder()
                        .name(deptName)
                        .sortOrder(order++)
                        .build());
            }
            log.info("기본 부서 {}개 초기화 완료", defaultDepts.size());
        }
    }

    public List<DepartmentResponse> getDepartments() {
        return departmentRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(DepartmentResponse::from)
                .collect(Collectors.toList());
    }

    public Department getDepartmentEntity(Long departmentId) {
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 부서입니다. id=" + departmentId));
    }

    public LoginResponse simpleLogin(SimpleLoginRequest request) {
        if (request.getDepartmentId() == 0L) {
            return LoginResponse.builder()
                    .departmentId(0L)
                    .departmentName("전체 부서")
                    .userName(request.getUserName().trim())
                    .loginAt(LocalDateTime.now())
                    .build();
        }
        Department department = getDepartmentEntity(request.getDepartmentId());
        return LoginResponse.builder()
                .departmentId(department.getId())
                .departmentName(department.getName())
                .userName(request.getUserName().trim())
                .loginAt(LocalDateTime.now())
                .build();
    }
}
