package com.department.calendar.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CommentCreateRequest {

    @NotBlank(message = "작성자 이름을 입력해주세요.")
    private String authorName;

    @NotBlank(message = "댓글 내용을 입력해주세요.")
    private String content;
}
