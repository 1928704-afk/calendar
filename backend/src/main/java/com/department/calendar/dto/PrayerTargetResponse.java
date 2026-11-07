package com.department.calendar.dto;

import com.department.calendar.domain.PrayerTarget;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrayerTargetResponse {

    private Long id;
    private String department;
    private String leader;
    private String target;
    private String relationship;
    private String age;
    private String createdAt;
    private Boolean isRally;

    public static PrayerTargetResponse from(PrayerTarget entity) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        String formattedDate = entity.getCreatedAt() != null ? entity.getCreatedAt().format(formatter) : "";

        return PrayerTargetResponse.builder()
                .id(entity.getId())
                .department(entity.getDepartment())
                .leader(entity.getLeader())
                .target(entity.getTarget())
                .relationship(entity.getRelationship() != null ? entity.getRelationship() : "")
                .age(entity.getAge() != null ? entity.getAge() : "")
                .createdAt(formattedDate)
                .isRally(Boolean.TRUE.equals(entity.getIsRally()))
                .build();
    }
}
