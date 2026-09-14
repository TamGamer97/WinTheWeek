import { Platform, TextStyle } from 'react-native';

// Font family names, matching the 'Outfit' (headings) / 'Manrope' (body)
// pairing from the original design's Google Fonts import.
export const fonts = {
  headingMedium: 'Outfit_500Medium',
  headingSemiBold: 'Outfit_600SemiBold',
  headingBold: 'Outfit_700Bold',
  bodyRegular: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
};

// Android adds extra leading space above/below custom-font text by default
// (from the font's own metrics), which throws off vertical centering in
// small pills/chips/buttons — icon + label pairs that line up perfectly on
// iOS end up looking off-center on Android. Spread this into a Text's
// style array wherever it sits next to an icon or inside a tight button.
export const androidTextFix: TextStyle = Platform.select({
  android: { includeFontPadding: false, textAlignVertical: 'center' },
  default: {},
}) as TextStyle;
