// 실무용 통합 실시간 관제 대시보드 (/monitor) HTML 생성기

export function renderMonitorDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>전도 캘린더 - 실시간 서비스 관제 대시보드</title>
  <style>
    :root {
      --bg: #0B1120;
      --card: #111827;
      --card-border: #1F2937;
      --text: #F9FAFB;
      --muted: #9CA3AF;
      --primary: #3B82F6;
      --green: #10B981;
      --yellow: #F59E0B;
      --red: #EF4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--card-border);
    }
    .title-group h1 { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .title-group p { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    button {
      background: #1F2937;
      color: var(--text);
      border: 1px solid #374151;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    button:hover { background: #374151; }
    button.primary { background: var(--primary); border-color: var(--primary); }
    button.primary:hover { background: #2563EB; }
    button.danger { background: rgba(239,68,68,0.15); color: #FCA5A5; border-color: rgba(239,68,68,0.4); }
    button.danger:hover { background: rgba(239,68,68,0.25); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
    }
    .stat-label { font-size: 12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-value { font-size: 24px; font-weight: 800; margin-top: 6px; display: flex; align-items: center; gap: 8px; }
    .stat-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge.up { background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.3); }
    .badge.down { background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.3); }
    .badge.fatal { background: rgba(239,68,68,0.2); color: #FCA5A5; }
    .badge.error { background: rgba(245,158,11,0.2); color: #FCD34D; }
    .badge.warn { background: rgba(59,130,246,0.2); color: #93C5FD; }
    .badge.device { background: #1F2937; color: #D1D5DB; border: 1px solid #374151; }

    .section {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .section-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .section-title { font-size: 15px; font-weight: 700; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th {
      background: #0F172A;
      color: var(--muted);
      font-weight: 600;
      padding: 10px 14px;
      border-bottom: 1px solid var(--card-border);
      white-space: nowrap;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--card-border);
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    .empty-state { padding: 36px; text-align: center; color: var(--muted); font-size: 14px; }
    pre.stack {
      margin-top: 6px;
      background: #030712;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 11px;
      color: #FCA5A5;
      overflow-x: auto;
      max-height: 140px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    details summary { cursor: pointer; color: #60A5FA; font-size: 12px; margin-top: 4px; }
    .pulse {
      width: 10px; height: 10px; border-radius: 50%; background: var(--green);
      box-shadow: 0 0 0 0 rgba(16,185,129,0.7);
      animation: pulse 2s infinite;
      display: inline-block;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
      100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-group">
        <h1><span class="pulse" id="statusDot"></span> 전도 캘린더 서비스 관제 센터</h1>
        <p id="lastUpdated">실시간 데이터 불러오는 중... (한국 표준시 KST)</p>
      </div>
      <div class="actions">
        <button onclick="toggleAutoRefresh()" id="autoBtn">자동 갱신: ON (30초)</button>
        <button class="primary" onclick="loadMonitorData()">지금 새로고침</button>
        <button onclick="sendTestError()">테스트 로그 전송</button>
        <button class="danger" onclick="clearErrorLogs()">에러 로그 비우기</button>
      </div>
    </header>

    <!-- 핵심 요약 카드 -->
    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">시스템 및 D1 DB 상태</div>
        <div class="stat-value" id="healthStatus">-</div>
        <div class="stat-sub" id="dbLatency">DB 응답속도: - ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">실시간 에러 건수</div>
        <div class="stat-value" id="errorCount">-</div>
        <div class="stat-sub">최근 500건 기준 보존</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">평균 체감 로딩 (LCP / FCP)</div>
        <div class="stat-value" id="perfAvg">-</div>
        <div class="stat-sub" id="perfSampleCount">측정 표본: - 건</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">데이터베이스 현황</div>
        <div class="stat-value" id="dataCounts">-</div>
        <div class="stat-sub" id="prayerCountSub">기도명단: - 명</div>
      </div>
    </div>

    <!-- 1. 에러 & 크래시 로그 -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">🚨 실시간 버그 / 크래시 / API 에러 로그</div>
        <span style="font-size: 12px; color: var(--muted);">Sentry + Cloudflare Observability 연동</span>
      </div>
      <div class="table-wrap" id="errorTableWrap">
        <div class="empty-state">불러오는 중...</div>
      </div>
    </div>

    <!-- 2. 사용자 체감 속도 (Web Vitals) -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">⚡ 모바일/웹 체감 로딩 속도 (Web Vitals RUM)</div>
        <span style="font-size: 12px; color: var(--muted);">단위: ms (1,000ms = 1초)</span>
      </div>
      <div class="table-wrap" id="perfTableWrap">
        <div class="empty-state">불러오는 중...</div>
      </div>
    </div>

    <!-- 3. 최근 일정 변경 감사 로그 -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">📝 최근 일정 활동 감사 로그 (Audit Trail)</div>
        <span style="font-size: 12px; color: var(--muted);">최근 20건</span>
      </div>
      <div class="table-wrap" id="auditTableWrap">
        <div class="empty-state">불러오는 중...</div>
      </div>
    </div>
  </div>

  <script>
    let autoRefresh = true;
    let timer = null;

    function detectDevice(ua) {
      if (!ua) return '기타';
      if (/iPhone|iPad|iPod/i.test(ua)) return '🍎 iOS';
      if (/Android/i.test(ua)) return '🤖 Android';
      return '💻 PC/Web';
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    async function loadMonitorData() {
      try {
        const res = await fetch('/api/v1/monitor/summary');
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        const d = json.data;

        document.getElementById('lastUpdated').textContent = '마지막 업데이트: ' + d.timestampKST + ' (KST)';

        // 1. 헬스 상태
        const healthEl = document.getElementById('healthStatus');
        const dotEl = document.getElementById('statusDot');
        if (d.health.status === 'UP') {
          healthEl.innerHTML = '<span class="badge up">정상 가동 (UP)</span>';
          dotEl.style.background = '#10B981';
        } else {
          healthEl.innerHTML = '<span class="badge down">장애 감지 (DOWN)</span>';
          dotEl.style.background = '#EF4444';
        }
        document.getElementById('dbLatency').textContent = 'D1 DB 왕복 응답: ' + d.health.dbLatencyMs + ' ms';

        // 2. 에러 건수
        const errCnt = d.health.errorLogsCount || 0;
        document.getElementById('errorCount').innerHTML = errCnt > 0
          ? '<span style="color:#F87171">' + errCnt + ' 건</span>'
          : '<span style="color:#34D399">0 건 (깨끗)</span>';

        // 3. 평균 웹 성능
        const avgLcp = d.perfStats.avgLcpMs ? Math.round(d.perfStats.avgLcpMs) + 'ms' : '-';
        const avgFcp = d.perfStats.avgFcpMs ? Math.round(d.perfStats.avgFcpMs) + 'ms' : '-';
        document.getElementById('perfAvg').textContent = avgLcp + ' / ' + avgFcp;
        document.getElementById('perfSampleCount').textContent = '수집 표본: ' + (d.perfStats.totalSamples || 0) + ' 건 (느림 3초↑: ' + (d.perfStats.slowSamples || 0) + '건)';

        // 4. 데이터 건수
        document.getElementById('dataCounts').textContent = (d.health.schedulesCount || 0) + ' 일정';
        document.getElementById('prayerCountSub').textContent = '등록된 전도 대상자: ' + (d.health.prayersCount || 0) + ' 명';

        // 에러 로그 테이블
        const errWrap = document.getElementById('errorTableWrap');
        if (!d.recentErrors || d.recentErrors.length === 0) {
          errWrap.innerHTML = '<div class="empty-state">✅ 최근 발생한 버그나 에러가 없습니다. 서비스가 매우 안정적으로 운영 중입니다.</div>';
        } else {
          let html = '<table><thead><tr><th>시간 (KST)</th><th>출처 / 등급</th><th>기기 / 사용자</th><th>오류 내용 및 상세</th></tr></thead><tbody>';
          for (const e of d.recentErrors) {
            const dev = detectDevice(e.user_agent);
            const lvlClass = e.level === 'fatal' ? 'fatal' : (e.level === 'warn' ? 'warn' : 'error');
            html += '<tr>'
              + '<td style="white-space:nowrap;color:var(--muted)">' + escapeHtml(e.created_at) + '</td>'
              + '<td style="white-space:nowrap"><span class="badge ' + lvlClass + '">' + escapeHtml(e.level.toUpperCase()) + '</span><div style="font-size:11px;color:var(--muted);margin-top:4px">' + escapeHtml(e.source) + '</div></td>'
              + '<td style="white-space:nowrap"><span class="badge device">' + dev + '</span><div style="font-size:12px;margin-top:4px">' + escapeHtml(e.user_name || '비로그인') + '</div></td>'
              + '<td><div style="font-weight:600">' + escapeHtml(e.message) + '</div>'
              + (e.url ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + escapeHtml(e.url) + '</div>' : '')
              + (e.stack || e.extra_json ? '<details><summary>스택 / 상세 정보 보기</summary><pre class="stack">' + escapeHtml((e.stack || '') + (e.extra_json ? '\\n[Extra] ' + e.extra_json : '')) + '</pre></details>' : '')
              + '</td></tr>';
          }
          html += '</tbody></table>';
          errWrap.innerHTML = html;
        }

        // 성능 테이블
        const perfWrap = document.getElementById('perfTableWrap');
        if (!d.recentPerfs || d.recentPerfs.length === 0) {
          perfWrap.innerHTML = '<div class="empty-state">아직 수집된 속도 측정 데이터가 없습니다. (사용자가 페이지 접속 시 자동 기록됩니다)</div>';
        } else {
          let pHtml = '<table><thead><tr><th>시간 (KST)</th><th>접속 기기</th><th>서버 응답 (TTFB)</th><th>초기 화면 (FCP)</th><th>메인 완료 (LCP)</th><th>전체 로드</th></tr></thead><tbody>';
          for (const p of d.recentPerfs) {
            const isSlow = (p.lcp_ms || 0) >= 3000 || (p.load_ms || 0) >= 4000;
            pHtml += '<tr>'
              + '<td style="white-space:nowrap;color:var(--muted)">' + escapeHtml(p.created_at) + '</td>'
              + '<td><span class="badge device">' + escapeHtml(p.device_type || detectDevice(p.user_agent)) + '</span></td>'
              + '<td>' + (p.ttfb_ms ?? '-') + ' ms</td>'
              + '<td>' + (p.fcp_ms ?? '-') + ' ms</td>'
              + '<td style="font-weight:700;color:' + (isSlow ? '#F87171' : '#34D399') + '">' + (p.lcp_ms ?? '-') + ' ms</td>'
              + '<td>' + (p.load_ms ?? '-') + ' ms</td>'
              + '</tr>';
          }
          pHtml += '</tbody></table>';
          perfWrap.innerHTML = pHtml;
        }

        // 감사 로그 테이블
        const auditWrap = document.getElementById('auditTableWrap');
        if (!d.recentAudits || d.recentAudits.length === 0) {
          auditWrap.innerHTML = '<div class="empty-state">최근 일정 변경 기록이 없습니다.</div>';
        } else {
          let aHtml = '<table><thead><tr><th>시간 (KST)</th><th>작업</th><th>작성/수정자</th><th>상세 내용</th></tr></thead><tbody>';
          for (const a of d.recentAudits) {
            aHtml += '<tr>'
              + '<td style="white-space:nowrap;color:var(--muted)">' + escapeHtml(a.created_at) + '</td>'
              + '<td><span class="badge device">' + escapeHtml(a.action_type) + '</span></td>'
              + '<td style="font-weight:600">' + escapeHtml(a.modifier_name) + '</td>'
              + '<td>' + escapeHtml(a.detail) + '</td>'
              + '</tr>';
          }
          aHtml += '</tbody></table>';
          auditWrap.innerHTML = aHtml;
        }
      } catch (err) {
        document.getElementById('lastUpdated').textContent = '데이터 로드 오류: ' + err.message;
      }
    }

    async function sendTestError() {
      await fetch('/api/v1/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'MONITOR_TEST',
          level: 'warn',
          message: '관제 센터 테스트 로그 (모니터링 & 웹훅 정상 동작 점검)',
          userName: '관리자',
          extra: { test: true }
        })
      });
      await loadMonitorData();
    }

    async function clearErrorLogs() {
      if (!confirm('저장된 에러 로그를 모두 초기화할까요?')) return;
      await fetch('/api/v1/logs/error', { method: 'DELETE' });
      await loadMonitorData();
    }

    function toggleAutoRefresh() {
      autoRefresh = !autoRefresh;
      document.getElementById('autoBtn').textContent = autoRefresh ? '자동 갱신: ON (30초)' : '자동 갱신: OFF';
    }

    loadMonitorData();
    timer = setInterval(() => {
      if (autoRefresh) loadMonitorData();
    }, 30000);
  </script>
</body>
</html>`;
}
