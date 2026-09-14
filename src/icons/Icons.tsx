import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
};

export function GearIcon({ size = 18, color = '#12141C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.8l1.1 1.9a7.9 7.9 0 0 1 1.8.8l2.1-.6 1.4 1.4-.6 2.1c.3.6.6 1.2.8 1.8l1.9 1.1v1.9l-1.9 1.1a7.9 7.9 0 0 1-.8 1.8l.6 2.1-1.4 1.4-2.1-.6a7.9 7.9 0 0 1-1.8.8L12 21.8h-1.9L9 19.9a7.9 7.9 0 0 1-1.8-.8l-2.1.6-1.4-1.4.6-2.1a7.9 7.9 0 0 1-.8-1.8l-1.9-1.1v-1.9l1.9-1.1c.2-.6.5-1.2.8-1.8l-.6-2.1 1.4-1.4 2.1.6A7.9 7.9 0 0 1 9 4.7l1.1-1.9H12Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={2.7} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 18, color = '#12141C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M11 3.5L5.5 9L11 14.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 14, color = '#8B90A0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path
        d="M5.2 2.5L9.8 7L5.2 11.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 12, color = '#fff' }: IconProps) {
  const w = size;
  const h = (size * 9) / 12;
  return (
    <Svg width={w} height={h} viewBox="0 0 12 9" fill="none">
      <Path d="M1 4.5L4.2 7.5L11 1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DotsIcon({ size = 16, color = '#8B90A0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={3} r={1.3} fill={color} />
      <Circle cx={8} cy={8} r={1.3} fill={color} />
      <Circle cx={8} cy={13} r={1.3} fill={color} />
    </Svg>
  );
}

export function EditIcon({ size = 17, color = '#8B90A0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M3.5 14.8V17h2.2L16.8 5.9a1.55 1.55 0 0 0-2.2-2.2L3.5 14.8Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="m12.9 4.6 2.5 2.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function TrashIcon({ size = 17, color = '#D9483F' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M4.5 6.2h11M8 3.8h4M6 6.2l.7 10h6.6l.7-10M8.5 9v4.5M11.5 9v4.5" stroke={color} strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function RemoveDayIcon({ size = 17, color = '#8B90A0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7.2} stroke={color} strokeWidth={1.4} />
      <Path d="M6.5 10h7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function RepeatIcon({ size = 12, color = '#3860E8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path
        d="M2 6a5 5 0 0 1 8.5-3.5M12 3v3H9M12 8a5 5 0 0 1-8.5 3.5M2 11V8h3"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2V16M2 9H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function WeekNavIcon({ size = 20, color = '#8B90A0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Rect x={1} y={4} width={19} height={16} rx={3} stroke={color} strokeWidth={1.6} />
      <Path d="M1 8.5H20" stroke={color} strokeWidth={1.6} />
      <Path d="M6 1.5V5M15 1.5V5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// A calendar/day-switcher glyph — visually related to WeekNavIcon (the
// bottom nav's Week tab) but its own export so call sites read clearly for
// what they mean ("pick a day") rather than borrowing the nav tab's name.
export function CalendarIcon({ size = 17, color = '#8B90A0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x={2.5} y={4} width={15} height={13.5} rx={2.5} stroke={color} strokeWidth={1.5} />
      <Path d="M2.5 8H17.5" stroke={color} strokeWidth={1.5} />
      <Path d="M6.5 2V5.2M13.5 2V5.2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={7} cy={11.5} r={1} fill={color} />
      <Circle cx={10} cy={11.5} r={1} fill={color} />
      <Circle cx={7} cy={14.5} r={1} fill={color} />
    </Svg>
  );
}

export function TodayNavIcon({ size = 20, color = '#8B90A0' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Circle cx={10.5} cy={10.5} r={4.5} stroke={color} strokeWidth={1.6} />
      <Path
        d="M10.5 1V3M10.5 18V20M20 10.5H18M3 10.5H1M17 4L15.5 5.5M5.5 15.5L4 17M17 17L15.5 15.5M5.5 5.5L4 4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SunIcon({ size = 15, color = '#4E5361' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={9} r={3.2} stroke={color} strokeWidth={1.6} />
      <Path
        d="M9 1.5V3.3M9 14.7V16.5M16.5 9H14.7M3.3 9H1.5M14.2 3.8L12.9 5.1M5.1 12.9L3.8 14.2M14.2 14.2L12.9 12.9M5.1 5.1L3.8 3.8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoonIcon({ size = 15, color = '#4E5361' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M15.2 10.1A6.3 6.3 0 1 1 7.9 2.8a5 5 0 0 0 7.3 7.3Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// The drag handle used on Today's task rows — two columns of grip dots,
// the universal "press and drag to reorder" affordance.
export function GripIcon({ size = 16, color = '#8B90A0' }: IconProps) {
  const cols = [6, 11];
  const rows = [4.5, 9, 13.5];
  return (
    <Svg width={size} height={size} viewBox="0 0 17 18" fill="none">
      {cols.map((cx) => rows.map((cy) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.15} fill={color} />))}
    </Svg>
  );
}

export function PlusMinusEmptyIcon({ size = 18, color = '#3860E8' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2V16M2 9H16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
