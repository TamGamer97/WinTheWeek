import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  PanResponderInstance,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RoutineInstance } from '../data/types';
import { useAppState } from '../state/AppState';
import TaskRow from './TaskRow';

const DEFAULT_ROW_GAP = 12;
const DEFAULT_ROW_HEIGHT = 74;
// How long a press has to hold still before it's treated as "picked up"
// (opens the task's menu, same as before, and arms dragging) rather than
// a normal tap or the start of a page scroll.
const LONG_PRESS_MS = 350;

function routineIdOf(instanceId: string): number {
  return Number(String(instanceId).split('::')[0]);
}

function isoOf(instanceId: string): string {
  return String(instanceId).split('::')[1];
}

// A day's task list on Today, with press-and-drag reordering: holding a
// whole card (rather than a separate grip handle) both opens its usual
// options menu and arms it for dragging — move your finger before letting
// go and it reorders instead. Built on plain PanResponder + Animated (no
// gesture handler / Reanimated in this project): every row keeps an
// Animated `top` that eases it into its slot whenever the order changes,
// while the row actively being dragged tracks the finger directly via a
// JS-driven `translateY` — so the list underneath it reflows smoothly as
// it passes.
export default function DraggableTaskList({
  tasks,
  renderTask,
  rowGap = DEFAULT_ROW_GAP,
  locked = false,
}: {
  tasks: RoutineInstance[];
  // The day-planning sheet shares this reorder behaviour but deliberately
  // has a different row design and no task-options menu.
  renderTask?: (task: RoutineInstance) => React.ReactNode;
  // A sheet may use denser rows than the main Today list.
  rowGap?: number;
  // A past day's list is a read-only record — no drag, no long-press menu.
  locked?: boolean;
}) {
  const { reorderRoutinesForDay } = useAppState();

  const [orderIds, setOrderIds] = useState<number[]>(() => tasks.map((t) => routineIdOf(t.id)));
  const orderRef = useRef(orderIds);
  orderRef.current = orderIds;

  // Every task in one list is always the same real day (see `tasksFor` in
  // AppState) — this is what a drag here should reorder, and only this day.
  const dayIsoRef = useRef('');
  if (tasks[0]) dayIsoRef.current = isoOf(tasks[0].id);

  const draggingIdRef = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const taskById = useMemo(() => {
    const m = new Map<number, RoutineInstance>();
    tasks.forEach((t) => m.set(routineIdOf(t.id), t));
    return m;
  }, [tasks]);

  // Stay in sync with upstream changes (a task added/removed, or the day
  // itself changing) as long as nothing is actively mid-drag.
  useEffect(() => {
    if (draggingIdRef.current != null) return;
    const next = tasks.map((t) => routineIdOf(t.id));
    setOrderIds((prev) => {
      if (prev.length === next.length && prev.every((id, i) => id === next[i])) return prev;
      return next;
    });
  }, [tasks]);

  const heightsRef = useRef<Map<number, number>>(new Map());
  const topAnimsRef = useRef<Map<number, Animated.Value>>(new Map());

  const heightOf = useCallback((id: number) => heightsRef.current.get(id) ?? DEFAULT_ROW_HEIGHT, []);

  const topOfIndex = useCallback(
    (order: number[], index: number) => {
      let y = 0;
      for (let i = 0; i < index; i++) y += heightOf(order[i]) + rowGap;
      return y;
    },
    [heightOf, rowGap],
  );

  const getTopAnim = useCallback(
    (id: number, initial: number) => {
      let a = topAnimsRef.current.get(id);
      if (!a) {
        a = new Animated.Value(initial);
        topAnimsRef.current.set(id, a);
      }
      return a;
    },
    [],
  );

  // Ease every non-dragged row into its current slot whenever the order (or
  // a just-measured height) changes.
  useEffect(() => {
    orderIds.forEach((id, index) => {
      if (id === draggingIdRef.current) return;
      const target = topOfIndex(orderIds, index);
      Animated.timing(getTopAnim(id, target), {
        toValue: target,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIds, getTopAnim, topOfIndex]);

  const totalHeight = useMemo(() => {
    let y = 0;
    orderIds.forEach((id, i) => {
      y += heightOf(id) + (i > 0 ? rowGap : 0);
    });
    return y;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIds, rowGap, tasks]);

  const dragY = useRef(new Animated.Value(0)).current;
  const dragStartTopRef = useRef(0);

  const handleLayout = useCallback(
    (id: number, e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (Math.round(heightsRef.current.get(id) ?? -1) !== Math.round(h)) {
        heightsRef.current.set(id, h);
        // Nudge state so the slot-position effect and total-height memo
        // re-run with the freshly-measured height.
        setOrderIds((o) => [...o]);
      }
    },
    [],
  );

  const startDrag = useCallback(
    (id: number) => {
      draggingIdRef.current = id;
      setDraggingId(id);
      const idx = orderRef.current.indexOf(id);
      const top = topOfIndex(orderRef.current, idx);
      dragStartTopRef.current = top;
      dragY.setValue(0);
      getTopAnim(id, top).setValue(top);
    },
    [dragY, getTopAnim, topOfIndex],
  );

  const moveDrag = useCallback(
    (id: number, dy: number) => {
      dragY.setValue(dy);
      const order = orderRef.current;
      const idx = order.indexOf(id);
      const center = dragStartTopRef.current + heightOf(id) / 2 + dy;

      let y = 0;
      let targetIdx = idx;
      for (let i = 0; i < order.length; i++) {
        const h = heightOf(order[i]) + rowGap;
        if (i !== idx && center >= y && center < y + h) {
          targetIdx = i;
          break;
        }
        y += h;
      }

      if (targetIdx !== idx) {
        const next = [...order];
        next.splice(idx, 1);
        next.splice(targetIdx, 0, id);
        setOrderIds(next);
      }
    },
    [dragY, heightOf, rowGap],
  );

  const endDrag = useCallback(
    (id: number) => {
      draggingIdRef.current = null;
      setDraggingId(null);
      const order = orderRef.current;
      const idx = order.indexOf(id);
      const top = topOfIndex(order, idx);
      Animated.spring(dragY, { toValue: 0, useNativeDriver: false, friction: 9, tension: 60 }).start();
      getTopAnim(id, top).setValue(top);
      if (dayIsoRef.current) reorderRoutinesForDay(dayIsoRef.current, order);
    },
    [dragY, getTopAnim, reorderRoutinesForDay, topOfIndex],
  );

  if (!orderIds.length) return null;

  return (
    <View style={{ height: totalHeight }}>
      {orderIds.map((id) => {
        const task = taskById.get(id);
        if (!task) return null;
        const isDragging = draggingId === id;
        const top = getTopAnim(id, topOfIndex(orderIds, orderIds.indexOf(id)));
        return (
          <DraggableRow
            key={id}
            task={task}
            top={top}
            dragY={dragY}
            dragging={isDragging}
            renderTask={renderTask}
            locked={locked}
            onLayout={(e) => handleLayout(id, e)}
            onDragStart={() => startDrag(id)}
            onDragMove={(dy) => moveDrag(id, dy)}
            onDragEnd={() => endDrag(id)}
          />
        );
      })}
    </View>
  );
}

function DraggableRow({
  task,
  top,
  dragY,
  dragging,
  renderTask,
  locked,
  onLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  task: RoutineInstance;
  top: Animated.Value;
  dragY: Animated.Value;
  dragging: boolean;
  renderTask?: (task: RoutineInstance) => React.ReactNode;
  locked?: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}) {
  const { shadowPanel } = useTheme();
  const { openTaskMenu, closeTaskMenu } = useAppState();
  const wrapRef = useRef<View>(null);

  // A quick press-in (any touch) vs. the "picked up" pop once the hold
  // clears LONG_PRESS_MS — two different scales on the same Animated.Value
  // so a plain tap still gets the card's usual tactile feedback.
  const scale = useRef(new Animated.Value(1)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const wiggleLoop = useRef<Animated.CompositeAnimation | null>(null);

  const longPressFiredRef = useRef(false);
  const hasMovedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLongPress = useCallback(() => {
    if (renderTask) return;
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      openTaskMenu(String(task.id), { x, y, width, height });
    });
  }, [openTaskMenu, renderTask, task]);

  const startWiggle = useCallback(() => {
    wiggle.setValue(0);
    wiggleLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 120, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 240, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 120, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    wiggleLoop.current.start();
  }, [wiggle]);

  const stopWiggle = useCallback(() => {
    wiggleLoop.current?.stop();
    wiggleLoop.current = null;
    Animated.timing(wiggle, { toValue: 0, duration: 120, useNativeDriver: true }).start();
  }, [wiggle]);

  const clearLongPressTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const settle = useCallback(() => {
    clearLongPressTimer();
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 140 }).start();
    if (longPressFiredRef.current) {
      stopWiggle();
      onDragEnd();
    }
    longPressFiredRef.current = false;
    hasMovedRef.current = false;
  }, [clearLongPressTimer, onDragEnd, scale, stopWiggle]);

  const responder = useRef<PanResponderInstance | null>(null);
  if (!responder.current) {
    responder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => !locked,
      // Before the hold has cleared LONG_PRESS_MS, let the page's own
      // ScrollView take the touch away from us if it recognizes a scroll —
      // exactly how a normal Pressable already behaves in this app (this
      // is the same negotiation the removed grip handle relied on, just
      // extended to the whole card and gated by our own timer). Once we're
      // actually holding/dragging, refuse to give it up mid-drag.
      onPanResponderTerminationRequest: () => !longPressFiredRef.current,
      onPanResponderGrant: () => {
        longPressFiredRef.current = false;
        hasMovedRef.current = false;
        Animated.timing(scale, { toValue: 0.985, duration: 90, useNativeDriver: true }).start();
        timerRef.current = setTimeout(() => {
          longPressFiredRef.current = true;
          Animated.spring(scale, { toValue: 1.04, useNativeDriver: true, friction: 5, tension: 140 }).start();
          startWiggle();
          handleLongPress();
          onDragStart();
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (_e, g) => {
        if (!longPressFiredRef.current) return;
        if (!hasMovedRef.current && (Math.abs(g.dy) > 2 || Math.abs(g.dx) > 2)) {
          // The card is actually being dragged now, not just held — the
          // menu that opened when the hold fired no longer makes sense
          // anchored to a card that's about to move out from under it.
          hasMovedRef.current = true;
          // Only the Today list opens the task menu on pickup. The day
          // planner has no menu to dismiss when its row starts moving.
          if (!renderTask) closeTaskMenu();
        }
        onDragMove(g.dy);
      },
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    });
  }

  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-1.6deg', '1.6deg'] });

  return (
    <Animated.View
      style={[
        styles.row,
        {
          top,
          transform: dragging ? [{ translateY: dragY }] : [],
          zIndex: dragging ? 10 : 1,
          elevation: dragging ? 8 : 0,
        },
        dragging && shadowPanel,
      ]}
      onLayout={onLayout}
      {...responder.current.panHandlers}
    >
      <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
        <View ref={wrapRef} collapsable={false}>
          {renderTask ? (
            renderTask(task)
          ) : (
            <TaskRow task={task} animate={false} todayStyle interactive={false} style={styles.taskNoMargin} />
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Dragging via a mouse (web) would otherwise select the row's text as
    // the pointer moves across it — touch on iOS/Android has no such
    // concept, but the web build shares this component too.
    ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as const) : null),
  },
  taskNoMargin: {
    marginBottom: 0,
  },
});
