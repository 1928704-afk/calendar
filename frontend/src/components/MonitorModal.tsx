import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { api } from '../services/api';
import { ActivityIcon, RefreshIcon, XIcon } from './icons';

interface MonitorModalProps {
  visible: boolean;
  userName?: string;
  onClose: () => void;
}

type MonitorTab = 'errors' | 'perf' | 'audits';
type LevelFilter = 'ALL' | 'fatal' | 'error' | 'warn';

export const MonitorModal: React.FC<MonitorModalProps> = ({
  visible,
  userName,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<MonitorTab>('errors');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const sentryDsnConfigured = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.getMonitorSummary();
      setData(res);
    } catch (e: any) {
      setErrorMsg(e?.message || '모니터링 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadSummary();
    }
  }, [visible]);

  const handleSendTest = async () => {
    try {
      setActionBusy(true);
      await api.sendTestMonitorLog(userName);
      await loadSummary();
    } catch (e) {
      // ignore
    } finally {
      setActionBusy(false);
    }
  };

  const handleClearErrors = async () => {
    try {
      setActionBusy(true);
      await api.clearMonitorErrors();
      await loadSummary();
    } catch (e) {
      // ignore
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenWebDashboard = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open('/monitor', '_blank');
    }
  };

  const detectDeviceLabel = (ua?: string) => {
    if (!ua) return '기타';
    if (/iPhone|iPad|iPod/i.test(ua)) return '🍎 iOS';
    if (/Android/i.test(ua)) return '🤖 Android';
    return '💻 PC';
  };

  const filteredErrors = (data?.recentErrors || []).filter((item: any) => {
    if (levelFilter === 'ALL') return true;
    return (item.level || '').toLowerCase() === levelFilter;
  });

  const errorLevelCountMap: Record<string, number> = { fatal: 0, error: 0, warn: 0 };
  (data?.errorByLevel || []).forEach((r: any) => {
    if (r.level) errorLevelCountMap[r.level] = r.count;
  });

  const isUp = data?.health?.status === 'UP';
  const avgLcp = data?.perfStats?.avgLcpMs ? Math.round(data.perfStats.avgLcpMs) : null;
  const avgFcp = data?.perfStats?.avgFcpMs ? Math.round(data.perfStats.avgFcpMs) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* 상단 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.pulseDot, { backgroundColor: isUp ? '#10B981' : '#EF4444' }]} />
              <View>
                <Text style={styles.headerTitle}>실시간 서비스 관제 센터</Text>
                <Text style={styles.headerSub}>
                  {data?.timestampKST ? `최근 동기화: ${data.timestampKST} (KST)` : '상태 점검 중...'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={loadSummary} disabled={loading}>
                <RefreshIcon size={17} color="#E2E8F0" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                <XIcon size={18} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {loading && !data && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>서버/DB 모니터링 지표 불러오는 중...</Text>
              </View>
            )}

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {data && (
              <>
                {/* 1. 4대 모니터링 엔진 가동 상태 */}
                <Text style={styles.sectionHeading}>🛡️ 모니터링 시스템 가동 현황</Text>
                <View style={styles.engineGrid}>
                  <View style={styles.engineCard}>
                    <View style={styles.engineTop}>
                      <Text style={styles.engineTitle}>Cloudflare Logs</Text>
                      <View style={[styles.statusBadge, styles.badgeGreen]}>
                        <Text style={styles.badgeGreenText}>활성</Text>
                      </View>
                    </View>
                    <Text style={styles.engineDesc}>Workers 요청·예외 100% 수집</Text>
                  </View>

                  <View style={styles.engineCard}>
                    <View style={styles.engineTop}>
                      <Text style={styles.engineTitle}>Sentry + 크래시</Text>
                      <View style={[styles.statusBadge, styles.badgeGreen]}>
                        <Text style={styles.badgeGreenText}>
                          {sentryDsnConfigured ? '클라우드 연동' : '자체 수집 활성'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.engineDesc}>ErrorBoundary · API 지연 감시</Text>
                  </View>

                  <View style={styles.engineCard}>
                    <View style={styles.engineTop}>
                      <Text style={styles.engineTitle}>D1 Health Check</Text>
                      <View style={[styles.statusBadge, isUp ? styles.badgeGreen : styles.badgeRed]}>
                        <Text style={isUp ? styles.badgeGreenText : styles.badgeRedText}>
                          {isUp ? `${data.health.dbLatencyMs}ms` : '점검필요'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.engineDesc}>DB 왕복 응답 및 무결성</Text>
                  </View>

                  <View style={styles.engineCard}>
                    <View style={styles.engineTop}>
                      <Text style={styles.engineTitle}>웹훅 / Web Vitals</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          data.integrations?.webhookConfigured ? styles.badgeGreen : styles.badgeSlate,
                        ]}
                      >
                        <Text
                          style={
                            data.integrations?.webhookConfigured ? styles.badgeGreenText : styles.badgeSlateText
                          }
                        >
                          {data.integrations?.webhookConfigured ? '알림 연동' : '웹훅 대기'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.engineDesc}>체감속도 RUM 자동 수집</Text>
                  </View>
                </View>

                {/* 2. 핵심 수치 KPI 4분할 */}
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>누적 에러</Text>
                    <Text
                      style={[
                        styles.kpiVal,
                        { color: (data.health.errorLogsCount || 0) > 0 ? '#F87171' : '#34D399' },
                      ]}
                    >
                      {data.health.errorLogsCount || 0}건
                    </Text>
                    <Text style={styles.kpiSub}>
                      F:{errorLevelCountMap.fatal || 0} E:{errorLevelCountMap.error || 0} W:
                      {errorLevelCountMap.warn || 0}
                    </Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>평균 로딩(LCP)</Text>
                    <Text style={[styles.kpiVal, { color: '#60A5FA' }]}>
                      {avgLcp !== null ? `${avgLcp}ms` : '-'}
                    </Text>
                    <Text style={styles.kpiSub}>
                      FCP {avgFcp !== null ? `${avgFcp}ms` : '-'} · {data.perfStats?.totalSamples || 0}건
                    </Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>DB 현황</Text>
                    <Text style={[styles.kpiVal, { color: '#F8FAFC' }]}>
                      {data.health.schedulesCount || 0}일정
                    </Text>
                    <Text style={styles.kpiSub}>기도 {data.health.prayersCount || 0}명</Text>
                  </View>
                </View>

                {/* 3. 기기별 체감 속도 비교 차트 */}
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>📱 기기별 평균 화면 로딩 속도 (LCP)</Text>
                    <Text style={styles.chartHint}>2.5초 이하 쾌적</Text>
                  </View>
                  {(!data.perfByDevice || data.perfByDevice.length === 0) ? (
                    <Text style={styles.emptySmallText}>
                      아직 수집된 기기별 속도 데이터가 없습니다. (웹 접속 후 3초 뒤 자동 기록)
                    </Text>
                  ) : (
                    data.perfByDevice.map((item: any, idx: number) => {
                      const ms = Math.round(item.avgLcpMs || item.avgFcpMs || 0);
                      const pct = Math.min(100, Math.max(8, Math.round((ms / 3500) * 100)));
                      const barColor = ms >= 3000 ? '#EF4444' : ms >= 2000 ? '#F59E0B' : '#10B981';
                      return (
                        <View key={idx} style={styles.barRow}>
                          <Text style={styles.barLabel}>{item.deviceType}</Text>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                          </View>
                          <Text style={styles.barValue}>
                            {ms}ms ({item.count})
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* 4. 세그먼트 탭 */}
                <View style={styles.tabRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'errors' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('errors')}
                  >
                    <Text style={[styles.tabBtnText, activeTab === 'errors' && styles.tabBtnTextActive]}>
                      🚨 에러 ({data.recentErrors?.length || 0})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'perf' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('perf')}
                  >
                    <Text style={[styles.tabBtnText, activeTab === 'perf' && styles.tabBtnTextActive]}>
                      ⚡ 속도 ({data.recentPerfs?.length || 0})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'audits' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('audits')}
                  >
                    <Text style={[styles.tabBtnText, activeTab === 'audits' && styles.tabBtnTextActive]}>
                      📝 활동 ({data.recentAudits?.length || 0})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 탭 내용 1: 에러 로그 */}
                {activeTab === 'errors' && (
                  <View style={styles.listSection}>
                    <View style={styles.filterRow}>
                      {(['ALL', 'fatal', 'error', 'warn'] as LevelFilter[]).map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          style={[styles.filterChip, levelFilter === lvl && styles.filterChipActive]}
                          onPress={() => setLevelFilter(lvl)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              levelFilter === lvl && styles.filterChipTextActive,
                            ]}
                          >
                            {lvl === 'ALL' ? '전체' : lvl.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {filteredErrors.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>✅ 최근 기록된 에러가 없습니다.</Text>
                      </View>
                    ) : (
                      filteredErrors.map((errItem: any) => {
                        const isExpanded = expandedErrorId === errItem.id;
                        const lvl = (errItem.level || 'error').toLowerCase();
                        return (
                          <TouchableOpacity
                            key={errItem.id}
                            style={styles.logCard}
                            activeOpacity={0.8}
                            onPress={() => setExpandedErrorId(isExpanded ? null : errItem.id)}
                          >
                            <View style={styles.logTop}>
                              <View style={styles.logBadges}>
                                <View
                                  style={[
                                    styles.lvlBadge,
                                    lvl === 'fatal'
                                      ? styles.lvlFatal
                                      : lvl === 'warn'
                                        ? styles.lvlWarn
                                        : styles.lvlError,
                                  ]}
                                >
                                  <Text style={styles.lvlText}>{lvl.toUpperCase()}</Text>
                                </View>
                                <Text style={styles.logSource}>{errItem.source}</Text>
                                <Text style={styles.logDevice}>
                                  {detectDeviceLabel(errItem.user_agent)} · {errItem.user_name || '비로그인'}
                                </Text>
                              </View>
                              <Text style={styles.logTime}>{errItem.created_at}</Text>
                            </View>
                            <Text style={styles.logMessage}>{errItem.message}</Text>
                            {isExpanded && (errItem.stack || errItem.extra_json || errItem.url) && (
                              <View style={styles.stackBox}>
                                {errItem.url ? <Text style={styles.stackUrl}>URL: {errItem.url}</Text> : null}
                                <Text style={styles.stackText}>
                                  {errItem.stack || errItem.extra_json}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {/* 탭 내용 2: 체감 속도 */}
                {activeTab === 'perf' && (
                  <View style={styles.listSection}>
                    {(!data.recentPerfs || data.recentPerfs.length === 0) ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>아직 수집된 속도 데이터가 없습니다.</Text>
                      </View>
                    ) : (
                      data.recentPerfs.map((p: any) => {
                        const isSlow = (p.lcp_ms || 0) >= 3000;
                        return (
                          <View key={p.id} style={styles.logCard}>
                            <View style={styles.logTop}>
                              <Text style={styles.logDevice}>{p.device_type || detectDeviceLabel(p.user_agent)}</Text>
                              <Text style={styles.logTime}>{p.created_at}</Text>
                            </View>
                            <View style={styles.perfMetricsRow}>
                              <Text style={styles.perfMetric}>TTFB: {p.ttfb_ms ?? '-'}ms</Text>
                              <Text style={styles.perfMetric}>FCP: {p.fcp_ms ?? '-'}ms</Text>
                              <Text
                                style={[
                                  styles.perfMetric,
                                  { color: isSlow ? '#F87171' : '#34D399', fontWeight: '700' },
                                ]}
                              >
                                LCP: {p.lcp_ms ?? '-'}ms
                              </Text>
                              <Text style={styles.perfMetric}>로드: {p.load_ms ?? '-'}ms</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* 탭 내용 3: 일정 활동 감사 로그 */}
                {activeTab === 'audits' && (
                  <View style={styles.listSection}>
                    {(!data.recentAudits || data.recentAudits.length === 0) ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>최근 일정 변경 기록이 없습니다.</Text>
                      </View>
                    ) : (
                      data.recentAudits.map((a: any) => (
                        <View key={a.id} style={styles.logCard}>
                          <View style={styles.logTop}>
                            <Text style={styles.auditAction}>
                              [{a.action_type}] {a.modifier_name}
                            </Text>
                            <Text style={styles.logTime}>{a.created_at}</Text>
                          </View>
                          <Text style={styles.logMessage}>{a.detail}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* 하단 제어 버튼 바 */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary]}
              onPress={handleSendTest}
              disabled={actionBusy}
            >
              <ActivityIcon size={14} color="#FFFFFF" />
              <Text style={styles.footerBtnText}>테스트 진단</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.footerBtn} onPress={handleOpenWebDashboard}>
                <Text style={styles.footerBtnText}>전체 웹 관제실</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnDanger]}
              onPress={handleClearErrors}
              disabled={actionBusy}
            >
              <Text style={[styles.footerBtnText, { color: '#FCA5A5' }]}>에러 비우기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 10,
  },
  engineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  engineCard: {
    width: '48.5%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 11,
  },
  engineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  engineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  engineDesc: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeGreen: {
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  badgeGreenText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeRed: {
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  badgeRedText: {
    color: '#F87171',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeSlate: {
    backgroundColor: '#1F2937',
  },
  badgeSlateText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 3,
  },
  chartCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  chartHint: {
    fontSize: 10.5,
    color: '#64748B',
  },
  emptySmallText: {
    fontSize: 11.5,
    color: '#64748B',
    paddingVertical: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  barLabel: {
    width: 72,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barValue: {
    width: 76,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary || '#2563EB',
    borderColor: COLORS.primary || '#2563EB',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  listSection: {
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  filterChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  emptyBoxText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  logCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
    gap: 4,
  },
  logBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  lvlBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lvlFatal: { backgroundColor: 'rgba(239,68,68,0.22)' },
  lvlError: { backgroundColor: 'rgba(245,158,11,0.22)' },
  lvlWarn: { backgroundColor: 'rgba(59,130,246,0.22)' },
  lvlText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  logSource: {
    fontSize: 11,
    fontWeight: '700',
    color: '#93C5FD',
  },
  logDevice: {
    fontSize: 11,
    color: '#94A3B8',
  },
  logTime: {
    fontSize: 10.5,
    color: '#64748B',
  },
  logMessage: {
    fontSize: 12.5,
    color: '#F1F5F9',
    fontWeight: '600',
    lineHeight: 18,
  },
  stackBox: {
    marginTop: 8,
    backgroundColor: '#030712',
    borderRadius: 8,
    padding: 8,
  },
  stackUrl: {
    fontSize: 10.5,
    color: '#60A5FA',
    marginBottom: 4,
  },
  stackText: {
    fontSize: 10.5,
    color: '#FCA5A5',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  perfMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  perfMetric: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  auditAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  footerBtnPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  footerBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  footerBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
});
