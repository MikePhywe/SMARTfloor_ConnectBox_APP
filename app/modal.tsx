import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View, Dimensions } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import Puzzle from '@/components/Puzzle';
import Svg, { Polygon } from 'react-native-svg';
import { useBLEContext } from "@/contexts/BLEContext";
import { Communication } from '@/constants/bleTypes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ModalScreen() {
  const [puzzleWidth, setPuzzleWidth] = useState<number>(0);
  const [puzzleHeight, setPuzzleHeight] = useState<number>(0);

  // Variablen für die Skalierung und Position
  const [puzzleScale, setPuzzleScale] = useState<number>(0.6); // Startwert 0.8 = 80%
  const [hexagonX, setHexagonX] = useState<number>(screenWidth / 2);
  const [hexagonY, setHexagonY] = useState<number>(screenHeight / 2);
  
  const onPuzzleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setPuzzleWidth(width);
    setPuzzleHeight(height);
  };
  const numberOfPuzzles = 6;
  const [puzzleFields, setPuzzleFields] = useState<{visible: boolean, fields: number[]}[]>(
    Array.from({ length: numberOfPuzzles }, () => ({
      visible: false,
      fields: [200, 255, 190, 127, 128, 128, 128, 128]
    })));
  
  const {
      registerCallback,
      sendCommand
    } = useBLEContext();
  useEffect(() => {

    registerCallback( {
      type: Communication.BLE_COMMANDS.SET_VOLTAGE_PORT,
      oneTime: false, 
      id: "plateinfopage", 
      func: (data: any) => {
        console.log("got data in callback function Modalscreen");
        console.log(data);
        if(data.platenumber !== undefined) {
          setPuzzleFields(prevFields => { 
            prevFields[data.platenumber-1].visible = data.connected;
            return [...prevFields];
          });
        } else {
          setPuzzleFields(prevFields => {
            Object.keys(data).every((key, index) => {
              index-=1;
              if(index < 0) {
                index=5;
              }
              prevFields[index].visible = data[key];
              return true;
            })
            return [...prevFields];
          })
          
        }
        
      }})
      sendCommand(Communication.BLE_COMMANDS.SET_VOLTAGE_PORT,{},{
        type: Communication.BLE_COMMANDS.SET_VOLTAGE_PORT,
        oneTime: true, 
        func: (data: any) => {
          console.log("got data in callback function Modalscreen");
          console.log(data);
          if(data.platenumber !== undefined) {
            setPuzzleFields(prevFields => { 
              prevFields[data.platenumber-1].visible = data.connected;
              return [...prevFields];
            });
          } else {
            setPuzzleFields(prevFields => {
              Object.keys(data).every((key, index) => {
                index-=1;
                if(index < 0) {
                  index=5;
                }
                prevFields[index].visible = data[key];
                return true;
              })
              return [...prevFields];
            })
            
          }
          
        }})
  }, []);
  // Funktion zum Berechnen der Positionen
  const calculatePuzzlePositions = (centerWidth: number, index: number) => {
    const radius = centerWidth * 0.7;
    const angle = (Math.PI / 3) * index;

    const x = centerWidth / 2 + radius * Math.cos(angle);
    const y = centerWidth / 2 + radius * Math.sin(angle);

    const puzzleX = x - puzzleWidth / 2;
    const puzzleY = y - puzzleHeight / 2;

    return { x: puzzleX, y: puzzleY };
  };

  // Berechnung der Größe
  const calculatedPuzzleWidth = (screenWidth / 4) * puzzleScale;
  const hexagonSize = calculatedPuzzleWidth * 2;
  const hexagonHeight = (hexagonSize * 2) / Math.sqrt(3);

  // Punkte für das Polygon
  const hexagonPoints = [
    `${hexagonSize / 2},0`,
    `${hexagonSize},${hexagonHeight / 4}`,
    `${hexagonSize},${(hexagonHeight * 3) / 4}`,
    `${hexagonSize / 2},${hexagonHeight}`,
    `0,${(hexagonHeight * 3) / 4}`,
    `0,${hexagonHeight / 4}`,
  ].join(' ');

  // Versatz für Zentrierung
  const hexagonOffsetX = -hexagonSize / 2;
  const hexagonOffsetY = -hexagonHeight / 2;

  return (
    <View style={styles.container}>
      {puzzleWidth > 0 ? (
        <View style={styles.puzzleLayoutWrapper}>
          <View
            style={[styles.hexagonLayout, { width: screenWidth, height: screenHeight }]}
          >
            <Svg
              width={hexagonSize}
              height={hexagonHeight}
              style={[
                styles.realHexagon,
                {
                  left: hexagonX,
                  top: hexagonY,
                  transform: [
                    { translateX: hexagonOffsetX },
                    { translateY: hexagonOffsetY },
                    //{ rotate: '30deg' },
                  ],
                },
              ]}
            >
              <Polygon
                points={hexagonPoints}
                fill="lightblue"
                stroke="black"
                strokeWidth="2"
              />
            </Svg>

            {puzzleFields.map((fields, index) => {
              const { x, y } = calculatePuzzlePositions(hexagonSize + 70, index);
              return (
                fields.visible && (
                <View
                  key={index}
                  style={[
                    styles.puzzleContainer,
                    {
                      left: x- 35 + hexagonX - hexagonSize / 2,
                      top: y - 20+ hexagonY - hexagonHeight / 2,
                    },
                  ]}
                >
                  <Puzzle
                    fields={fields.fields}
                    width={calculatedPuzzleWidth}
                    onLayout={onPuzzleLayout}
                  />
                </View>
              ));
            })}
          </View>
        </View>
      ) : (
        <View
          style={{ width: calculatedPuzzleWidth, height: calculatedPuzzleWidth }}
          onLayout={onPuzzleLayout}
        >
          <Puzzle fields={puzzleFields[0].fields} width={calculatedPuzzleWidth} onLayout={onPuzzleLayout} />
        </View>
      )}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    transform: [{ rotate: '90deg' }],
  },
  puzzleLayoutWrapper: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  hexagonLayout: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  realHexagon: {
    position: 'absolute',
  },
  puzzleContainer: {
    position: 'absolute',
    transform: [{ rotate: '180deg' }],
  },
});
