// Cloudflare Pages Functions - 올인원 백엔드 API & D1 데이터베이스 라우터
import { PRAYER_TARGETS } from '../../../frontend/src/data/prayerData';

interface Env {
  DB: D1Database;
}

// 공통 JSON 응답 헬퍼
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
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

// D1 데이터베이스 스키마 및 기본 데이터 초기화
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
  ]);

  // 기본 부서 데이터 삽입
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

// 한국 시간 문자열 생성
function nowKST() {
  const kst = getKSTDate();
  return kst.toISOString().replace('T', ' ').substring(0, 19);
}

// 메인 요청 핸들러
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, ''); // 끝 슬래시 제거
  const method = request.method.toUpperCase();

  // CORS 프리플라이트 처리
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // D1 DB 연결 검증
  if (!env.DB) {
    return err('Cloudflare D1 데이터베이스가 아직 연결되지 않았습니다. Cloudflare Pages 설정에서 D1 바인딩(DB)을 추가해 주세요.', 500);
  }

  try {
    await ensureSchema(env.DB);

    // ==========================================
    // 1. 부서 및 로그인 (Departments & Auth)
    // ==========================================
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

      if (!userName) {
        return err('이름을 입력해 주세요.');
      }

      if (departmentId === 0) {
        return ok({
          departmentId: 0,
          departmentName: '전체 부서',
          userName,
          loginAt: nowKST(),
        }, '성공적으로 입장하였습니다.');
      }

      const dept: any = await env.DB.prepare('SELECT id, name FROM departments WHERE id = ?').bind(departmentId).first();
      if (!dept) {
        return err('존재하지 않는 부서입니다.');
      }

      return ok({
        departmentId: dept.id,
        departmentName: dept.name,
        userName,
        loginAt: nowKST(),
      }, '성공적으로 입장하였습니다.');
    }

    // ==========================================
    // 2. 일정 관리 (Schedules)
    // ==========================================
    
    // 월간 달력 일정 목록 조회
    // GET /api/v1/departments/:departmentId/schedules
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

      // 일정 생성
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

        // 히스토리 기록
        await env.DB.prepare(`
          INSERT INTO schedule_histories (schedule_id, department_id, modifier_name, action_type, detail, created_at)
          VALUES (?, ?, ?, 'CREATE', ?, ?)
        `).bind(newId, targetDeptId, body.authorName, `'${body.title}' 일정을 등록했습니다.`, nowStr).run();

        const createdItem = {
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
        };

        return ok(createdItem, '일정이 성공적으로 등록되었습니다.');
      }
    }

    // 주간 타임라인 일정 조회
    // GET /api/v1/departments/:departmentId/schedules/timeline
    const timelineMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/schedules\/timeline$/);
    if (method === 'GET' && timelineMatch) {
      const departmentId = Number(timelineMatch[1]);
      const year = Number(url.searchParams.get('year') || getKSTDate().getFullYear());
      const week = Number(url.searchParams.get('week') || 1);

      // 전체 일정 조회 후 묶기
      let query = `
        SELECT s.*, d.name as departmentName 
        FROM schedules s
        LEFT JOIN departments d ON s.department_id = d.id
      `;
      const params: any[] = [];
      if (departmentId > 0) {
        query += ` WHERE (s.department_id = ? OR s.department_id = 0)`;
        params.push(departmentId);
      }
      query += ` ORDER BY s.schedule_date ASC, s.start_time ASC`;

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return ok({
        year,
        week,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        days: [],
      });
    }

    // 월간 타임라인 일정 조회
    // GET /api/v1/departments/:departmentId/schedules/monthly-timeline
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

      // 날짜별 그룹화
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

      return ok({
        year,
        month,
        days,
      });
    }

    // 일정 수정 및 삭제
    // PUT / DELETE /api/v1/departments/:departmentId/schedules/:scheduleId
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

        // 히스토리 기록
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

        // 히스토리 기록
        await env.DB.prepare(`
          INSERT INTO schedule_histories (schedule_id, department_id, modifier_name, action_type, detail, created_at)
          VALUES (?, ?, ?, 'DELETE', '일정을 삭제했습니다.', ?)
        `).bind(scheduleId, departmentId, modifierName, nowStr).run();

        await env.DB.prepare('DELETE FROM schedules WHERE id = ?').bind(scheduleId).run();
        await env.DB.prepare('DELETE FROM comments WHERE schedule_id = ?').bind(scheduleId).run();

        return ok(null, '일정이 성공적으로 삭제되었습니다.');
      }
    }

    // 히스토리 조회
    // GET /api/v1/departments/:departmentId/schedules/:scheduleId/histories
    const scheduleHistMatch = path.match(/^\/api\/v1\/departments\/(\d+)\/schedules\/(\d+)\/histories$/);
    if (method === 'GET' && scheduleHistMatch) {
      const scheduleId = Number(scheduleHistMatch[2]);
      const { results } = await env.DB.prepare(
        'SELECT * FROM schedule_histories WHERE schedule_id = ? ORDER BY id DESC'
      ).bind(scheduleId).all();
      return ok(results || []);
    }

    // 부서 전체 최근 히스토리
    // GET /api/v1/departments/:departmentId/histories
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

    // ==========================================
    // 3. 댓글 (Comments) & 실시간 알림 연동
    // ==========================================
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

        // 일정 정보 조회하여 작성자에게 알림 생성
        const sched: any = await env.DB.prepare(
          'SELECT title, author_name FROM schedules WHERE id = ?'
        ).bind(scheduleId).first();

        if (sched && sched.author_name && sched.author_name !== body.authorName) {
          await env.DB.prepare(`
            INSERT INTO notifications (
              recipient_name, sender_name, schedule_id, schedule_title, comment_content, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?)
          `).bind(sched.author_name, body.authorName, scheduleId, sched.title, body.content, nowStr).run();
        }

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
      await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
      return ok(null, '댓글이 삭제되었습니다.');
    }

    // ==========================================
    // 4. 기도 명단 (Prayer Targets)
    // ==========================================
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
      await env.DB.prepare('DELETE FROM prayers WHERE id = ?').bind(id).run();
      return ok(null, '기도 대상이 삭제되었습니다.');
    }

    // ==========================================
    // 5. 알림 (Notifications)
    // ==========================================
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

    return err(`요청하신 API 경로(${method} ${path})를 찾을 수 없습니다.`, 404);
  } catch (error: any) {
    return err(`서버 내부 오류: ${error.message || String(error)}`, 500);
  }
};
