import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Bid } from '../../packages/game-core/src';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface Props {
  bid: Bid | null;
}

export default function AnimatedBidBanner({ bid }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (!bid) return;
    translateY.value = -20;
    opacity.value = 0;
    scale.value = 0.8;

    translateY.value = withSpring(0, { damping: 12, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 10, stiffness: 250 });
  }, [bid?.quantity, bid?.face]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!bid) return null;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Text style={styles.text}>
        {bid.quantity}× {DICE_FACE[bid.face]}
      </Text>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    backgroundColor: t.surface,
    borderRadius: t.radius,
    padding: 16,
    alignItems: 'center',
  },
  text: { color: t.text, fontSize: 40, fontWeight: '900' },
});
