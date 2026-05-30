import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface Props {
  face: number;
  size?: number;
  animate?: 'roll' | 'reveal' | 'none';
  delay?: number;
  onAnimationEnd?: () => void;
}

export default function AnimatedDie({ face, size = 40, animate = 'none', delay = 0, onAnimationEnd }: Props) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(animate === 'reveal' ? 0 : 1);

  useEffect(() => {
    if (animate === 'roll') {
      const start = () => {
        rotation.value = withSequence(
          withTiming(15, { duration: 60, easing: Easing.out(Easing.quad) }),
          withTiming(-15, { duration: 60 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(5, { duration: 40 }),
          withTiming(0, { duration: 40 }),
        );
        scale.value = withSequence(
          withTiming(1.15, { duration: 120 }),
          withSpring(1, { damping: 8, stiffness: 200 }, (finished) => {
            if (finished && onAnimationEnd) runOnJS(onAnimationEnd)();
          }),
        );
      };
      if (delay > 0) {
        const timeout = setTimeout(start, delay);
        return () => clearTimeout(timeout);
      }
      start();
    } else if (animate === 'reveal') {
      const start = () => {
        scale.value = withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1.3, { duration: 200, easing: Easing.out(Easing.back(2)) }),
          withSpring(1, { damping: 10, stiffness: 300 }, (finished) => {
            if (finished && onAnimationEnd) runOnJS(onAnimationEnd)();
          }),
        );
        opacity.value = withTiming(1, { duration: 150 });
      };
      if (delay > 0) {
        const timeout = setTimeout(start, delay);
        return () => clearTimeout(timeout);
      }
      start();
    }
  }, [animate, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <Text style={[styles.die, { fontSize: size }]}>{DICE_FACE[face]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  die: { textAlign: 'center' },
});
