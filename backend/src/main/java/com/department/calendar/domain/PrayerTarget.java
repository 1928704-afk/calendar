package com.department.calendar.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 전도 대상자 기도 명단 엔티티
 */
@Entity
@Table(name = "prayer_target")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class PrayerTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String department; // 소속 부서 (언약부, 밀알부, 이레부)

    @Column(nullable = false, length = 50)
    private String leader; // 인도자 (성도 이름)

    @Column(nullable = false, length = 50)
    private String target; // 전도 대상자

    @Column(length = 50)
    private String relationship; // 관계 (친구, 직장동료 등)

    @Column(length = 20)
    private String age; // 나이

    @Column(name = "is_rally", nullable = false)
    private Boolean isRally = false; // 대집회 기도명단 포함 여부

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public PrayerTarget(String department, String leader, String target, String relationship, String age, Boolean isRally) {
        this.department = department;
        this.leader = leader;
        this.target = target;
        this.relationship = relationship;
        this.age = age;
        this.isRally = isRally != null ? isRally : false;
    }

    public void toggleRally() {
        this.isRally = !Boolean.TRUE.equals(this.isRally);
    }

    public void setRally(boolean rally) {
        this.isRally = rally;
    }
}
