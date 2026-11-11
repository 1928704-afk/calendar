import * as Sentry from '@sentry/react';

// Sentry DSN 환경변수 (Cloudflare 대시보드 또는 .env의 EXPO_PUBLIC_SENTRY_DSN 설정 시 자동 연동)
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let isInitialized = false;

// 자체 API 베이스 경로 결정 (api.ts와 동일 규칙)
function getApiRootUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.port === '8082') {
      return 'http://localhost:8080/api/v1';
    }
    return '/api/v1';
  }
  return '/api/v1';
}

function getLogEndpoint(): string {
  return `${getApiRootUrl()}/logs/error`;
}

// 자체 Cloudflare Workers & D1 error_logs에 비동기 에러 리포팅
async function sendLogToBackend(payload: {
  source: string;
  level: string;
  message: string;
  stack?: string;
  url?: string;
  userName?: string;
  extra?: Record<string, any>;
}) {
  try {
    const endpoint = getLogEndpoint();
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    // 세션에서 로그인한 사용자 이름 추출 시도
    let detectedUser = payload.userName || '';
    if (!detectedUser && typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('CALENDAR_USER_SESSION');
        if (raw) {
          const parsed = JSON.parse(raw);
          detectedUser = parsed?.userName || '';
        }
      } catch {}
    }

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        source: payload.source,
        level: payload.level,
        message: payload.message,
        stack: payload.stack || '',
        url: payload.url || currentUrl,
        userAgent,
        userName: detectedUser,
        extra: payload.extra || {},
      }),
    });
  } catch {
    // 모니터링 전송 자체의 오류는 앱 동작에 영향을 주지 않도록 무시
  }
}

/**
 * Sentry 및 전역 브라우저/크래시 모니터링 초기화
 */
export function initMonitoring() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Sentry SDK 초기화 (DSN이 설정된 경우 활성화)
  if (SENTRY_DSN) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? 'development'
          : 'production',
        integrations: [
          Sentry.browserTracingIntegration(),
        ],
        // 성능 모니터링 샘플링 (30%)
        tracesSampleRate: 0.3,
        // 오탐 방지를 위한 노이즈 필터링
        ignoreErrors: ['ResizeObserver loop limit exceeded'],
      });
    } catch (e) {
      console.warn('Sentry 초기화 중 경고:', e);
    }
  }

  // 2. 전역 JS 런타임 에러 및 미처리 Promise 예외 감지 리스너 등록
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      const errorObj = event.error;
      const msg = errorObj?.message || event.message || '전역 스크립트 런타임 오류';
      const stack = errorObj?.stack || `${event.filename}:${event.lineno}:${event.colno}`;

      if (SENTRY_DSN && errorObj) {
        Sentry.captureException(errorObj);
      }

      sendLogToBackend({
        source: 'FRONTEND_RUNTIME',
        level: 'error',
        message: msg,
        stack,
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const msg = reason?.message || (typeof reason === 'string' ? reason : '미처리 Promise 비동기 오류');
      const stack = reason?.stack || '';

      // 로그 전송 자체의 에러는 무시 (무한 루프 방지)
      if (msg.includes('/logs/error')) return;

      if (SENTRY_DSN) {
        Sentry.captureException(reason instanceof Error ? reason : new Error(msg));
      }

      sendLogToBackend({
        source: 'FRONTEND_PROMISE',
        level: 'error',
        message: msg,
        stack,
      });
    });

    // 3. 실제 사용자 체감 속도(RUM / Web Vitals: TTFB, FCP, LCP, Page Load) 측정
    collectWebVitals();
  }
}

function collectWebVitals() {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;

  let lcpValue: number | null = null;
  let fcpValue: number | null = null;
  let sent = false;

  try {
    if (typeof PerformanceObserver !== 'undefined') {
      // LCP(최대 콘텐츠 렌더링 시간) 감지
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          lcpValue = Math.round(last.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FCP(첫 화면 렌더링 시간) 감지
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            fcpValue = Math.round(entry.startTime);
          }
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    }
  } catch {
    // 일부 구형 모바일 브라우저에서는 특정 entryType 미지원 시 무시
  }

  const sendMetrics = () => {
    if (sent) return;
    sent = true;

    try {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const nav = navEntries && navEntries[0];
      const ttfbMs = nav ? Math.round(nav.responseStart - nav.requestStart) : null;
      const loadMs = nav && nav.loadEventEnd > 0
        ? Math.round(nav.loadEventEnd - nav.startTime)
        : Math.round(performance.now());

      fetch(`${getApiRootUrl()}/logs/perf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          ttfbMs: ttfbMs != null && ttfbMs >= 0 ? ttfbMs : null,
          fcpMs: fcpValue,
          lcpMs: lcpValue,
          loadMs: loadMs > 0 ? loadMs : null,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch {}
  };

  // 페이지 로드 완료 후 약 2.5초 뒤 측정 결과 전송
  window.addEventListener('load', () => {
    setTimeout(sendMetrics, 2500);
  });
}

/**
 * 수동 및 React ErrorBoundary 에러 보고
 */
export function captureAppError(error: any, context?: Record<string, any>) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(err);
    });
  }

  sendLogToBackend({
    source: 'FRONTEND_CRASH',
    level: 'fatal',
    message: err.message,
    stack: err.stack,
    extra: context,
  });
}

/**
 * API 호출 오류 및 성능 저하(Slow API) 감지 보고
 */
export function captureApiIssue(
  endpoint: string,
  status: number,
  message: string,
  durationMs: number
) {
  // 무한 루프 방지
  if (endpoint.includes('/logs/error')) return;

  const isSlowOnly = status >= 200 && status < 400 && durationMs >= 2000;
  const level = isSlowOnly ? 'warn' : 'error';
  const title = isSlowOnly
    ? `API 응답 지연 감지 (${durationMs}ms): ${endpoint}`
    : `API 오류 (${status}): ${endpoint} - ${message}`;

  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('endpoint', endpoint);
      scope.setTag('http_status', String(status));
      scope.setExtra('durationMs', durationMs);
      Sentry.captureMessage(title, isSlowOnly ? 'warning' : 'error');
    });
  }

  sendLogToBackend({
    source: isSlowOnly ? 'API_PERF' : 'API_ERROR',
    level,
    message: title,
    extra: { endpoint, status, durationMs, detail: message },
  });
}

/**
 * 로그인 사용자 정보 Sentry 컨텍스트 연동
 */
export function setMonitoringUser(userName: string, departmentName?: string) {
  if (SENTRY_DSN) {
    Sentry.setUser({
      username: userName,
      segment: departmentName || '',
    });
  }
}
