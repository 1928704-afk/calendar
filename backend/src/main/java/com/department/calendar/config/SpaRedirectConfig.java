package com.department.calendar.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class SpaRedirectConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // static 리소스 서빙 및 SPA fallback 설정
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        // 파일이 실제로 존재하고 읽을 수 있으면 해당 정적 파일 서빙
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }
                        // /api 경로는 SPA fallback 대상에서 제외 (404 유지)
                        if (resourcePath.startsWith("api/") || resourcePath.startsWith("/api/")) {
                            return null;
                        }
                        // 그 외 경로(SPA 클라이언트 라우팅)는 index.html 반환
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
