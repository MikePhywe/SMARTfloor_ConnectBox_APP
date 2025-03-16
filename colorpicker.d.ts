declare module 'react-native-reanimated-color-picker' {
    import React from 'react';
    import { StyleProp, ViewStyle } from 'react-native';
    import Animated from 'react-native-reanimated';
  
    export type Color = {
      h: number;
      s: number;
      v: number;
      r: number;
      g: number;
      b: number;
      a: number;
      rgb: string;
      hsv: string;
      hex: string;
    };
  
    export type ColorPickerProps = {
      style?: StyleProp<ViewStyle>;
      value?: Color;
      onComplete?: (color: Color) => void;
      thumbSize?: number;
    };
  
    export type GradientProps = {
        style?: StyleProp<ViewStyle>;
        value?: Color;
    };
    export type HueSliderProps = {
        style?: StyleProp<ViewStyle>;
        value?: Color;
    };
  
    export type OpacitySliderProps = {
        style?: StyleProp<ViewStyle>;
        value?: Color;
    };
  
    export type SaturationProps = {
        style?: StyleProp<ViewStyle>;
        value?: Color;
    };
  
    export type ThumbProps = {
        style?: StyleProp<ViewStyle>;
        value?: Color;
    };
  
    export type UnderlayProps = {
        style?: StyleProp<ViewStyle>;
        value?: Color;
    };
    export type CursorProps = {
        style?: StyleProp<ViewStyle>;
        value?: Color;
    };
  
    export const ColorPicker: React.ComponentType<ColorPickerProps>;
    export const Gradient: React.ComponentType<GradientProps>;
    export const HueSlider: React.ComponentType<HueSliderProps>;
    export const OpacitySlider: React.ComponentType<OpacitySliderProps>;
    export const Saturation: React.ComponentType<SaturationProps>;
    export const Thumb: React.ComponentType<ThumbProps>;
    export const Underlay: React.ComponentType<UnderlayProps>;
    export const Cursor: React.ComponentType<CursorProps>;
    export function makeColor(colorString: string): Color;
  }
