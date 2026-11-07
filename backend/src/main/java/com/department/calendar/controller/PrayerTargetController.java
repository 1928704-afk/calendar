package com.department.calendar.controller;

import com.department.calendar.common.ApiResponse;
import com.department.calendar.dto.PrayerTargetCreateRequest;
import com.department.calendar.dto.PrayerTargetResponse;
import com.department.calendar.service.PrayerTargetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/prayers")
@RequiredArgsConstructor
public class PrayerTargetController {

    private final PrayerTargetService prayerTargetService;

    /**
     * 기도 명단 목록 조회
     * GET /api/v1/prayers?department={department}&leader={leader}&isRally={isRally}
     */
    @GetMapping
    public ApiResponse<List<PrayerTargetResponse>> getPrayers(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String leader,
            @RequestParam(required = false) Boolean isRally) {
        List<PrayerTargetResponse> list = prayerTargetService.getPrayers(department, leader, isRally);
        return ApiResponse.ok(list);
    }

    /**
     * 새 기도 대상 등록
     * POST /api/v1/prayers
     */
    @PostMapping
    public ApiResponse<PrayerTargetResponse> createPrayer(
            @Valid @RequestBody PrayerTargetCreateRequest request) {
        PrayerTargetResponse response = prayerTargetService.createPrayer(request);
        return ApiResponse.ok(response);
    }

    /**
     * 대집회 기도명단 등록/해제 상태 변경
     * PATCH /api/v1/prayers/{id}/rally
     */
    @PatchMapping("/{id}/rally")
    public ApiResponse<PrayerTargetResponse> updateRallyStatus(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean isRally) {
        PrayerTargetResponse response = prayerTargetService.updateRallyStatus(id, isRally);
        return ApiResponse.ok(response);
    }

    /**
     * 기도 대상 삭제
     * DELETE /api/v1/prayers/{id}
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deletePrayer(@PathVariable Long id) {
        prayerTargetService.deletePrayer(id);
        return ApiResponse.ok(null);
    }
}
