import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChevronLeftIcon, ChevronRightIcon, MoonIcon, RepeatIcon, SunIcon } from '../icons/Icons';
import IconButton from '../components/IconButton';
import PressScale from '../components/PressScale';
import Switch from '../components/Switch';
import SegmentedToggle from '../components/SegmentedToggle';
import { useAppState } from '../state/AppState';

export default function SettingsScreen() {
  const { colors, radius, shadowCard, isDark, setIsDark } = useTheme();
  const { closeSettings, openRoutineManager } = useAppState();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weekStartsMonday, setWeekStartsMonday] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <IconButton onPress={closeSettings}>
          <ChevronLeftIcon color={colors.ink} />
        </IconButton>
        <Text style={[styles.headline, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>Settings</Text>
      </View>

      <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg }, shadowCard]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Theme</Text>
            <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>Choose how WinTheWeek looks</Text>
          </View>
        </View>
        <View style={styles.themeSelect}>
          <SegmentedToggle
            value={isDark ? 'dark' : 'light'}
            onChange={(v) => setIsDark(v === 'dark')}
            options={[
              { value: 'light', label: 'Light', icon: <SunIcon size={14} color={!isDark ? colors.accent : colors.inkSoft} /> },
              { value: 'dark', label: 'Dark', icon: <MoonIcon size={14} color={isDark ? colors.accent : colors.inkSoft} /> },
            ]}
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>Routines</Text>
      <View style={[styles.card, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg }, shadowCard]}>
        <PressScale scaleTo={0.99} onPress={openRoutineManager} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft }]}>
            <RepeatIcon size={15} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Manage routines</Text>
            <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
              Edit a routine's color and days, or remove it
            </Text>
          </View>
          <ChevronRightIcon size={15} color={colors.muted} />
        </PressScale>
      </View>

      <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>Notifications</Text>
      <View style={[styles.card, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg }, shadowCard]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Daily reminder</Text>
            <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
              A nudge each morning to check today's plan
            </Text>
          </View>
          <Switch value={dailyReminder} onValueChange={setDailyReminder} />
        </View>
        <View style={[styles.row, styles.rowBorder, { borderTopColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Week starts Monday</Text>
            <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
              Applies to the week view and planning
            </Text>
          </View>
          <Switch value={weekStartsMonday} onValueChange={setWeekStartsMonday} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
  },
  headline: {
    fontSize: 22,
  },
  sectionLabel: {
    fontSize: 13,
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 24,
    marginBottom: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14.5,
  },
  rowSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  themeSelect: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
});
