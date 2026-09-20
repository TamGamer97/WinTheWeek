import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { CheckIcon, PlusIcon, PlusMinusEmptyIcon } from '../icons/Icons';
import PressScale from './PressScale';
import FadeInUp from './FadeInUp';

type Props = {
  icon: 'plus' | 'check';
  title: string;
  subtitle: string;
  // An optional follow-up CTA, rendered as part of the same centered block
  // rather than a separate full-width button below it — keeps the empty
  // state reading as one designed unit instead of "icon block + unrelated
  // rectangle."
  action?: { label: string; onPress: () => void };
};

export default function EmptyState({ icon, title, subtitle, action }: Props) {
  const { colors, radius, shadowCard } = useTheme();
  return (
    <FadeInUp duration={280}>
      <View style={styles.wrap}>
        <View style={[styles.mark, { backgroundColor: colors.accentSoft }]}>
          {icon === 'plus' ? (
            <PlusMinusEmptyIcon color={colors.accent} />
          ) : (
            <CheckIcon size={18} color={colors.accent} />
          )}
        </View>
        <Text style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>{title}</Text>
        <Text style={[styles.sub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>{subtitle}</Text>
        {action ? (
          <PressScale
            scaleTo={0.96}
            onPress={action.onPress}
            style={[styles.actionBtn, { backgroundColor: colors.accent, borderRadius: radius.pill }, shadowCard]}
          >
            <PlusIcon size={14} color="#fff" />
            <Text style={[styles.actionText, androidTextFix, { fontFamily: fonts.bodySemiBold }]}>{action.label}</Text>
          </PressScale>
        ) : null}
      </View>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 40,
    marginHorizontal: 24,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13.5,
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 20,
  },
  actionText: {
    color: '#fff',
    fontSize: 14.5,
  },
});
