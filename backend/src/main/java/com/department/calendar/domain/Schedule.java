package com.department.calendar.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "schedule", indexes = {
        @Index(name = "idx_dept_date", columnList = "department_id, schedule_date")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScheduleCategory category;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "author_name", nullable = false, length = 50)
    private String authorName;

    @Column(name = "target_name", nullable = false, length = 50)
    private String targetName;

    @Column(name = "schedule_date", nullable = false)
    private LocalDate scheduleDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "created_by", nullable = false, length = 50)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 50)
    private String updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.endDate == null) {
            this.endDate = this.scheduleDate;
        }
        if (this.color == null && this.category != null) {
            this.color = this.category.getDefaultColor();
        }
        if (this.updatedBy == null) {
            this.updatedBy = this.createdBy != null ? this.createdBy : this.authorName;
        }
        if (this.createdBy == null) {
            this.createdBy = this.authorName;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.endDate == null) {
            this.endDate = this.scheduleDate;
        }
    }

    public void updateWiki(String title, ScheduleCategory category, String authorName,
                           String targetName, LocalDate scheduleDate, LocalDate endDate,
                           LocalTime startTime, LocalTime endTime, String color, String memo, String modifierName) {
        this.title = title;
        this.category = category != null ? category : ScheduleCategory.fromTitle(title);
        this.authorName = authorName;
        this.targetName = targetName;
        this.scheduleDate = scheduleDate;
        this.endDate = (endDate != null) ? endDate : scheduleDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.color = (color != null && !color.isBlank()) ? color : this.category.getDefaultColor();
        this.memo = memo;
        this.updatedBy = (modifierName != null && !modifierName.isBlank()) ? modifierName : authorName;
    }
}
