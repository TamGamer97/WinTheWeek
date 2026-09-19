import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IllustrationProps = {
  size?: number;
  color?: string;
  accentColor?: string;
  accentSoftColor?: string;
};

// Every onboarding illustration is hand-drawn `react-native-svg` line art —
// the same stroke-based conventions as `src/icons/Icons.tsx` (no filled
// cartoon artwork, no imported images), just scaled up for a slide instead
// of a button. Each one fills most of its 120x120 viewBox (roughly 55-70%
// on both axes) rather than sitting as a small mark in a lot of empty
// space — the earlier, smaller version read as thin/unfinished.

// A week of bars, one filled and checked — slide 1's "here's the whole
// idea" image.
export function WelcomeIllustration({ size = 120, color = '#D6D3D1', accentColor = '#3860E8', accentSoftColor = '#E9EEFD' }: IllustrationProps) {
  const bars = [
    { x: 16, h: 34 },
    { x: 32, h: 50 },
    { x: 48, h: 68 },
    { x: 64, h: 42 },
    { x: 80, h: 58 },
    { x: 96, h: 30 },
  ];
  const baseline = 96;
  const activeIndex = 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {bars.map((b, i) => {
        const active = i === activeIndex;
        return (
          <Rect
            key={b.x}
            x={b.x}
            y={baseline - b.h}
            width={10}
            height={b.h}
            rx={5}
            fill={active ? accentColor : accentSoftColor}
            stroke={active ? accentColor : color}
            strokeWidth={1.5}
          />
        );
      })}
      <Path
        d={`M${bars[activeIndex].x + 2} ${baseline - bars[activeIndex].h + 14}l3 3.4 6-7.2`}
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 100h92" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// A repeat arrow orbiting a few day-dots — slide 2's "pick your days" image.
export function PlanIllustration({ size = 120, color = '#D6D3D1', accentColor = '#3860E8', accentSoftColor = '#E9EEFD' }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={38} stroke={color} strokeWidth={1.5} />
      <Path
        d="M83 40a32 32 0 0 0-50 9.3M37 80a32 32 0 0 0 50-9.3"
        stroke={accentColor}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path d="M31.5 41.5l0 8.6h8.6" stroke={accentColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M88.5 78.5l0-8.6h-8.6" stroke={accentColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={60} cy={60} r={16} fill={accentSoftColor} stroke={accentColor} strokeWidth={1.5} />
      <Path d="M52.5 60.2l5 5 10-10.4" stroke={accentColor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// A checkmark settling into a progress ring — slide 3's "tap it done" image.
export function TrackIllustration({ size = 120, color = '#D6D3D1', accentColor = '#3860E8', accentSoftColor = '#E9EEFD' }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={40} stroke={color} strokeWidth={1.5} />
      <Path d="M60 20a40 40 0 0 1 28.3 68.3" stroke={accentColor} strokeWidth={3.2} strokeLinecap="round" />
      <Circle cx={60} cy={60} r={22} fill={accentSoftColor} />
      <Path d="M48.5 61l7.5 7.5L74 47" stroke={accentColor} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// A small ascending bar chart with a trend line — slide 4's "see it add up"
// image, matching ChartBarIcon's shape at a larger, centered scale.
export function InsightsIllustration({ size = 120, color = '#D6D3D1', accentColor = '#3860E8' }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Path d="M30 92V64" stroke={color} strokeWidth={7} strokeLinecap="round" />
      <Path d="M60 92V44" stroke={color} strokeWidth={7} strokeLinecap="round" />
      <Path d="M90 92V26" stroke={accentColor} strokeWidth={7} strokeLinecap="round" />
      <Path d="M24 58l18-13 18 10 24-22" stroke={accentColor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={84} cy={33} r={4} fill={accentColor} />
      <Path d="M18 92h84" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
