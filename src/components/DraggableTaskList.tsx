import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, PanResponderInstance, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RoutineInstance } from '../data/types';
import { useAppState } from '../state/AppState';
import { GripIcon } from '../icons/Icons';
import TaskRow from './TaskRow';

const GAP = 12;
const DEFAULT_ROW_HEIGHT = 74;

function routineIdOf(instanceId: string): number {
  return Number(String(instanceId).split('::')[0]);
}

// A day's task list on Today, with press-and-drag reordering via a grip
// handle on each row. Built on plain PanResponder + Animated (no gesture
// handler / Reanimated in this project): every row keeps an Animated `top`
// that eases it into its slot whenever the order changes, while the row
// actively being dragged tracks the finger directly via a native-driven
// `translateY` — so the list underneath it reflows smoothly as it passes.
export default function DraggableTaskList({ tasks }: { tasks: RoutineInstance[] }) {
  const { reorderRoutines } = useAppState();

  const [orderIds, setOrderIds] = useState<number[]>(() => tasks.map((t) => routineIdOf(t.id)));
  const orderRef = useRef(orderIds);
  orderRef.current = orderIds;

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
      for (let i = 0; i < index; i++) y += heightOf(order[i]) + GAP;
      return y;
    },
    [heightOf],
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
      y += heightOf(id) + (i > 0 ? GAP : 0);
    });
    return y;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIds, tasks]);

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
        const h = heightOf(order[i]) + GAP;
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
    [dragY, heightOf],
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
      reorderRoutines(order);
    },
    [dragY, getTopAnim, reorderRoutines, topOfIndex],
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
  onLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  task: RoutineInstance;
  top: Animated.Value;
  dragY: Animated.Value;
  dragging: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}) {
  const { colors, radius, shadowPanel } = useTheme();
  const responder = useRef<PanResponderInstance | null>(null);
  if (!responder.current) {
    responder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => onDragStart(),
      onPanResponderMove: (_e, g) => onDragMove(g.dy),
      onPanResponderRelease: () => onDragEnd(),
      onPanResponderTerminate: () => onDragEnd(),
    });
  }

  return (
    <Animated.View
      style={[
        styles.row,
        {
          top,
          transform: dragging ? [{ translateY: dragY }, { scale: 1.025 }] : [],
          zIndex: dragging ? 10 : 1,
          elevation: dragging ? 8 : 0,
        },
        dragging && shadowPanel,
      ]}
      onLayout={onLayout}
    >
      <View style={styles.rowInner}>
        <View style={styles.rowTask}>
          <TaskRow task={task} animate={false} todayStyle style={styles.taskNoMargin} />
        </View>
        <View
          {...responder.current.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 16 }}
          style={[styles.handle, { borderRadius: radius.sm }]}
        >
          <GripIcon color={colors.muted} />
        </View>
      </View>
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
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTask: {
    flex: 1,
    minWidth: 0,
  },
  handle: {
    width: 30,
    height: 44,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskNoMargin: {
    marginBottom: 0,
  },
});
