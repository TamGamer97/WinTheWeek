import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChevronLeftIcon } from '../icons/Icons';
import { routineColorHex } from '../theme/colors';
import IconButton from '../components/IconButton';
import FadeInUp from '../components/FadeInUp';
import EmptyState from '../components/EmptyState';
import ProgressRingCalendar from '../components/ProgressRingCalendar';
import { useAppState } from '../state/AppState';
import { computeStreaks, monthSummary, routineMonthStats, totalCompleted } from '../data/analytics';
import { addMonths, parseISODate } from '../utils/date';

function StatItem({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, androidTextFix, { color: colors.ink, fontFamily: fonts.headingBold }]}>{value}</Text>
      <Text style={[styles.statLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyMedium }]}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors, radius, shadowCard, isDark } = useTheme();
  const { closeAnalytics, routines, todayIso } = useAppState();
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());

  const streaks = useMemo(() => computeStreaks(routines, todayIso), [routines, todayIso]);
  // The headline stat row is a fixed "right now" snapshot — always the real
  // current month, independent of whatever month the calendar below is
  // browsing — so it can't be misread as "you did 0% this month" just
  // because you navigated the calendar to a future month with no data yet.
  const month = useMemo(() => monthSummary(routines, parseISODate(todayIso), todayIso), [routines, todayIso]);
  const total = useMemo(() => totalCompleted(routines), [routines]);

  const routineStats = useMemo(
    () => routines.map((r) => ({ routine: r, stats: routineMonthStats(r, monthAnchor, todayIso) })),
    [routines, monthAnchor, todayIso],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <IconButton onPress={closeAnalytics}>
          <ChevronLeftIcon color={colors.ink} />
        </IconButton>
        <Text style={[styles.headline, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>
          Analytics
        </Text>
      </View>

      {routines.length === 0 ? (
        <EmptyState icon="plus" title="Nothing to show yet" subtitle="Create a routine to start tracking your progress" />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <FadeInUp duration={280}>
            <View style={styles.statRow}>
              <StatItem value={String(streaks.current)} label="Day streak" />
              <View style={[styles.statDivider, { backgroundColor: colors.line }]} />
              <StatItem value={`${month.percent}%`} label="This month" />
              <View style={[styles.statDivider, { backgroundColor: colors.line }]} />
              <StatItem value={String(total)} label="All-time" />
            </View>
          </FadeInUp>

          <FadeInUp duration={280} delay={40}>
            <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>
              This month
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg },
                shadowCard,
              ]}
            >
              <ProgressRingCalendar
                monthAnchor={monthAnchor}
                onPrevMonth={() => setMonthAnchor((d) => addMonths(d, -1))}
                onNextMonth={() => setMonthAnchor((d) => addMonths(d, 1))}
                routines={routines}
                todayIso={todayIso}
              />
            </View>
          </FadeInUp>

          <FadeInUp duration={280} delay={80}>
            <Text style={[styles.sectionLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>
              Routines
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.lg, padding: 0 },
                shadowCard,
              ]}
            >
              {routineStats.map(({ routine, stats }, i) => {
                const color = routineColorHex(routine.color, isDark);
                const percent = stats.planned === 0 ? null : Math.round((stats.done / stats.planned) * 100);
                return (
                  <View
                    key={routine.id}
                    style={[styles.routineRow, i > 0 && [styles.routineRowBorder, { borderTopColor: colors.line }]]}
                  >
                    <View style={[styles.spine, { backgroundColor: color, borderRadius: radius.sm }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.routineTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}
                      >
                        {routine.title}
                      </Text>
                      <Text style={[styles.routineSub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                        {stats.planned === 0 ? 'Not tracked yet this month' : `${stats.done} of ${stats.planned} days this month`}
                      </Text>
                    </View>
                    {percent !== null && (
                      <Text
                        style={[
                          styles.routinePercent,
                          androidTextFix,
                          { color: percent === 100 ? colors.complete : colors.inkSoft, fontFamily: fonts.headingSemiBold },
                        ]}
                      >
                        {percent}%
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </FadeInUp>
        </ScrollView>
      )}
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
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 26,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11.5,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 34,
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
    padding: 16,
    overflow: 'hidden',
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  routineRowBorder: {
    borderTopWidth: 1,
  },
  spine: {
    width: 4,
    height: 30,
    alignSelf: 'center',
  },
  routineTitle: {
    fontSize: 14.5,
  },
  routineSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  routinePercent: {
    fontSize: 15,
  },
});
