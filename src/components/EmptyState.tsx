import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { CheckIcon, PlusMinusEmptyIcon } from '../icons/Icons';
import FadeInUp from './FadeInUp';

type Props = {
  icon: 'plus' | 'check';
  title: string;
  subtitle: string;
};

export default function EmptyState({ icon, title, subtitle }: Props) {
  const { colors } = useTheme();
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
});
