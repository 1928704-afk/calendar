package com.department.calendar.service;

import com.department.calendar.domain.PrayerTarget;
import com.department.calendar.dto.PrayerTargetCreateRequest;
import com.department.calendar.dto.PrayerTargetResponse;
import com.department.calendar.repository.PrayerTargetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrayerTargetService {

    private final PrayerTargetRepository prayerTargetRepository;

    /**
     * 기도 명단 목록 조회 (부서별, 인도자별, 대집회 필터링 지원)
     */
    @Transactional(readOnly = true)
    public List<PrayerTargetResponse> getPrayers(String department, String leader, Boolean isRally) {
        List<PrayerTarget> list;

        boolean hasDept = department != null && !department.isBlank() && !department.equals("전체") && !department.equals("전체 부서");
        boolean hasLeader = leader != null && !leader.isBlank();

        if (hasDept && hasLeader) {
            list = prayerTargetRepository.findByDepartmentAndLeaderOrderByIdAsc(department.trim(), leader.trim());
        } else if (hasDept) {
            list = prayerTargetRepository.findByDepartmentOrderByIdAsc(department.trim());
        } else if (hasLeader) {
            list = prayerTargetRepository.findByLeaderOrderByIdAsc(leader.trim());
        } else {
            list = prayerTargetRepository.findAllByOrderByIdAsc();
        }

        return list.stream()
                .filter(item -> isRally == null || (Boolean.TRUE.equals(isRally) ? Boolean.TRUE.equals(item.getIsRally()) : !Boolean.TRUE.equals(item.getIsRally())))
                .map(PrayerTargetResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 새 기도 대상자 등록
     */
    @Transactional
    public PrayerTargetResponse createPrayer(PrayerTargetCreateRequest request) {
        PrayerTarget entity = PrayerTarget.builder()
                .department(request.getDepartment().trim())
                .leader(request.getLeader().trim())
                .target(request.getTarget().trim())
                .relationship(request.getRelationship() != null ? request.getRelationship().trim() : "")
                .age(request.getAge() != null ? request.getAge().trim() : "")
                .isRally(Boolean.TRUE.equals(request.getIsRally()))
                .build();

        PrayerTarget saved = prayerTargetRepository.save(entity);
        log.info("새 기도 대상자 등록 완료: id={}, leader={}, target={}, isRally={}", saved.getId(), saved.getLeader(), saved.getTarget(), saved.getIsRally());
        return PrayerTargetResponse.from(saved);
    }

    /**
     * 대집회 기도명단 포함 여부 변경 (토글 또는 지정)
     */
    @Transactional
    public PrayerTargetResponse updateRallyStatus(Long id, Boolean isRally) {
        PrayerTarget target = prayerTargetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기도 대상자입니다. id=" + id));

        if (isRally != null) {
            target.setRally(isRally);
        } else {
            target.toggleRally();
        }

        log.info("대집회 기도명단 상태 변경: id={}, isRally={}", id, target.getIsRally());
        return PrayerTargetResponse.from(target);
    }

    /**
     * 기도 대상자 삭제
     */
    @Transactional
    public void deletePrayer(Long id) {
        PrayerTarget target = prayerTargetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 기도 대상자입니다. id=" + id));
        prayerTargetRepository.delete(target);
        log.info("기도 대상자 삭제 완료: id={}", id);
    }
}
