import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  HelpCircleIcon,
  MailIcon,
  MoonIcon,
  RepeatIcon,
  SunIcon,
  TrashIcon,
} from '../icons/Icons';
import IconButton from '../components/IconButton';
import PressScale from '../components/PressScale';
import Switch from '../components/Switch';
import SegmentedToggle from '../components/SegmentedToggle';
import { useAppState } from '../state/AppState';

const CONTACT_EMAIL = 'hello@tamsh.com';
const WEBSITE_HOST = 'wintheweek.tamsh.com';

export default function SettingsScreen() {
  const { colors, radius, shadowCard, isDark, setIsDark } = useTheme();
  const { closeSettings, openRoutineManager, replayTutorial, resetAppData, requestConfirm } = useAppState();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weekStartsMonday, setWeekStartsMonday] = useState(true);

  const confirmReset = () =>
    requestConfirm({
      title: 'Reset app data?',
      message: "This permanently deletes every routine and preference on this device. This can't be undone.",
      confirmLabel: 'Reset',
      icon: 'trash',
      destructive: true,
      onConfirm: () => {
        resetAppData();
        setIsDark(false);
      },
    });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <IconButton onPress={closeSettings}>
          <ChevronLeftIcon color={colors.ink} />
        </IconButton>
        <Text style={[styles.headline, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>Settings</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
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
            <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
              <RepeatIcon size={16} color={colors.accent} />
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

        <View style={styles.sectionLabelRow}>
          <Text style={[styles.sectionLabelText, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>
            Notifications
          </Text>
          <View style={[styles.devBadge, { backgroundColor: colors.line }]}>
            <Text style={[styles.devBadgeText, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>
              In development
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg, opacity: 0.6 },
            shadowCard,
          ]}
        >
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Daily reminder</Text>
              <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                A nudge each morning to check today's plan
              </Text>
            </View>
            <Switch value={dailyReminder} onValueChange={setDailyReminder} disabled />
          </View>
          <View style={[styles.row, styles.rowBorder, { borderTopColor: colors.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Week starts Monday</Text>
              <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                Applies to the week view and planning
              </Text>
            </View>
            <Switch value={weekStartsMonday} onValueChange={setWeekStartsMonday} disabled />
          </View>
        </View>

        <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>Help</Text>
        <View style={[styles.card, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg }, shadowCard]}>
          <PressScale scaleTo={0.99} onPress={replayTutorial} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.highlightSoft, borderRadius: radius.md }]}>
              <HelpCircleIcon size={16} color={colors.highlight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Replay tutorial</Text>
              <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                See the intro and quick tour again
              </Text>
            </View>
            <ChevronRightIcon size={15} color={colors.muted} />
          </PressScale>
        </View>

        <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>Contact</Text>
        <View style={[styles.card, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg }, shadowCard]}>
          <PressScale scaleTo={0.99} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
              <MailIcon size={16} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Email us</Text>
              <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                {CONTACT_EMAIL}
              </Text>
            </View>
            <ChevronRightIcon size={15} color={colors.muted} />
          </PressScale>
          <PressScale
            scaleTo={0.99}
            onPress={() => Linking.openURL(`https://${WEBSITE_HOST}`)}
            style={[styles.row, styles.rowBorder, { borderTopColor: colors.line }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.highlightSoft, borderRadius: radius.md }]}>
              <GlobeIcon size={16} color={colors.highlight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Website</Text>
              <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                {WEBSITE_HOST}
              </Text>
            </View>
            <ChevronRightIcon size={15} color={colors.muted} />
          </PressScale>
        </View>

        <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg }, shadowCard]}>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>Version</Text>
              <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>WinTheWeek release</Text>
            </View>
            <Text style={[styles.version, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyMedium }]}>1.0.0</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>Data</Text>
        <View style={[styles.card, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg }, shadowCard]}>
          <PressScale scaleTo={0.99} onPress={confirmReset} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft, borderRadius: radius.md }]}>
              <TrashIcon size={16} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, androidTextFix, { color: colors.danger, fontFamily: fonts.bodySemiBold }]}>Reset app data</Text>
              <Text style={[styles.rowSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                Erases every routine and preference on this device
              </Text>
            </View>
            <ChevronRightIcon size={15} color={colors.muted} />
          </PressScale>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelText: {
    fontSize: 13,
  },
  devBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  devBadgeText: {
    fontSize: 10.5,
    letterSpacing: 0.3,
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
  version: {
    fontSize: 13,
  },
  themeSelect: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
});
