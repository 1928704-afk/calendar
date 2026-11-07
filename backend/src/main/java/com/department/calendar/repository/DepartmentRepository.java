package com.department.calendar.repository;

import com.department.calendar.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findAllByOrderBySortOrderAscIdAsc();
    Optional<Department> findByName(String name);
}
