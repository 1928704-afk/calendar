# ==========================================
# 1단계: 프론트엔드 웹 빌드 (Node.js)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npx expo export --platform web
# PWA 필수 에셋 및 매니페스트 복사
RUN cp public/manifest.json dist/ && cp public/service-worker.js dist/ && (cp public/*.png dist/ 2>/dev/null || true)

# ==========================================
# 2단계: 백엔드 스프링 부트 JAR 빌드 (Java 17 Gradle)
# ==========================================
FROM eclipse-temurin:17-jdk-alpine AS backend-builder
WORKDIR /app/backend

# Gradle 래퍼 및 설정 복사
COPY backend/gradle/ ./gradle/
COPY backend/gradlew ./
COPY backend/build.gradle ./
COPY backend/settings.gradle ./
RUN chmod +x ./gradlew

# 소스 코드 복사
COPY backend/src/ ./src/

# 1단계에서 빌드된 프론트엔드 정적 파일들을 스프링 부트 static 디렉토리에 통합
RUN mkdir -p ./src/main/resources/static
COPY --from=frontend-builder /app/frontend/dist/ ./src/main/resources/static/

# JAR 패키징 (테스트 제외)
RUN ./gradlew bootJar -x test --no-daemon

# ==========================================
# 3단계: 최종 실행 환경 (경량 JRE 17)
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# 타임존 설정 (한국 시간 Asia/Seoul)
RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul

# 빌드된 단일 실행 파일 복사
COPY --from=backend-builder /app/backend/build/libs/*-SNAPSHOT.jar app.jar

# Render/클라우드 기본 포트 8080 노출
ENV PORT=8080
EXPOSE 8080

# 메모리 최적화 JVM 옵션 및 실행
ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Dserver.port=${PORT} -jar app.jar"]
