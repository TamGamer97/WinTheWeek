import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';

export default function ProgressRow({ done, total }: { done: number; total: number }) {
  const { colors } = useTheme();
  const pct = total ? (done / total) * 100 : 0;
  const width = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 400, useNativeDriver: false }).start();
  }, [pct, width]);

  return (
    <View style={styles.row}>
      <Text style={[styles.count, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
        {total ? `${done} of ${total} done` : ''}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.line }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: colors.accent,
              width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 6,
  },
  count: {
    fontSize: 13,
  },
  track: {
    width: 64,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
