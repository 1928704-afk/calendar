package com.department.calendar.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ScheduleCategory {
    CAFE("카페약속", "#FF9800"),
    MEAL("점심약속", "#4CAF50"),
    RALLY("집회확정", "#F44336"),
    CUSTOM("직접입력", "#3F51B5");

    private final String defaultTitle;
    private final String defaultColor;

    public static ScheduleCategory fromTitle(String title) {
        if (title == null) return CUSTOM;
        String trimmed = title.trim();
        if (trimmed.contains("카페")) return CAFE;
        if (trimmed.contains("점심") || trimmed.contains("식사")) return MEAL;
        if (trimmed.contains("집회")) return RALLY;
        return CUSTOM;
    }
}
