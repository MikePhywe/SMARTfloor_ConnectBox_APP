import { Button, StyleSheet, View } from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Text } from '@/components/Themed';
import Slider from '@react-native-community/slider';
import { useBLEContext } from "@/contexts/BLEContext";
import { TextInput } from 'react-native-paper';
import { Communication } from '@/constants/bleTypes';

export default function TabFourScreen() {
    const { sendCommand, connectedDevice } = useBLEContext();

    // State for RGB and Brightness
    const [red, setRed] = useState<number>(255);
    const [green, setGreen] = useState<number>(0);
    const [blue, setBlue] = useState<number>(0);
    const [brightness, setBrightness] = useState<number>(1); // Brightness (0-1)
    const [index, setIndex] = useState<number>(0);

    // State to save the color in a string format
    const [selectedColor, setSelectedColor] = useState<string>(`rgb(255, 0, 0)`);
    const [previewColor, setPreviewColor] = useState<string>(`rgb(255, 0, 0)`);

    // Use a ref to track if the user is actively interacting with a slider
    const isSliderActiveRef = useRef(false);
    // Variable for the timeout from the Debounce function
    const debouncedSetPreviewColorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Send color to device (only when the user releases the slider)
    const sendColorToDevice = useCallback(() => {
        sendCommand(Communication.BLE_COMMANDS.SET_LED_COLOR, { red, green, blue, index });
        console.log('Color data sent via Bluetooth:', { red, green, blue, index });
    }, [sendCommand, red, green, blue, index]);

    const sendBrightnessToDevice = useCallback(() => {
        sendCommand(Communication.BLE_COMMANDS.SET_LED_COLOR, { brightness });
        console.log(`Brightness data sent via Bluetooth: ${brightness * 255}`);
    }, [sendCommand, brightness]);

    // Function for Debouncing
    const debouncedSetPreviewColor = useCallback((newColor: string) => {
        if (debouncedSetPreviewColorTimeout.current) {
            clearTimeout(debouncedSetPreviewColorTimeout.current);
        }
        debouncedSetPreviewColorTimeout.current = setTimeout(() => {
            setPreviewColor(newColor);
            debouncedSetPreviewColorTimeout.current = null;
        }, 100); // Debounce-Verzögerung von 100ms
    }, []);

    // Update selectedColor and previewColor
    useEffect(() => {
        const rgb = `rgb(${red}, ${green}, ${blue})`;
        setSelectedColor(rgb);
        if (!isSliderActiveRef.current) {
            setPreviewColor(rgb);
        } else {
            debouncedSetPreviewColor(rgb);
        }
    }, [red, green, blue, debouncedSetPreviewColor]);

    // Helper to handle slider changes
    const handleSliderChange = useCallback((value: number, setter: (value: (prev: number) => number) => void) => {
        setter((prev) => value === prev ? prev : value);
    }, []);
    const handleSliderStart = useCallback(() => {
        isSliderActiveRef.current = true;
    }, []);
    const handleSliderEnd = useCallback((sendCallback: ()=>void) => {
        isSliderActiveRef.current = false;
        sendCallback();
    },[]);

    return (
        <View style={styles.container}>
            <TextInput keyboardType='numeric' style={styles.input} value={index.toString()} onChangeText={(test) => {
                const ind = Number(test[test.length-1]);
                console.log({ind})
                setIndex(ind);
                }}/>

            <Text style={styles.text}>Selected Color: {selectedColor}</Text>
                        <View style={[styles.colorPreview, { backgroundColor: previewColor }]} />
            
            <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Red</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    // value={red}
                    step={1}
                    onValueChange={(value) => handleSliderChange(value, setRed)}
                    onSlidingStart={handleSliderStart}
                    onSlidingComplete={()=>handleSliderEnd(sendColorToDevice)}
                    minimumTrackTintColor="#000000"
                    maximumTrackTintColor={`rgb(255, 0, 0)`}
                />
            </View>
            <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Green</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    step={1}
                    // value={green}
                    onValueChange={(value) => handleSliderChange(value, setGreen)}
                    onSlidingStart={handleSliderStart}
                    onSlidingComplete={()=>handleSliderEnd(sendColorToDevice)}
                    minimumTrackTintColor="#000000"
                    maximumTrackTintColor={`rgb(0, 255, 0)`}
                />
            </View>
            <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Blue</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    step={1}
                    // value={blue}
                    onValueChange={(value) => handleSliderChange(value, setBlue)}
                    onSlidingStart={handleSliderStart}
                    onSlidingComplete={()=>handleSliderEnd(sendColorToDevice)}
                    minimumTrackTintColor="#000000"
                    maximumTrackTintColor={`rgb(0, 0, 255)`}
                />
            </View>
            <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Brightness</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    step={1}
                    // value={brightness}
                    onValueChange={(value) => handleSliderChange(value, setBrightness)}
                    onSlidingStart={handleSliderStart}
                    onSlidingComplete={()=>handleSliderEnd(sendBrightnessToDevice)}
                    minimumTrackTintColor="#000000"
                    maximumTrackTintColor="#ffffff"
                />
            </View>
            <Button
                title="Send Color"
                onPress={sendColorToDevice}
                disabled={!connectedDevice}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 20,
        marginBottom: 20,
        color: '#000',
    },
    input: {
        maxHeight: 40,
        fontSize: 20,
        // marginBottom: 20,
        color: '#000',
    },
    sliderContainer: {
        width: '100%',
        marginBottom: 20,
    },
    sliderLabel: {
        marginBottom: 10,
        color: '#000',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    colorPreview: {
        width: 50,
        height: 50,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#000',
    },
});
