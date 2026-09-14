import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import PressScale from './PressScale';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
};

export default function IconButton({ children, onPress }: Props) {
  const { colors, shadowCard } = useTheme();
  return (
    <PressScale
      scaleTo={0.92}
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: colors.paperRaised, borderColor: colors.lineStrong },
        shadowCard,
      ]}
    >
      {children}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
