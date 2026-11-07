import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  COLORS,
  DEPARTMENT_BG_COLORS,
  DEPARTMENT_COLORS,
  SHADOWS,
} from '../constants/theme';
import { Department } from '../types';
import { CalendarIcon, SparklesIcon } from './icons';

interface LoginModalProps {
  visible: boolean;
  departments: Department[];
  loading: boolean;
  onLogin: (departmentId: number, userName: string) => Promise<void>;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  departments,
  loading,
  onLogin,
  onClose,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!selectedDeptId) {
      setErrorMsg('소속 부서를 선택해주세요.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('본인의 이름을 입력해주세요.');
      return;
    }

    try {
      setErrorMsg('');
      setSubmitting(true);
      await onLogin(selectedDeptId, name.trim());
    } catch (e: any) {
      setErrorMsg(e.message || '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 다이얼로그 헤더 (shadcn DialogHeader) */}
          <View style={styles.headerArea}>
            <View style={styles.iconCircle}>
              <CalendarIcon size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>전도 캘린더 시작하기</Text>
            <Text style={styles.subtitle}>
              소속 부서를 선택하고 이름을 입력하여 캘린더에 입장하세요
            </Text>
          </View>

          {/* 1. 소속 부서 선택 (shadcn Toggle Group) */}
          <Text style={styles.sectionLabel}>1. 소속 부서 선택</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.deptGrid}>
              {departments.map((dept) => {
                const isSelected = selectedDeptId === dept.id;
                const deptColor = DEPARTMENT_COLORS[dept.name] || COLORS.primary;
                const deptBg = DEPARTMENT_BG_COLORS[dept.name] || '#F1F5F9';

                return (
                  <TouchableOpacity
                    key={dept.id}
                    style={[
                      styles.deptChip,
                      isSelected && {
                        backgroundColor: deptBg,
                        borderColor: deptColor,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDeptId(dept.id);
                      setErrorMsg('');
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.deptChipDot,
                        { backgroundColor: deptColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.deptChipText,
                        isSelected && { color: deptColor, fontWeight: '800' },
                      ]}
                    >
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 2. 본인 이름 입력 (shadcn Input) */}
          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>2. 본인 이름 입력</Text>
          <TextInput
            style={styles.textInput}
            placeholder="이름을 입력하세요 (예: 홍길동)"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setErrorMsg('');
            }}
            maxLength={20}
          />

          <View style={styles.noticeBox}>
            <SparklesIcon size={14} color={COLORS.primary} />
            <Text style={styles.noticeText}>
              등록 후 일정 수정 및 삭제는 <Text style={{ fontWeight: '700' }}>본인이 작성한 글</Text>만 가능합니다.
            </Text>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* 3. 입장 버튼 (shadcn Primary Button) */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>캘린더 입장하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  deptGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  deptChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  deptChipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  deptChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16, // 모바일 브라우저 자동 확대 방지
    color: COLORS.textPrimary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  noticeText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...SHADOWS.sm,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
