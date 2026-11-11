// 실무용 통합 실시간 관제 대시보드 (/monitor) HTML 생성기

export function renderMonitorDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>전도 캘린더 - 통합 실시간 관제 대시보드</title>
  <style>
    :root {
      --bg: #0B1120;
      --card: #111827;
      --card-hover: #172033;
      --card-border: #1F2937;
      --text: #F9FAFB;
      --muted: #9CA3AF;
      --primary: #3B82F6;
      --green: #10B981;
      --yellow: #F59E0B;
      --red: #EF4444;
      --purple: #8B5CF6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Pretendard Variable", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 20px;
    }
    .container { max-width: 1240px; margin: 0 auto; }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--card-border);
    }
    .title-group h1 { font-size: 21px; font-weight: 800; display: flex; align-items: center; gap: 10px; }
    .title-group p { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    button, a.btn {
      background: #1F2937;
      color: var(--text);
      border: 1px solid #374151;
      padding: 8px 13px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    button:hover, a.btn:hover { background: #374151; }
    button.primary { background: var(--primary); border-color: var(--primary); }
    button.primary:hover { background: #2563EB; }
    button.danger { background: rgba(239,68,68,0.15); color: #FCA5A5; border-color: rgba(239,68,68,0.4); }
    button.danger:hover { background: rgba(239,68,68,0.25); }

    /* 연동 파이프라인 상태 바 */
    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }
    .pipe-card {
      background: rgba(17, 24, 39, 0.85);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 11px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .pipe-name { font-size: 13px; font-weight: 700; color: #E5E7EB; }
    .pipe-desc { font-size: 11px; color: var(--muted); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
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

    /* 탭 네비게이션 */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: var(--card);
      border: 1px solid var(--card-border);
      color: var(--muted);
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
    }
    .tab-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #FFFFFF;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge.up { background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.3); }
    .badge.down { background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.3); }
    .badge.standby { background: rgba(156,163,175,0.15); color: #D1D5DB; border: 1px solid rgba(156,163,175,0.3); }
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
      gap: 10px;
    }
    .section-title { font-size: 15px; font-weight: 700; }
    .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .filter-input {
      background: #0F172A;
      border: 1px solid #374151;
      color: var(--text);
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      outline: none;
    }
    .filter-pill { padding: 4px 10px; font-size: 11px; border-radius: 9999px; }
    .filter-pill.active { background: #2563EB; border-color: #2563EB; color: #fff; }

    /* 기기별 성능 바 차트 */
    .chart-box { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
    .bar-row { display: flex; align-items: center; gap: 12px; }
    .bar-label { width: 100px; font-size: 13px; font-weight: 700; flex-shrink: 0; }
    .bar-track { flex: 1; height: 14px; background: #0F172A; border-radius: 9999px; overflow: hidden; border: 1px solid #1F2937; }
    .bar-fill { height: 100%; border-radius: 9999px; transition: width 0.4s ease; }
    .bar-val { width: 140px; text-align: right; font-size: 12px; color: var(--muted); flex-shrink: 0; }

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
    td { padding: 12px 14px; border-bottom: 1px solid var(--card-border); vertical-align: top; }
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
    .auth-gate {
      position: fixed; inset: 0; background: #0B1120; display: flex;
      align-items: center; justify-content: center; padding: 20px; z-index: 9999;
    }
    .auth-card {
      background: #111827; border: 1px solid #1F2937; border-radius: 16px;
      padding: 28px; width: 100%; max-width: 380px; text-align: center;
    }
    .auth-card h2 { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
    .auth-card p { font-size: 13px; color: var(--muted); margin-bottom: 18px; }
    .auth-card input {
      width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid #374151;
      background: #0F172A; color: #fff; font-size: 14px; margin-bottom: 12px; outline: none;
    }
    .auth-err { color: #F87171; font-size: 12px; margin-bottom: 10px; min-height: 18px; }
  </style>
</head>
<body>
  <!-- 관리자 본인 확인 잠금 화면 ('권진호' 전용) -->
  <div id="authGate" class="auth-gate" style="display:none;">
    <div class="auth-card">
      <div style="font-size:32px;margin-bottom:10px;">🔐</div>
      <h2>관제 센터 접근 제한</h2>
      <p>이 페이지는 관리자(<strong>권진호</strong>) 전용입니다.<br/>본인 이름을 입력해 주세요.</p>
      <input id="adminNameInput" type="text" placeholder="이름을 입력하세요" onkeydown="if(event.key==='Enter') verifyAdmin()" />
      <div id="authErrMsg" class="auth-err"></div>
      <button class="primary" style="width:100%;justify-content:center;padding:11px;" onclick="verifyAdmin()">관제 센터 입장</button>
      <a href="/" class="btn" style="width:100%;justify-content:center;margin-top:10px;">📅 캘린더 홈으로 돌아가기</a>
    </div>
  </div>

  <div class="container" id="mainContainer" style="display:none;">
    <header>
      <div class="title-group">
        <h1><span class="pulse" id="statusDot"></span> 전도 캘린더 통합 관제 센터</h1>
        <p id="lastUpdated">실시간 데이터 동기화 중... (한국 표준시 KST)</p>
      </div>
      <div class="actions">
        <a href="/" class="btn">📅 캘린더 홈</a>
        <button onclick="toggleAutoRefresh()" id="autoBtn">자동 갱신: ON (30초)</button>
        <button class="primary" onclick="loadMonitorData()">새로고침</button>
        <button onclick="sendTestError()">테스트 진단</button>
        <button class="danger" onclick="clearErrorLogs()">에러 비우기</button>
      </div>
    </header>

    <!-- 4대 모니터링 연동 현황 -->
    <div class="pipeline-grid">
      <div class="pipe-card">
        <div>
          <div class="pipe-name">Cloudflare Observability</div>
          <div class="pipe-desc">Workers 요청 & 예외 100% 수집</div>
        </div>
        <span class="badge up">활성</span>
      </div>
      <div class="pipe-card">
        <div>
          <div class="pipe-name">Sentry + Web Vitals RUM</div>
          <div class="pipe-desc">프론트 크래시 & 로딩 속도 측정</div>
        </div>
        <span class="badge up">활성</span>
      </div>
      <div class="pipe-card">
        <div>
          <div class="pipe-name">D1 Health & Audit</div>
          <div class="pipe-desc">DB 응답속도 및 변경 이력 추적</div>
        </div>
        <span class="badge up" id="pipeD1Badge">정상</span>
      </div>
      <div class="pipe-card">
        <div>
          <div class="pipe-name">Discord / Slack 웹훅</div>
          <div class="pipe-desc">치명적 오류 즉시 푸시 알림</div>
        </div>
        <span class="badge standby" id="pipeWebhookBadge">확인 중</span>
      </div>
    </div>

    <!-- 핵심 요약 카드 -->
    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">시스템 및 D1 DB 상태</div>
        <div class="stat-value" id="healthStatus">-</div>
        <div class="stat-sub" id="dbLatency">DB 왕복 응답: - ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">실시간 에러 건수</div>
        <div class="stat-value" id="errorCount">-</div>
        <div class="stat-sub" id="errorBreakdown">Fatal 0 · Error 0 · Warn 0</div>
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

    <!-- 탭 메뉴 -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('all', this)">전체 보기</button>
      <button class="tab-btn" onclick="switchTab('errors', this)">🚨 에러 로그</button>
      <button class="tab-btn" onclick="switchTab('perf', this)">⚡ 체감 속도</button>
      <button class="tab-btn" onclick="switchTab('audits', this)">📝 활동 감사 로그</button>
    </div>

    <!-- 기기별 체감 속도 비교 차트 -->
    <div class="section" id="secDeviceChart">
      <div class="section-header">
        <div class="section-title">📱 기기별 평균 화면 로딩 속도 비교 (LCP 기준)</div>
        <span style="font-size: 12px; color: var(--muted);">녹색 2.5초↓(쾌적) · 주황 3.0초↓(보통) · 빨강 3.0초↑(지연)</span>
      </div>
      <div class="chart-box" id="deviceChartBox">
        <div class="empty-state">기기별 성능 데이터 수집 대기 중...</div>
      </div>
    </div>

    <!-- 1. 에러 & 크래시 로그 -->
    <div class="section" id="secErrors">
      <div class="section-header">
        <div class="section-title">🚨 실시간 버그 / 크래시 / API 에러 로그</div>
        <div class="filter-bar">
          <button class="filter-pill active" onclick="setLevelFilter('ALL', this)">전체</button>
          <button class="filter-pill" onclick="setLevelFilter('fatal', this)">FATAL</button>
          <button class="filter-pill" onclick="setLevelFilter('error', this)">ERROR</button>
          <button class="filter-pill" onclick="setLevelFilter('warn', this)">WARN</button>
          <input class="filter-input" id="errSearch" placeholder="메시지/사용자 검색..." oninput="renderErrorTable()" />
        </div>
      </div>
      <div class="table-wrap" id="errorTableWrap">
        <div class="empty-state">불러오는 중...</div>
      </div>
    </div>

    <!-- 2. 사용자 체감 속도 (Web Vitals) -->
    <div class="section" id="secPerf">
      <div class="section-header">
        <div class="section-title">⚡ 모바일/웹 체감 로딩 상세 기록 (Web Vitals RUM)</div>
        <span style="font-size: 12px; color: var(--muted);">단위: ms (1,000ms = 1초)</span>
      </div>
      <div class="table-wrap" id="perfTableWrap">
        <div class="empty-state">불러오는 중...</div>
      </div>
    </div>

    <!-- 3. 전 기능 통합 활동 감사 로그 -->
    <div class="section" id="secAudits">
      <div class="section-header">
        <div class="section-title">📝 전 기능 활동 감사 로그 (일정 · 댓글 · 기도명단 · 접속)</div>
        <div class="filter-bar">
          <button class="filter-pill audit-pill active" onclick="setAuditFilter('ALL', this)">전체</button>
          <button class="filter-pill audit-pill" onclick="setAuditFilter('SCHEDULE', this)">📅 일정</button>
          <button class="filter-pill audit-pill" onclick="setAuditFilter('COMMENT', this)">💬 댓글</button>
          <button class="filter-pill audit-pill" onclick="setAuditFilter('PRAYER', this)">🙏 기도명단</button>
          <button class="filter-pill audit-pill" onclick="setAuditFilter('AUTH', this)">🔐 접속</button>
        </div>
      </div>
      <div class="table-wrap" id="auditTableWrap">
        <div class="empty-state">불러오는 중...</div>
      </div>
    </div>
  </div>

  <script>
    let autoRefresh = true;
    let timer = null;
    let currentData = null;
    let levelFilter = 'ALL';
    let auditFilter = 'ALL';
    let currentTab = 'all';

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

    function switchTab(tab, btn) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      document.getElementById('secDeviceChart').style.display = (tab === 'all' || tab === 'perf') ? 'block' : 'none';
      document.getElementById('secErrors').style.display = (tab === 'all' || tab === 'errors') ? 'block' : 'none';
      document.getElementById('secPerf').style.display = (tab === 'all' || tab === 'perf') ? 'block' : 'none';
      document.getElementById('secAudits').style.display = (tab === 'all' || tab === 'audits') ? 'block' : 'none';
    }

    function setLevelFilter(lvl, btn) {
      levelFilter = lvl;
      document.querySelectorAll('.filter-pill:not(.audit-pill)').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderErrorTable();
    }

    function setAuditFilter(cat, btn) {
      auditFilter = cat;
      document.querySelectorAll('.audit-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderAuditTable();
    }

    function getCategoryLabel(cat) {
      if (cat === 'SCHEDULE') return '📅 일정';
      if (cat === 'COMMENT') return '💬 댓글';
      if (cat === 'PRAYER') return '🙏 기도명단';
      if (cat === 'AUTH') return '🔐 접속';
      return '📝 기타';
    }

    function renderAuditTable() {
      if (!currentData) return;
      const auditWrap = document.getElementById('auditTableWrap');
      const list = (currentData.recentAudits || []).filter(a => {
        if (auditFilter === 'ALL') return true;
        return (a.category || 'SCHEDULE') === auditFilter;
      });
      if (list.length === 0) {
        auditWrap.innerHTML = '<div class="empty-state">해당 카테고리의 활동 기록이 없습니다.</div>';
        return;
      }
      let aHtml = '<table><thead><tr><th>시간 (KST)</th><th>기능 / 작업</th><th>사용자 (부서)</th><th>상세 내용</th></tr></thead><tbody>';
      for (const a of list) {
        const actor = a.actor_name || a.modifier_name || '-';
        const dept = a.department_name ? ' (' + escapeHtml(a.department_name) + ')' : '';
        aHtml += '<tr>'
          + '<td style="white-space:nowrap;color:var(--muted)">' + escapeHtml(a.created_at) + '</td>'
          + '<td style="white-space:nowrap"><span class="badge device">' + getCategoryLabel(a.category) + '</span> <span style="font-size:11px;color:var(--muted)">' + escapeHtml(a.action_type) + '</span></td>'
          + '<td style="font-weight:600;white-space:nowrap">' + escapeHtml(actor) + dept + '</td>'
          + '<td>' + escapeHtml(a.detail) + '</td>'
          + '</tr>';
      }
      aHtml += '</tbody></table>';
      auditWrap.innerHTML = aHtml;
    }

    function renderErrorTable() {
      if (!currentData) return;
      const errWrap = document.getElementById('errorTableWrap');
      const query = (document.getElementById('errSearch').value || '').trim().toLowerCase();
      const filtered = (currentData.recentErrors || []).filter(e => {
        if (levelFilter !== 'ALL' && (e.level || '').toLowerCase() !== levelFilter) return false;
        if (query) {
          const target = ((e.message || '') + ' ' + (e.user_name || '') + ' ' + (e.source || '')).toLowerCase();
          if (!target.includes(query)) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        errWrap.innerHTML = '<div class="empty-state">✅ 해당하는 에러/장애 기록이 없습니다.</div>';
        return;
      }

      let html = '<table><thead><tr><th>시간 (KST)</th><th>출처 / 등급</th><th>기기 / 사용자</th><th>오류 내용 및 상세</th></tr></thead><tbody>';
      for (const e of filtered) {
        const dev = detectDevice(e.user_agent);
        const lvlClass = e.level === 'fatal' ? 'fatal' : (e.level === 'warn' ? 'warn' : 'error');
        html += '<tr>'
          + '<td style="white-space:nowrap;color:var(--muted)">' + escapeHtml(e.created_at) + '</td>'
          + '<td style="white-space:nowrap"><span class="badge ' + lvlClass + '">' + escapeHtml((e.level || '').toUpperCase()) + '</span><div style="font-size:11px;color:var(--muted);margin-top:4px">' + escapeHtml(e.source) + '</div></td>'
          + '<td style="white-space:nowrap"><span class="badge device">' + dev + '</span><div style="font-size:12px;margin-top:4px">' + escapeHtml(e.user_name || '비로그인') + '</div></td>'
          + '<td><div style="font-weight:600">' + escapeHtml(e.message) + '</div>'
          + (e.url ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + escapeHtml(e.url) + '</div>' : '')
          + (e.stack || e.extra_json ? '<details><summary>스택 / 상세 정보 보기</summary><pre class="stack">' + escapeHtml((e.stack || '') + (e.extra_json ? '\\n[Extra] ' + e.extra_json : '')) + '</pre></details>' : '')
          + '</td></tr>';
      }
      html += '</tbody></table>';
      errWrap.innerHTML = html;
    }

    let verifiedAdminName = '';

    function getStoredUserName() {
      try {
        const raw = localStorage.getItem('CALENDAR_USER_SESSION');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.userName) return String(parsed.userName).trim();
        }
      } catch {}
      try {
        const savedAdmin = sessionStorage.getItem('MONITOR_ADMIN_USER');
        if (savedAdmin) return savedAdmin.trim();
      } catch {}
      return '';
    }

    function checkAuthAndBoot() {
      const name = getStoredUserName();
      if (name === '권진호') {
        verifiedAdminName = '권진호';
        document.getElementById('authGate').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        loadMonitorData();
      } else {
        document.getElementById('authGate').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
      }
    }

    function verifyAdmin() {
      const input = (document.getElementById('adminNameInput').value || '').trim();
      const errEl = document.getElementById('authErrMsg');
      if (input !== '권진호') {
        errEl.textContent = "접근 권한이 없습니다. ('권진호' 관리자 전용)";
        return;
      }
      errEl.textContent = '';
      verifiedAdminName = '권진호';
      try { sessionStorage.setItem('MONITOR_ADMIN_USER', '권진호'); } catch {}
      document.getElementById('authGate').style.display = 'none';
      document.getElementById('mainContainer').style.display = 'block';
      loadMonitorData();
    }

    async function loadMonitorData() {
      if (verifiedAdminName !== '권진호') return;
      try {
        const res = await fetch('/api/v1/monitor/summary', {
          headers: { 'X-Admin-User': encodeURIComponent(verifiedAdminName) }
        });
        const json = await res.json();
        if (res.status === 403 || !json.success) {
          if (res.status === 403) {
            verifiedAdminName = '';
            document.getElementById('authGate').style.display = 'flex';
            document.getElementById('mainContainer').style.display = 'none';
          }
          throw new Error(json.message);
        }
        const d = json.data;
        currentData = d;

        document.getElementById('lastUpdated').textContent = '마지막 업데이트: ' + d.timestampKST + ' (KST)';

        // 연동 배지 업데이트
        const whBadge = document.getElementById('pipeWebhookBadge');
        if (d.integrations && d.integrations.webhookConfigured) {
          whBadge.className = 'badge up';
          whBadge.textContent = '연동됨';
        } else {
          whBadge.className = 'badge standby';
          whBadge.textContent = '미설정(선택)';
        }

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

        // 2. 에러 건수 & 등급 분포
        const errCnt = d.health.errorLogsCount || 0;
        document.getElementById('errorCount').innerHTML = errCnt > 0
          ? '<span style="color:#F87171">' + errCnt + ' 건</span>'
          : '<span style="color:#34D399">0 건 (깨끗)</span>';

        const lvlMap = { fatal: 0, error: 0, warn: 0 };
        (d.errorByLevel || []).forEach(r => { lvlMap[r.level] = r.count; });
        document.getElementById('errorBreakdown').textContent = 'Fatal ' + (lvlMap.fatal || 0) + ' · Error ' + (lvlMap.error || 0) + ' · Warn ' + (lvlMap.warn || 0);

        // 3. 평균 웹 성능
        const avgLcp = d.perfStats.avgLcpMs ? Math.round(d.perfStats.avgLcpMs) + 'ms' : '-';
        const avgFcp = d.perfStats.avgFcpMs ? Math.round(d.perfStats.avgFcpMs) + 'ms' : '-';
        document.getElementById('perfAvg').textContent = avgLcp + ' / ' + avgFcp;
        document.getElementById('perfSampleCount').textContent = '수집 표본: ' + (d.perfStats.totalSamples || 0) + ' 건 (느림 3초↑: ' + (d.perfStats.slowSamples || 0) + '건)';

        // 4. 데이터 건수
        document.getElementById('dataCounts').textContent = (d.health.schedulesCount || 0) + ' 일정';
        document.getElementById('prayerCountSub').textContent = '등록된 전도 대상자: ' + (d.health.prayersCount || 0) + ' 명';

        // 기기별 성능 바 차트
        const chartBox = document.getElementById('deviceChartBox');
        if (!d.perfByDevice || d.perfByDevice.length === 0) {
          chartBox.innerHTML = '<div class="empty-state">아직 기기별 성능 표본이 수집되지 않았습니다. 앱 메인 페이지를 열면 자동 측정됩니다.</div>';
        } else {
          let cHtml = '';
          const maxMs = Math.max(3500, ...d.perfByDevice.map(item => Math.round(item.avgLcpMs || item.avgFcpMs || 500)));
          for (const item of d.perfByDevice) {
            const ms = Math.round(item.avgLcpMs || item.avgFcpMs || 0);
            const pct = Math.min(100, Math.max(5, Math.round((ms / maxMs) * 100)));
            const color = ms >= 3000 ? '#EF4444' : (ms >= 2000 ? '#F59E0B' : '#10B981');
            cHtml += '<div class="bar-row">'
              + '<div class="bar-label">' + escapeHtml(item.deviceType) + '</div>'
              + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>'
              + '<div class="bar-val">' + ms + ' ms (' + item.count + '건)</div>'
              + '</div>';
          }
          chartBox.innerHTML = cHtml;
        }

        // 에러 로그 테이블 렌더링
        renderErrorTable();

        // 성능 테이블
        const perfWrap = document.getElementById('perfTableWrap');
        if (!d.recentPerfs || d.recentPerfs.length === 0) {
          perfWrap.innerHTML = '<div class="empty-state">아직 수집된 속도 측정 데이터가 없습니다.</div>';
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

        // 통합 활동 감사 로그 렌더링
        renderAuditTable();
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
          message: '관제 센터 테스트 진단 로그 (모니터링 & 웹훅 정상 동작 확인)',
          userName: '권진호',
          extra: { test: true }
        })
      });
      await loadMonitorData();
    }

    async function clearErrorLogs() {
      if (!confirm('저장된 에러 로그를 모두 초기화할까요?')) return;
      await fetch('/api/v1/logs/error', {
        method: 'DELETE',
        headers: { 'X-Admin-User': encodeURIComponent(verifiedAdminName) }
      });
      await loadMonitorData();
    }

    function toggleAutoRefresh() {
      autoRefresh = !autoRefresh;
      document.getElementById('autoBtn').textContent = autoRefresh ? '자동 갱신: ON (30초)' : '자동 갱신: OFF';
    }

    checkAuthAndBoot();
    timer = setInterval(() => {
      if (autoRefresh && verifiedAdminName === '권진호') loadMonitorData();
    }, 30000);
  </script>
</body>
</html>`;
}
