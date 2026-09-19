import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { CalendarIcon, EditIcon, RemoveDayIcon } from '../icons/Icons';
import { useAppState } from '../state/AppState';
import { isRetroactiveDay } from '../data/schedule';
import { dayMeta, dayKeyOf, parseISODate, weekIdFor } from '../utils/date';

// This popover only ever acts on the one task instance it was opened for —
// removing or editing the whole routine belongs to Manage Routines, reached
// from the Week screen, not to a long-press on a single day's card. So:
// Edit opens that routine's own edit sheet, the calendar icon jumps
// straight to a day-switcher, and removing this one day is confirmed first
// (an accidental long-press-and-tap here is easy to do).
export default function TaskMenu() {
  const { colors, shadowPanel } = useTheme();
  const {
    menuItemId,
    menuAnchor,
    routines,
    closeTaskMenu,
    menuMoveRoutineDay,
    menuRemoveRoutineDay,
    menuEditRoutine,
    requestConfirm,
    todayIso,
    todayWeekId,
  } = useAppState();

  const open = !!menuItemId && !!menuAnchor;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 180,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [open, progress]);

  if (!open || !menuAnchor || !menuItemId) return null;

  // A past day's task is real history and can't be moved or removed —
  // except a *retroactive* instance (one that only landed here because of a
  // schedule change made after the date itself had already passed; see
  // data/schedule.ts's isRetroactiveDay), which can still be moved or
  // removed since it isn't real history to begin with. "Edit routine" (the
  // routine's template, not this specific day) always applies regardless.
  const [ridStr, menuItemIso] = menuItemId.split('::');
  const routine = routines.find((r) => String(r.id) === ridStr);
  const isPast = menuItemIso < todayIso;
  const isRetroactive =
    isPast &&
    !!routine &&
    isRetroactiveDay(routine, weekIdFor(parseISODate(menuItemIso)), dayKeyOf(parseISODate(menuItemIso)), {
      iso: todayIso,
      weekId: todayWeekId,
    });
  const canEditThisDay = !isPast || isRetroactive;

  const screenWidth = Dimensions.get('window').width;
  const top = menuAnchor.y + menuAnchor.height + 6;
  let right = screenWidth - (menuAnchor.x + menuAnchor.width);
  if (right < 14) right = 14;

  const removeThisDay = () => {
    const id = menuItemId;
    const dayLabel = dayMeta(dayKeyOf(parseISODate(menuItemIso))).label;
    closeTaskMenu();
    requestConfirm({
      title: `Remove from ${dayLabel}?`,
      message: routine
        ? `"${routine.title}" won't be planned for ${dayLabel} this week. You can always add it back.`
        : `This won't be planned for ${dayLabel} this week. You can always add it back.`,
      confirmLabel: 'Remove',
      icon: 'remove',
      onConfirm: () => menuRemoveRoutineDay(id),
    });
  };

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeTaskMenu} />
      <Animated.View
        style={[
          styles.menu,
          shadowPanel,
          {
            top,
            right,
            backgroundColor: colors.paperRaised,
            borderColor: colors.line,
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) },
            ],
          },
        ]}
      >
        <>
          <MenuButton label="Edit routine" onPress={menuEditRoutine} colors={colors} icon={<EditIcon color={colors.inkSoft} />} />
          {canEditThisDay ? (
            <MenuButton label="Switch day" onPress={menuMoveRoutineDay} colors={colors} icon={<CalendarIcon color={colors.inkSoft} />} />
          ) : null}
          {canEditThisDay ? (
            <MenuButton label="Remove this day" onPress={removeThisDay} colors={colors} icon={<RemoveDayIcon color={colors.inkSoft} />} />
          ) : null}
        </>
      </Animated.View>
    </>
  );
}

function MenuButton({
  label,
  onPress,
  colors,
  icon,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  icon: React.ReactNode;
}) {
  const [pressed, setPressed] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.btn, pressed && { backgroundColor: colors.paper }]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    zIndex: 30,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
    flexDirection: 'row',
    gap: 2,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
