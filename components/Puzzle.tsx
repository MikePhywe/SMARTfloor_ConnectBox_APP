import  rgbaToHex from '@/app/utils/rgbaToHex';
import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface PuzzleProps {
  fields: number[];
  width: number;
  onLayout?: (event: any) => void;
}

const Puzzle: React.FC<PuzzleProps> = ({ fields, width, onLayout }) => {
  const puzzleRef = useRef<View>(null);
  const paths = [
    { d: 'M 1.4831249,1.482567 v 0 H 24.224166 v 22.731354 Z', fill: rgbaToHex(60, 29, 108, (((fields[7] - 127) * 100) / 128) * 0.01) },
    { d: 'M 24.224166,24.213921 v 0 H 1.4831249 V 1.482567 Z', fill: rgbaToHex(60, 29, 108, (((fields[6] - 127) * 100) / 128) * 0.01) },
    { d: 'M 26.07245,24.219406 v 0 -22.7313537 h 22.741042 Z', fill: rgbaToHex(60, 29, 108, (((fields[0] - 127) * 100) / 128) * 0.01) },
    { d: 'M 48.813492,1.4880523 v 0 22.7313537 H 26.07245 Z', fill: rgbaToHex(60, 29, 108, (((fields[1] - 127) * 100) / 128) * 0.01) },
    { d: 'M 1.4886123,48.792765 v 0 -22.731353 H 24.229654 Z', fill: rgbaToHex(60, 29, 108, (((fields[5] - 127) * 100) / 128) * 0.01) },
    { d: 'M 24.229654,26.061412 v 0 22.731353 H 1.4886123 Z', fill: rgbaToHex(60, 29, 108, (((fields[4] - 127) * 100) / 128) * 0.01) },
    { d: 'M 26.07245,26.061412 v 0 h 22.741042 v 22.731353 Z', fill: rgbaToHex(60, 29, 108, (((fields[2] - 127) * 100) / 128) * 0.01) },
    { d: 'M 48.813492,48.792765 v 0 H 26.07245 V 26.061412 Z', fill: rgbaToHex(60, 29, 108, (((fields[3] - 127) * 100) / 128) * 0.01) },
  ];
  return (
    <View style={[styles.container, { width: width }]} onLayout={onLayout}>
      <Svg width={width} height={width} viewBox="0 0 50.271 50.271">
        <Path
          key="background"
          d="M.174.174h49.965v49.944H.174Z"
          fill= '#fff'
          stroke= '#000'
          strokeWidth= {0.262918}
          strokeLinecap= 'round'
          strokeMiterlimit= {4}
          strokeDasharray= 'none'
          //paintOrder= 'markers fill stroke'
          // style={{
          //   fill: '#fff',
          //   stroke: '#000',
          // }}
        />
         {paths.map((path, index) => (
          <Path
            key={path.d}
            d={path.d}
            fill={ path.fill}
            fillOpacity= {1}
            stroke= '#000'
            strokeWidth= {0.269255}
            strokeLinecap= 'round'
            strokeLinejoin= 'round'
            //paintOrder= 'markers fill stroke'
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1, // Beibehalten des Seitenverhältnisses, z.B. 1:1 für ein Quadrat
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ... andere Stile ...
});

export default Puzzle;
