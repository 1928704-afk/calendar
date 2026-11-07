package com.department.calendar.repository;

import com.department.calendar.domain.PrayerTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrayerTargetRepository extends JpaRepository<PrayerTarget, Long> {

    List<PrayerTarget> findAllByOrderByIdAsc();

    List<PrayerTarget> findByDepartmentOrderByIdAsc(String department);

    List<PrayerTarget> findByLeaderOrderByIdAsc(String leader);

    List<PrayerTarget> findByDepartmentAndLeaderOrderByIdAsc(String department, String leader);
}
