// Cloudflare Full-Stack Worker (Frontend Static Assets + D1 Database API)
import { PRAYER_TARGETS } from './frontend/src/data/prayerData';
import { renderMonitorDashboardHtml } from './monitorDashboard';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ALERT_WEBHOOK_URL?: string;
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-User',
    },
  });
}

// 관제 센터 관리자('권진호') 전용 접근 권한 검증
function isAuthorizedMonitorUser(request: Request, url: URL): boolean {
  const headerUser = request.headers.get('X-Admin-User') || '';
  const queryUser = url.searchParams.get('userName') || '';
  let decodedHeader = '';
  try {
    decodedHeader = decodeURIComponent(headerUser).trim();
  } catch {
    decodedHeader = headerUser.trim();
  }
  return decodedHeader === '권진호' || queryUser.trim() === '권진호';
}

function ok(data: any, message?: string) {
  return jsonResponse({
    success: true,
    data,
    message: message || null,
  });
}

function err(message: string, status = 400) {
  return jsonResponse(
    {
      success: false,
      data: null,
      message,
    },
    status
  );
}

let schemaInitialized = false;
async function ensureSchema(db: D1Database) {
  if (schemaInitialized) return;

  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL,
        category TEXT NOT NULL DEFAULT 'CUSTOM',
        title TEXT NOT NULL,
        author_name TEXT NOT NULL,
        target_name TEXT,
        schedule_date TEXT NOT NULL,
        end_date TEXT,
        start_time TEXT,
        end_time TEXT,
        color TEXT NOT NULL DEFAULT '#3B82F6',
        memo TEXT,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS schedule_histories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        department_id INTEGER NOT NULL,
        modifier_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS prayers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department TEXT NOT NULL,
        leader TEXT NOT NULL,
        target TEXT NOT NULL,
        relationship TEXT,
        age TEXT,
        is_rally INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_name TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        schedule_id INTEGER NOT NULL,
        schedule_title TEXT NOT NULL,
        comment_content TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        url TEXT,
        user_agent TEXT,
        user_name TEXT,
        extra_json TEXT,
        created_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS perf_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_type TEXT NOT NULL,
        user_agent TEXT,
        ttfb_ms INTEGER,
        fcp_ms INTEGER,
        lcp_ms INTEGER,
        load_ms INTEGER,
        url TEXT,
        created_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        action_type TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        department_name TEXT,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `),
  ]);

  // 기존 일정 히스토리를 통합 activity_logs에 초기 1회 마이그레이션
  try {
    const actCnt: any = await db.prepare('SELECT COUNT(*) as cnt FROM activity_logs').first();
    if (actCnt && actCnt.cnt === 0) {
      await db.prepare(`
        INSERT INTO activity_logs (category, action_type, actor_name, department_name, detail, created_at)
        SELECT 'SCHEDULE', sh.action_type, sh.modifier_name, COALESCE(d.name, ''), COALESCE(sh.detail, ''), sh.created_at
        FROM schedule_histories sh
        LEFT JOIN departments d ON sh.department_id = d.id
        ORDER BY sh.id DESC LIMIT 50
      `).run();
    }
  } catch (_) {}

  await db.prepare(`
    INSERT OR IGNORE INTO departments (name, sort_order) VALUES 
      ('언약부', 1),
      ('밀알부', 2),
      ('이레부', 3)
  `).run();

  // 11월 대집회 (2026-11-23 ~ 2026-11-29) 중복 제거 및 단 1개만 공통 등록 (department_id = 0)
  const rallyRows: any = await db.prepare("SELECT id FROM schedules WHERE title LIKE '%대집회%' ORDER BY id ASC").all();
  const list = rallyRows.results || [];
  const kstNow = nowKST();

  if (list.length === 0) {
    await db.prepare(`
      INSERT INTO schedules (
        department_id, category, title, author_name, target_name,
        schedule_date, end_date, color, memo, created_by, updated_by, created_at, updated_at
      ) VALUES (0, 'RALLY', '📢 11월 대집회', '교회', '전체 성도', '2026-11-23', '2026-11-29', '#E53E3E', '2026 하반기 말씀 대집회', '교회', '교회', ?, ?)
    `).bind(kstNow, kstNow).run();
  } else if (list.length > 1) {
    // 1개만 남기고 나머지 중복 삭제
    const firstId = list[0].id;
    await db.prepare("DELETE FROM schedules WHERE title LIKE '%대집회%' AND id != ?").bind(firstId).run();
    await db.prepare("UPDATE schedules SET department_id = 0 WHERE id = ?").bind(firstId).run();
  } else if (list.length === 1) {
    await db.prepare("UPDATE schedules SET department_id = 0 WHERE id = ?").bind(list[0].id).run();
  }

  // 기본 기도 대상자 167건 동기화 및 영구 보존 (없는 대상자만 안전하게 추가)
  try {
    const existingPrayers: any = await db.prepare("SELECT department, leader, target FROM prayers").all();
    const existingSet = new Set<string>();
    for (const row of (existingPrayers.results || [])) {
      existingSet.add(`${(row.department || '').trim()}_${(row.leader || '').trim()}_${(row.target || '').trim()}`);
    }

    const missingPrayers = PRAYER_TARGETS.filter(p => {
      const key = `${(p.department || '').trim()}_${(p.leader || '').trim()}_${(p.target || '').trim()}`;
      return !existingSet.has(key);
    });

    if (missingPrayers.length > 0) {
      const batchStmts = missingPrayers.map(p =>
        db.prepare(`
          INSERT INTO prayers (department, leader, target, relationship, age, is_rally, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          p.department,
          p.leader,
          p.target,
          p.relationship || '',
          p.age || '',
          p.isRally ? 1 : 0,
          kstNow,
          kstNow
        )
      );

      // Cloudflare D1 배치 실행 (50개 단위)
      for (let i = 0; i < batchStmts.length; i += 50) {
        await db.batch(batchStmts.slice(i, i + 50));
      }
    }
  } catch (prayerSeedErr) {
    console.error('기도 명단 시딩 중 오류 (계속 진행):', prayerSeedErr);
  }

  schemaInitialized = true;
}

