import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { MainTabType } from '../types';
import { CalendarIcon, HeartHandshakeIcon, PrayerHandsIcon } from './icons';

interface BottomTabBarProps {
  currentTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  myPrayerCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onChangeTab,
  myPrayerCount = 0,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. 캘린더 탭 */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChangeTab('calendar')}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.iconWrapper,
            currentTab === 'calendar' && styles.iconWrapperActive,
          ]}
        >
          <CalendarIcon
            size={20}
            color={currentTab === 'calendar' ? COLORS.primary : COLORS.textSecondary}
            strokeWidth={currentTab === 'calendar' ? 2.4 : 1.8}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            currentTab === 'calendar' && styles.tabLabelActive,
          ]}
        >
          캘린더
        </Text>
      </TouchableOpacity>

      {/* 2. 기도명단 탭 */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChangeTab('prayers')}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.iconWrapper,
            currentTab === 'prayers' && styles.iconWrapperActive,
          ]}
        >
          <PrayerHandsIcon
            size={20}
            color={currentTab === 'prayers' ? COLORS.primary : COLORS.textSecondary}
            strokeWidth={currentTab === 'prayers' ? 2.4 : 1.8}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            currentTab === 'prayers' && styles.tabLabelActive,
          ]}
        >
          26년 기도명단
        </Text>
      </TouchableOpacity>

      {/* 3. 내 기도명단 탭 */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChangeTab('myPrayers')}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.iconWrapper,
            currentTab === 'myPrayers' && styles.iconWrapperActive,
          ]}
        >
          <HeartHandshakeIcon
            size={20}
            color={currentTab === 'myPrayers' ? '#DC2626' : COLORS.textSecondary}
            strokeWidth={currentTab === 'myPrayers' ? 2.4 : 1.8}
          />
          {myPrayerCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{myPrayerCount}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            currentTab === 'myPrayers' && styles.tabLabelActive,
            currentTab === 'myPrayers' && { color: '#DC2626' },
          ]}
        >
          내 기도명단
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        } as any)
      : {}),
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'web' ? (16 as any) : 16,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 36,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapperActive: {
    backgroundColor: '#F1F5F9',
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  tabLabelActive: {
    color: COLORS.primary, // #0F172A
    fontWeight: '800',
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
