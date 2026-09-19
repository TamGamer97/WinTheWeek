import React from 'react';
import { ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import GroupHeader from '../components/GroupHeader';
import WeekBoard from '../components/WeekBoard';
import WeekNav from '../components/WeekNav';
import { useAppState } from '../state/AppState';
import { parseISODate, weeksBetween } from '../utils/date';

export default function WeekScreen() {
  const { pendingRoutines, openDaySheet, openSettings, openAnalytics, currentWeekStart, todayWeekId, weekId, weekLabel } =
    useAppState();

  const unscheduledCount = pendingRoutines(weekId).length;
  // A past week is a closed record — no planning affordance for it at all,
  // not just per-day restrictions (see docs/DECISIONS.md).
  const isPastWeek = weekId < todayWeekId;

  const offset = weeksBetween(parseISODate(todayWeekId), currentWeekStart);
  const title = offset === 0 ? 'This week' : offset === 1 ? 'Next week' : offset === -1 ? 'Last week' : weekLabel;
  const subtitle = offset === 0 || offset === 1 || offset === -1 ? weekLabel : undefined;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <ScreenHeader title={title} subtitle={subtitle} onOpenSettings={openSettings} onOpenAnalytics={openAnalytics} />
      <WeekNav />
      {isPastWeek ? null : (
        <GroupHeader label="Not scheduled yet" count={unscheduledCount} onPress={() => openDaySheet('unscheduled', weekId)} />
      )}
      <WeekBoard />
    </ScrollView>
  );
}
