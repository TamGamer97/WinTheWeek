import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChartBarIcon, GearIcon } from '../icons/Icons';
import IconButton from './IconButton';
import SlideDayTransition from './SlideDayTransition';

type Props = {
  title: string;
  subtitle?: string;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
  paddingBottom?: number;
  transitionDayKey?: string;
  transitionDirection?: 'left' | 'right' | null;
};

export default function ScreenHeader({
  title,
  subtitle,
  onOpenSettings,
  onOpenAnalytics,
  paddingBottom = 14,
  transitionDayKey,
  transitionDirection,
}: Props) {
  const { colors } = useTheme();
  const heading = (
    <View style={{ flex: 1 }}>
      <Text style={[styles.headline, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          numberOfLines={1}
          style={[styles.subhead, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyRegular }]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.top, { paddingBottom }]}>
      <View style={styles.row}>
        {transitionDayKey ? (
          <View style={{ flex: 1 }}>
            <SlideDayTransition dayKey={transitionDayKey} direction={transitionDirection ?? null}>{heading}</SlideDayTransition>
          </View>
        ) : (
          heading
        )}
        <View style={styles.actions}>
          {onOpenAnalytics ? (
            <IconButton onPress={onOpenAnalytics}>
              <ChartBarIcon color={colors.ink} />
            </IconButton>
          ) : null}
          <IconButton onPress={onOpenSettings}>
            <GearIcon color={colors.ink} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  headline: {
    fontSize: 27,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  subhead: {
    fontSize: 13.5,
    marginTop: 5,
  },
});