function getKSTDate(): Date {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000);
}

function nowKST() {
  const kst = getKSTDate();
  return kst.toISOString().replace('T', ' ').substring(0, 19);
}

// Discord / Slack 실시간 장애 알림 웹훅 발송 (비동기)
function sendAlertWebhook(
  env: Env,
  ctx: ExecutionContext | undefined,
  title: string,
  detail: string
) {
  const webhookUrl = env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const text = `🚨 **[전도 캘린더 장애 감지]** (${nowKST()} KST)\n**${title}**\n\`\`\`\n${detail.slice(0, 1200)}\n\`\`\``;
  const promise = fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Discord(content) & Slack(text) 모두 호환되도록 동시 포함
    body: JSON.stringify({ content: text, text }),
  }).catch(() => {});

  if (ctx) {
    ctx.waitUntil(promise);
  }
}

// 전 기능 통합 활동 감사 로그 기록 헬퍼 (로그인/일정/댓글/기도명단 등)
async function recordActivity(
  db: D1Database,
  category: 'AUTH' | 'SCHEDULE' | 'COMMENT' | 'PRAYER' | 'NOTIFICATION',
  actionType: string,
  actorName: string,
  departmentName: string,
  detail: string,
  createdAt?: string
) {
  try {
    const nowStr = createdAt || nowKST();
    await db.prepare(`
      INSERT INTO activity_logs (category, action_type, actor_name, department_name, detail, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      category,
      actionType,
      (actorName || '사용자').slice(0, 100),
      (departmentName || '').slice(0, 50),
      (detail || '').slice(0, 500),
      nowStr
    ).run();

    // 최근 500건만 유지하여 D1 용량 최적화
    await db.prepare(`
      DELETE FROM activity_logs WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY id DESC LIMIT 500)
    `).run().catch(() => {});
  } catch (e) {
    console.warn('활동 로그 기록 중 경고:', e);
  }
}

async function handleApiRequest(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-User',
      },
    });
  }

  if (!env.DB) {
    return err('Cloudflare D1 데이터베이스가 아직 연결되지 않았습니다. Cloudflare 설정에서 D1 바인딩을 추가해 주세요.', 500);
  }

  try {
    await ensureSchema(env.DB);

    // 1. 부서 및 로그인
    if (method === 'GET' && path === '/api/v1/departments') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, sort_order as sortOrder FROM departments ORDER BY sort_order ASC, id ASC'
      ).all();
      return ok(results || []);
    }

    if (method === 'POST' && path === '/api/v1/auth/simple-login') {
      const body: any = await request.json();
      const departmentId = Number(body.departmentId);
      const userName = (body.userName || '').trim();

      if (!userName) return err('이름을 입력해 주세요.');

      if (departmentId === 0) {
        const loginAt = nowKST();
        await recordActivity(env.DB, 'AUTH', 'LOGIN', userName, '전체 부서', '서비스 입장 (전체 부서 보기)', loginAt);
        return ok({
          departmentId: 0,
          departmentName: '전체 부서',
          userName,
          loginAt,
        }, '성공적으로 입장하였습니다.');
      }

      const dept: any = await env.DB.prepare('SELECT id, name FROM departments WHERE id = ?').bind(departmentId).first();
      if (!dept) return err('존재하지 않는 부서입니다.');

      const loginAt = nowKST();
      await recordActivity(env.DB, 'AUTH', 'LOGIN', userName, dept.name, `${dept.name} 소속으로 입장 (로그인)`, loginAt);
      return ok({
        departmentId: dept.id,
        departmentName: dept.name,
        userName,
        loginAt,
      }, '성공적으로 입장하였습니다.');
    }

    // 2. 일정 관리 (Schedules)
    const monthlyMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/schedules$/);
    if (monthlyMatch) {
      const departmentId = Number(monthlyMatch[1]);

      if (method === 'GET') {
        const yearParam = url.searchParams.get('year');
        const monthParam = url.searchParams.get('month');
        const now = getKSTDate();
        const year = yearParam ? Number(yearParam) : now.getFullYear();
        const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
        const monthStr = month < 10 ? `0${month}` : `${month}`;
        const prefix = `${year}-${monthStr}`;

        let query = `
          SELECT s.*, d.name as departmentName 
          FROM schedules s
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE (s.schedule_date LIKE ? OR (s.end_date IS NOT NULL AND s.end_date LIKE ?))
        `;
        const params: any[] = [`${prefix}%`, `${prefix}%`];

        if (departmentId > 0) {
          query += ` AND (s.department_id = ? OR s.department_id = 0)`;
          params.push(departmentId);
        }
        query += ` ORDER BY s.schedule_date ASC, s.start_time ASC`;

        const { results } = await env.DB.prepare(query).bind(...params).all();
        const mapped = (results || []).map((r: any) => ({
          id: r.id,
          departmentId: r.department_id,
          departmentName: r.departmentName || '',
          category: r.category,
          title: r.title,
          authorName: r.author_name,
          targetName: r.target_name || '',
          scheduleDate: r.schedule_date,
          endDate: r.end_date || r.schedule_date,
          startTime: r.start_time,
          endTime: r.end_time,
          color: r.color,
          memo: r.memo,
          createdBy: r.created_by,
          updatedBy: r.updated_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        return ok(mapped);
      }

      if (method === 'POST') {
        const body: any = await request.json();
        const nowStr = nowKST();
        const targetDeptId = departmentId > 0 ? departmentId : (body.departmentId || 1);

        const dept: any = await env.DB.prepare('SELECT name FROM departments WHERE id = ?').bind(targetDeptId).first();
        const deptName = dept ? dept.name : '';

        const res = await env.DB.prepare(`
          INSERT INTO schedules (
            department_id, category, title, author_name, target_name,
            schedule_date, end_date, start_time, end_time, color, memo,
            created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          targetDeptId,
          body.category || 'CUSTOM',
          body.title,
          body.authorName,
          body.targetName || '',
          body.scheduleDate,
          body.endDate || body.scheduleDate,
          body.startTime || null,
          body.endTime || null,
          body.color || '#3B82F6',
          body.memo || '',
          body.authorName,
          body.authorName,
          nowStr,
          nowStr
        ).run();

        const newId = res.meta.last_row_id;

        await env.DB.prepare(`
          INSERT INTO schedule_histories (schedule_id, department_id, modifier_name, action_type, detail, created_at)
          VALUES (?, ?, ?, 'CREATE', ?, ?)
        `).bind(newId, targetDeptId, body.authorName, `'${body.title}' 일정을 등록했습니다.`, nowStr).run();

        await recordActivity(
          env.DB,
          'SCHEDULE',
          'CREATE',
          body.authorName,
          deptName,
          `'${body.title}' 일정 등록 (${body.scheduleDate}${body.targetName ? ` · 대상: ${body.targetName}` : ''})`,
          nowStr
        );

        return ok({
          id: newId,
          departmentId: targetDeptId,
          departmentName: deptName,
          category: body.category || 'CUSTOM',
          title: body.title,
          authorName: body.authorName,
          targetName: body.targetName || '',
          scheduleDate: body.scheduleDate,
          endDate: body.endDate || body.scheduleDate,
          startTime: body.startTime,
          endTime: body.endTime,
          color: body.color || '#3B82F6',
          memo: body.memo,
          createdBy: body.authorName,
          updatedBy: body.authorName,
          createdAt: nowStr,
          updatedAt: nowStr,
        }, '일정이 성공적으로 등록되었습니다.');
      }
    }

    // 주간 타임라인
    const timelineMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/schedules\/timeline$/);
    if (method === 'GET' && timelineMatch) {
      const year = Number(url.searchParams.get('year') || getKSTDate().getFullYear());
      const week = Number(url.searchParams.get('week') || 1);
      return ok({
        year,
        week,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        days: [],
      });
    }

    // 월간 타임라인
    const monthlyTimelineMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/schedules\/monthly-timeline$/);
    if (method === 'GET' && monthlyTimelineMatch) {
      const departmentId = Number(monthlyTimelineMatch[1]);
      const now = getKSTDate();
      const year = Number(url.searchParams.get('year') || now.getFullYear());
      const month = Number(url.searchParams.get('month') || now.getMonth() + 1);
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const prefix = `${year}-${monthStr}`;

      let query = `
        SELECT s.*, d.name as departmentName 
        FROM schedules s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE (s.schedule_date LIKE ? OR (s.end_date IS NOT NULL AND s.end_date LIKE ?))
      `;
      const params: any[] = [`${prefix}%`, `${prefix}%`];
      if (departmentId > 0) {
        query += ` AND (s.department_id = ? OR s.department_id = 0)`;
        params.push(departmentId);
      }
      query += ` ORDER BY s.schedule_date ASC, s.start_time ASC`;

      const { results } = await env.DB.prepare(query).bind(...params).all();
      const schedules = (results || []).map((r: any) => ({
        id: r.id,
        departmentId: r.department_id,
        departmentName: r.departmentName || '',
        category: r.category,
        title: r.title,
        authorName: r.author_name,
        targetName: r.target_name || '',
        scheduleDate: r.schedule_date,
        endDate: r.end_date || r.schedule_date,
        startTime: r.start_time,
        endTime: r.end_time,
        color: r.color,
        memo: r.memo,
        createdBy: r.created_by,
        updatedBy: r.updated_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      const dayMap: { [date: string]: any[] } = {};
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

      schedules.forEach((s: any) => {
        const d = s.scheduleDate;
        if (!dayMap[d]) dayMap[d] = [];
        dayMap[d].push(s);
      });

      const days = Object.keys(dayMap).sort().map((dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dObj = new Date(y, m - 1, d);
        return {
          date: dateStr,
          dayOfWeek: dayNames[dObj.getDay()],
          schedules: dayMap[dateStr],
        };
      });

      return ok({ year, month, days });
    }

    // 일정 수정 및 삭제
    const scheduleDetailMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/schedules\/(\d+)$/);
    if (scheduleDetailMatch) {
      const departmentId = Number(scheduleDetailMatch[1]);
      const scheduleId = Number(scheduleDetailMatch[2]);

      if (method === 'PUT') {
        const body: any = await request.json();
        const nowStr = nowKST();
        const targetDeptId = body.departmentId || departmentId;

        await env.DB.prepare(`
          UPDATE schedules SET
            department_id = ?, category = ?, title = ?, author_name = ?, target_name = ?,
            schedule_date = ?, end_date = ?, start_time = ?, end_time = ?, color = ?, memo = ?,
            updated_by = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          targetDeptId,
          body.category || 'CUSTOM',
          body.title,
          body.authorName,
          body.targetName || '',
          body.scheduleDate,
          body.endDate || body.scheduleDate,
          body.startTime || null,
          body.endTime || null,
          body.color || '#3B82F6',
          body.memo || '',
          body.updatedBy || body.authorName,
          nowStr,
          scheduleId
        ).run();

        await env.DB.prepare(`
          INSERT INTO schedule_histories (schedule_id, department_id, modifier_name, action_type, detail, created_at)
          VALUES (?, ?, ?, 'UPDATE', ?, ?)
        `).bind(scheduleId, targetDeptId, body.updatedBy || body.authorName, `'${body.title}' 일정을 수정했습니다.`, nowStr).run();

        const updated: any = await env.DB.prepare(`
          SELECT s.*, d.name as departmentName 
          FROM schedules s
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE s.id = ?
        `).bind(scheduleId).first();

        await recordActivity(
          env.DB,
          'SCHEDULE',
          'UPDATE',
          body.updatedBy || body.authorName,
          updated?.departmentName || '',
          `'${body.title}' 일정 수정 (${body.scheduleDate})`,
          nowStr
        );

        return ok({
          id: updated.id,
          departmentId: updated.department_id,
          departmentName: updated.departmentName || '',
          category: updated.category,
          title: updated.title,
          authorName: updated.author_name,
          targetName: updated.target_name || '',
          scheduleDate: updated.schedule_date,
          endDate: updated.end_date || updated.schedule_date,
          startTime: updated.start_time,
          endTime: updated.end_time,
          color: updated.color,
          memo: updated.memo,
          createdBy: updated.created_by,
          updatedBy: updated.updated_by,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        }, '일정이 성공적으로 수정되었습니다.');
      }

      if (method === 'DELETE') {
        const modifierName = url.searchParams.get('modifierName') || '사용자';
        const nowStr = nowKST();

        const targetSched: any = await env.DB.prepare(
          'SELECT s.title, d.name as departmentName FROM schedules s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = ?'
        ).bind(scheduleId).first();

        await env.DB.prepare(`
          INSERT INTO schedule_histories (schedule_id, department_id, modifier_name, action_type, detail, created_at)
          VALUES (?, ?, ?, 'DELETE', '일정을 삭제했습니다.', ?)
        `).bind(scheduleId, departmentId, modifierName, nowStr).run();

        await recordActivity(
          env.DB,
          'SCHEDULE',
          'DELETE',
          modifierName,
          targetSched?.departmentName || '',
          `'${targetSched?.title || `#${scheduleId}`}' 일정 삭제`,
          nowStr
        );

        await env.DB.prepare('DELETE FROM schedules WHERE id = ?').bind(scheduleId).run();
        await env.DB.prepare('DELETE FROM comments WHERE schedule_id = ?').bind(scheduleId).run();

        return ok(null, '일정이 성공적으로 삭제되었습니다.');
      }
    }

    // 히스토리 조회
    const scheduleHistMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/schedules\/(\d+)\/histories$/);
    if (method === 'GET' && scheduleHistMatch) {
      const scheduleId = Number(scheduleHistMatch[2]);
      const { results } = await env.DB.prepare(
        'SELECT * FROM schedule_histories WHERE schedule_id = ? ORDER BY id DESC'
      ).bind(scheduleId).all();
      return ok(results || []);
    }

    const deptHistMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/histories$/);
    if (method === 'GET' && deptHistMatch) {
      const departmentId = Number(deptHistMatch[1]);
      let query = 'SELECT * FROM schedule_histories';
      const params: any[] = [];
      if (departmentId > 0) {
        query += ' WHERE department_id = ?';
        params.push(departmentId);
      }
      query += ' ORDER BY id DESC LIMIT 50';
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return ok(results || []);
    }

    // 3. 댓글 (Comments)
    const commentsMatch = path.match(/^\/api\/v1\/schedules\/(\d+)\/comments$/);
    if (commentsMatch) {
      const scheduleId = Number(commentsMatch[1]);

      if (method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT id, schedule_id as scheduleId, author_name as authorName, content, created_at as createdAt, updated_at as updatedAt FROM comments WHERE schedule_id = ? ORDER BY id ASC'
        ).bind(scheduleId).all();
        return ok(results || []);
      }

      if (method === 'POST') {
        const body: any = await request.json();
        const nowStr = nowKST();

        const res = await env.DB.prepare(`
          INSERT INTO comments (schedule_id, author_name, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(scheduleId, body.authorName, body.content, nowStr, nowStr).run();

        const commentId = res.meta.last_row_id;

        const sched: any = await env.DB.prepare(
          'SELECT s.title, s.author_name, d.name as departmentName FROM schedules s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = ?'
        ).bind(scheduleId).first();

        if (sched && sched.author_name && sched.author_name !== body.authorName) {
          await env.DB.prepare(`
            INSERT INTO notifications (
              recipient_name, sender_name, schedule_id, schedule_title, comment_content, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?)
          `).bind(sched.author_name, body.authorName, scheduleId, sched.title, body.content, nowStr).run();
        }

        await recordActivity(
          env.DB,
          'COMMENT',
          'CREATE',
          body.authorName,
          sched?.departmentName || '',
          `[${sched?.title || '일정'}] 댓글 작성: "${String(body.content || '').slice(0, 60)}"`,
          nowStr
        );

        return ok({
          id: commentId,
          scheduleId,
          authorName: body.authorName,
          content: body.content,
          createdAt: nowStr,
          updatedAt: nowStr,
        }, '댓글이 등록되었습니다.');
      }
    }

    const commentDeleteMatch = path.match(/^\/api\/v1\/schedules\/(\d+)\/comments\/(\d+)$/);
    if (method === 'DELETE' && commentDeleteMatch) {
      const commentId = Number(commentDeleteMatch[2]);
      const existingComment: any = await env.DB.prepare('SELECT author_name, content FROM comments WHERE id = ?').bind(commentId).first();
      await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
      await recordActivity(
        env.DB,
        'COMMENT',
        'DELETE',
        existingComment?.author_name || '사용자',
        '',
        `댓글 삭제: "${String(existingComment?.content || '').slice(0, 50)}"`
      );
      return ok(null, '댓글이 삭제되었습니다.');
    }

    // 4. 기도 명단 (Prayer Targets)
    if (path === '/api/v1/prayers') {
      if (method === 'GET') {
        const deptParam = url.searchParams.get('department');
        const leaderParam = url.searchParams.get('leader');
        const isRallyParam = url.searchParams.get('isRally');

        let query = 'SELECT * FROM prayers WHERE 1=1';
        const params: any[] = [];

        if (deptParam && deptParam !== '전체') {
          query += ' AND department = ?';
          params.push(deptParam);
        }
        if (leaderParam) {
          query += ' AND leader = ?';
          params.push(leaderParam);
        }
        if (isRallyParam !== null && isRallyParam !== undefined) {
          query += ' AND is_rally = ?';
          params.push(isRallyParam === 'true' ? 1 : 0);
        }
        query += ' ORDER BY id DESC';

        const { results } = await env.DB.prepare(query).bind(...params).all();
        const mapped = (results || []).map((r: any) => ({
          id: r.id,
          department: r.department,
          leader: r.leader,
          target: r.target,
          relationship: r.relationship || '',
          age: r.age || '',
          isRally: r.is_rally === 1,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        return ok(mapped);
      }

      if (method === 'POST') {
        const body: any = await request.json();
        const nowStr = nowKST();

        const res = await env.DB.prepare(`
          INSERT INTO prayers (department, leader, target, relationship, age, is_rally, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          body.department,
          body.leader,
          body.target,
          body.relationship || '',
          body.age || '',
          body.isRally ? 1 : 0,
          nowStr,
          nowStr
        ).run();

        const newId = res.meta.last_row_id;
        await recordActivity(
          env.DB,
          'PRAYER',
          'CREATE',
          body.leader,
          body.department,
          `전도 대상자 '${body.target}' 신규 등록${body.relationship ? ` (${body.relationship})` : ''}`,
          nowStr
        );

        return ok({
          id: newId,
          department: body.department,
          leader: body.leader,
          target: body.target,
          relationship: body.relationship || '',
          age: body.age || '',
          isRally: !!body.isRally,
          createdAt: nowStr,
          updatedAt: nowStr,
        }, '기도 대상이 등록되었습니다.');
      }
    }

    const prayerRallyMatch = path.match(/^\/api\/v1\/prayers\/(\d+)\/rally$/);
    if (method === 'PATCH' && prayerRallyMatch) {
      const id = Number(prayerRallyMatch[1]);
      const isRallyParam = url.searchParams.get('isRally');
      const isRally = isRallyParam === 'true' ? 1 : 0;
      const nowStr = nowKST();

      await env.DB.prepare('UPDATE prayers SET is_rally = ?, updated_at = ? WHERE id = ?')
        .bind(isRally, nowStr, id)
        .run();

      const item: any = await env.DB.prepare('SELECT * FROM prayers WHERE id = ?').bind(id).first();
      await recordActivity(
        env.DB,
        'PRAYER',
        isRally === 1 ? 'RALLY_ON' : 'RALLY_OFF',
        item.leader,
        item.department,
        `'${item.target}' 11월 대집회 집중기도 ${isRally === 1 ? '등록' : '해제'}`,
        nowStr
      );

      return ok({
        id: item.id,
        department: item.department,
        leader: item.leader,
        target: item.target,
        relationship: item.relationship || '',
        age: item.age || '',
        isRally: item.is_rally === 1,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      });
    }

    const prayerDeleteMatch = path.match(/^\/api\/v1\/prayers\/(\d+)$/);
    if (method === 'DELETE' && prayerDeleteMatch) {
      const id = Number(prayerDeleteMatch[1]);
      const existingPrayer: any = await env.DB.prepare('SELECT department, leader, target FROM prayers WHERE id = ?').bind(id).first();
      await env.DB.prepare('DELETE FROM prayers WHERE id = ?').bind(id).run();
      await recordActivity(
        env.DB,
        'PRAYER',
        'DELETE',
        existingPrayer?.leader || '사용자',
        existingPrayer?.department || '',
        `전도 대상자 '${existingPrayer?.target || `#${id}`}' 명단 삭제`
      );
      return ok(null, '기도 대상이 삭제되었습니다.');
    }

    // 5. 알림 (Notifications)
    if (path === '/api/v1/notifications') {
      if (method === 'GET') {
        const userName = url.searchParams.get('userName');
        if (!userName) return ok([]);

        const { results } = await env.DB.prepare(`
          SELECT * FROM notifications 
          WHERE recipient_name = ? 
          ORDER BY id DESC LIMIT 50
        `).bind(userName).all();

        const mapped = (results || []).map((r: any) => ({
          id: r.id,
          recipientName: r.recipient_name,
          senderName: r.sender_name,
          scheduleId: r.schedule_id,
          scheduleTitle: r.schedule_title,
          commentContent: r.comment_content,
          isRead: r.is_read === 1,
          createdAt: r.created_at,
        }));
        return ok(mapped);
      }
    }

    if (method === 'GET' && path === '/api/v1/notifications/unread-count') {
      const userName = url.searchParams.get('userName');
      if (!userName) return ok({ unreadCount: 0 });

      const row: any = await env.DB.prepare(`
        SELECT COUNT(*) as cnt FROM notifications 
        WHERE recipient_name = ? AND is_read = 0
      `).bind(userName).first();

      return ok({ unreadCount: row ? row.cnt : 0 });
    }

    const notifReadMatch = path.match(/^\/api\/v1\/notifications\/(\d+)\/read$/);
    if (method === 'PATCH' && notifReadMatch) {
      const id = Number(notifReadMatch[1]);
      await env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(id).run();
      return ok(null, '알림을 읽음 처리했습니다.');
    }

    if (method === 'PATCH' && path === '/api/v1/notifications/read-all') {
      const userName = url.searchParams.get('userName');
      if (userName) {
        await env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_name = ?').bind(userName).run();
      }
      return ok(null, '모든 알림을 읽음 처리했습니다.');
    }

    // 6. 정밀 헬스 체크 API (UptimeRobot / 외부 감시용 - DB 쿼리 응답시간 측정 포함)
    if (method === 'GET' && path === '/api/v1/health') {
      const dbStart = Date.now();
      const [schedRow, prayerRow, errRow]: any[] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as cnt FROM schedules').first(),
        env.DB.prepare('SELECT COUNT(*) as cnt FROM prayers').first(),
        env.DB.prepare('SELECT COUNT(*) as cnt FROM error_logs').first(),
      ]);
      const dbLatencyMs = Date.now() - dbStart;

      return ok({
        status: 'UP',
        timestampKST: nowKST(),
        database: {
          status: 'CONNECTED',
          latencyMs: dbLatencyMs,
          schedulesCount: schedRow?.cnt || 0,
          prayersCount: prayerRow?.cnt || 0,
          errorLogsCount: errRow?.cnt || 0,
        },
        worker: {
          runtime: 'Cloudflare Workers',
          timezone: 'Asia/Seoul (KST)',
        },
      });
    }

    // 7. 실시간 버그/에러 모니터링 로그 수집, 조회 및 초기화
    if (path === '/api/v1/logs/error') {
      if (method === 'POST') {
        const body: any = await request.json().catch(() => ({}));
        const nowStr = nowKST();
        const logSource = String(body.source || 'FRONTEND').slice(0, 30);
        const logLevel = String(body.level || 'error').slice(0, 20);
        const logMessage = String(body.message || 'Unknown error').slice(0, 1000);
        const logStack = body.stack ? String(body.stack).slice(0, 3000) : '';
        const logUrl = body.url ? String(body.url).slice(0, 500) : '';
        const logUa = body.userAgent ? String(body.userAgent).slice(0, 500) : (request.headers.get('User-Agent') || '');
        const logUser = body.userName ? String(body.userName).slice(0, 100) : '';
        const logExtra = body.extra ? JSON.stringify(body.extra).slice(0, 2000) : '';

        console.error(JSON.stringify({
          event: 'client_error_reported',
          source: logSource,
          level: logLevel,
          message: logMessage,
          url: logUrl,
          userName: logUser,
          userAgent: logUa,
          timestamp: nowStr,
        }));

        await env.DB.prepare(`
          INSERT INTO error_logs (source, level, message, stack, url, user_agent, user_name, extra_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(logSource, logLevel, logMessage, logStack, logUrl, logUa, logUser, logExtra, nowStr).run();

        await env.DB.prepare(`
          DELETE FROM error_logs WHERE id NOT IN (SELECT id FROM error_logs ORDER BY id DESC LIMIT 500)
        `).run().catch(() => {});

        // 치명적 에러/오류 시 Discord 또는 Slack 웹훅으로 즉시 알림 발송
        if (logLevel === 'fatal' || logLevel === 'error' || logSource === 'MONITOR_TEST') {
          sendAlertWebhook(
            env,
            ctx,
            `[${logSource}/${logLevel.toUpperCase()}] ${logMessage}`,
            `사용자: ${logUser || '비로그인'}\nURL: ${logUrl}\n기기: ${logUa}\n${logStack}`
          );
        }

        return ok({ recorded: true }, '에러 로그가 기록되었습니다.');
      }

      if (method === 'GET') {
        if (!isAuthorizedMonitorUser(request, url)) {
          return err("관제 센터 접근 권한이 없습니다. ('권진호' 계정 전용)", 403);
        }
        const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
        const { results } = await env.DB.prepare(`
          SELECT * FROM error_logs ORDER BY id DESC LIMIT ?
        `).bind(limit).all();
        return ok(results || []);
      }

      if (method === 'DELETE') {
        if (!isAuthorizedMonitorUser(request, url)) {
          return err("관제 센터 접근 권한이 없습니다. ('권진호' 계정 전용)", 403);
        }
        await env.DB.prepare('DELETE FROM error_logs').run();
        return ok({ cleared: true }, '에러 로그가 초기화되었습니다.');
      }
    }

    // 8. 웹 체감 속도(RUM / Web Vitals) 수집 및 조회
    if (path === '/api/v1/logs/perf') {
      if (method === 'POST') {
        const body: any = await request.json().catch(() => ({}));
        const nowStr = nowKST();
        const ua = body.userAgent ? String(body.userAgent).slice(0, 500) : (request.headers.get('User-Agent') || '');
        const deviceType = /iPhone|iPad|iPod/i.test(ua)
          ? '🍎 iOS'
          : (/Android/i.test(ua) ? '🤖 Android' : '💻 PC/Web');

        await env.DB.prepare(`
          INSERT INTO perf_logs (device_type, user_agent, ttfb_ms, fcp_ms, lcp_ms, load_ms, url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          deviceType,
          ua,
          body.ttfbMs != null ? Math.round(Number(body.ttfbMs)) : null,
          body.fcpMs != null ? Math.round(Number(body.fcpMs)) : null,
          body.lcpMs != null ? Math.round(Number(body.lcpMs)) : null,
          body.loadMs != null ? Math.round(Number(body.loadMs)) : null,
          String(body.url || '').slice(0, 500),
          nowStr
        ).run();

        // 최근 200건 유지
        await env.DB.prepare(`
          DELETE FROM perf_logs WHERE id NOT IN (SELECT id FROM perf_logs ORDER BY id DESC LIMIT 200)
        `).run().catch(() => {});

        return ok({ recorded: true });
      }
    }

    // 9. 관리자 관제 대시보드 종합 데이터 (/monitor 및 앱 내 관제 모달용 - 권진호 전용)
    if (method === 'GET' && path === '/api/v1/monitor/summary') {
      if (!isAuthorizedMonitorUser(request, url)) {
        return err("관제 센터 접근 권한이 없습니다. ('권진호' 계정 전용)", 403);
      }
      const dbStart = Date.now();
      const [schedRow, prayerRow, errRow, perfAgg, perfByDeviceRes, errorByLevelRes, auditByCatRes, errList, perfList, auditList]: any[] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as cnt FROM schedules').first(),
        env.DB.prepare('SELECT COUNT(*) as cnt FROM prayers').first(),
        env.DB.prepare('SELECT COUNT(*) as cnt FROM error_logs').first(),
        env.DB.prepare(`
          SELECT
            COUNT(*) as totalSamples,
            AVG(lcp_ms) as avgLcpMs,
            AVG(fcp_ms) as avgFcpMs,
            AVG(ttfb_ms) as avgTtfbMs,
            SUM(CASE WHEN lcp_ms >= 3000 OR load_ms >= 4000 THEN 1 ELSE 0 END) as slowSamples
          FROM perf_logs
        `).first(),
        env.DB.prepare(`
          SELECT
            device_type as deviceType,
            COUNT(*) as count,
            AVG(ttfb_ms) as avgTtfbMs,
            AVG(fcp_ms) as avgFcpMs,
            AVG(lcp_ms) as avgLcpMs
          FROM perf_logs
          GROUP BY device_type
          ORDER BY count DESC
        `).all(),
        env.DB.prepare(`
          SELECT level, COUNT(*) as count FROM error_logs GROUP BY level
        `).all(),
        env.DB.prepare(`
          SELECT category, COUNT(*) as count FROM activity_logs GROUP BY category
        `).all(),
        env.DB.prepare('SELECT * FROM error_logs ORDER BY id DESC LIMIT 50').all(),
        env.DB.prepare('SELECT * FROM perf_logs ORDER BY id DESC LIMIT 20').all(),
        env.DB.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 50').all(),
      ]);
      const dbLatencyMs = Date.now() - dbStart;

      return ok({
        timestampKST: nowKST(),
        integrations: {
          cloudflareObservability: true,
          d1Connected: true,
          webhookConfigured: Boolean(env.ALERT_WEBHOOK_URL),
        },
        health: {
          status: 'UP',
          dbLatencyMs,
          schedulesCount: schedRow?.cnt || 0,
          prayersCount: prayerRow?.cnt || 0,
          errorLogsCount: errRow?.cnt || 0,
        },
        perfStats: perfAgg || { totalSamples: 0, avgLcpMs: null, avgFcpMs: null, avgTtfbMs: null, slowSamples: 0 },
        perfByDevice: perfByDeviceRes?.results || [],
        errorByLevel: errorByLevelRes?.results || [],
        auditByCategory: auditByCatRes?.results || [],
        recentErrors: errList?.results || [],
        recentPerfs: perfList?.results || [],
        recentAudits: auditList?.results || [],
      });
    }

    return err(`요청하신 API 경로(${method} ${path})를 찾을 수 없습니다.`, 404);
  } catch (error: any) {
    const nowStr = nowKST();
    const errMsg = error?.message || String(error);
    const errStack = error?.stack || '';

    // Cloudflare Observability 로그에 예외 스택 기록
    console.error(JSON.stringify({
      event: 'worker_api_exception',
      method,
      path,
      message: errMsg,
      stack: errStack,
      timestamp: nowStr,
    }));

    // D1 error_logs 테이블에도 백엔드 장애 기록 시도
    try {
      await env.DB.prepare(`
        INSERT INTO error_logs (source, level, message, stack, url, user_agent, user_name, extra_json, created_at)
        VALUES ('BACKEND', 'fatal', ?, ?, ?, ?, '', '', ?)
      `).bind(
        errMsg.slice(0, 1000),
        errStack.slice(0, 3000),
        `${method} ${path}`,
        request.headers.get('User-Agent') || '',
        nowStr
      ).run();
    } catch (_) {}

    sendAlertWebhook(env, ctx, `백엔드 API 치명적 예외 (${method} ${path})`, `${errMsg}\n${errStack}`);
    return err(`서버 내부 오류: ${errMsg}`, 500);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);

    try {
      // 관리자용 실시간 관제 대시보드 페이지 서빙
      if (url.pathname === '/monitor' || url.pathname === '/monitor/') {
        return new Response(renderMonitorDashboardHtml(), {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }

      let response: Response;
      // API 요청은 백엔드 로직 처리
      if (url.pathname.startsWith('/api/v1')) {
        response = await handleApiRequest(request, env, ctx);
        const durationMs = Date.now() - startTime;

        // Cloudflare Observability Logs용 구조화 요청/성능 메트릭 기록
        if (response.status >= 400 || durationMs >= 1000) {
          console.warn(JSON.stringify({
            event: 'api_performance_or_error',
            method: request.method,
            path: url.pathname,
            status: response.status,
            durationMs,
            timestamp: nowKST(),
          }));
        } else {
          console.log(JSON.stringify({
            event: 'api_access',
            method: request.method,
            path: url.pathname,
            status: response.status,
            durationMs,
            timestamp: nowKST(),
          }));
        }
        return response;
      }

      // 그 외 웹 페이지 및 정적 파일 요청은 프론트엔드 정적 자산 서빙
      const assetRes = await env.ASSETS.fetch(request);
      if (
        url.pathname === '/' ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/service-worker.js'
      ) {
        const newHeaders = new Headers(assetRes.headers);
        newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return new Response(assetRes.body, {
          status: assetRes.status,
          statusText: assetRes.statusText,
          headers: newHeaders,
        });
      }
      return assetRes;
    } catch (fatalErr: any) {
      // 최상위 Worker 크래시 감지 및 Cloudflare Observability 기록
      console.error(JSON.stringify({
        event: 'worker_fatal_crash',
        method: request.method,
        path: url.pathname,
        message: fatalErr?.message || String(fatalErr),
        stack: fatalErr?.stack || '',
        timestamp: nowKST(),
      }));
      sendAlertWebhook(env, ctx, `Worker 최상위 크래시 (${url.pathname})`, String(fatalErr?.stack || fatalErr));
      return err('일시적인 서버 오류가 발생했습니다.', 500);
    }
  },
};
