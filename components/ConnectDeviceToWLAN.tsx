import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
    Modal,
    SafeAreaView,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    View,
    ActivityIndicator,
    Alert,
} from "react-native";
import {Picker} from '@react-native-picker/picker';
// WifiManager wird nicht mehr direkt hier verwendet, aber WifiEntry als Typ behalten wir vorerst.
import { WifiEntry } from "react-native-wifi-reborn";
import { Communication } from '@/constants/bleTypes'; // Annahme: Befehls-IDs sind hier definiert
import { useBLEContext } from '@/contexts/BLEContext';

type SetDeviceWLANProps = {
    visible: boolean;
    closeModal: (password: string, wlan: WifiEntry | undefined) => void;
    // sendCommandToDevice: (command: Communication.BLE_COMMANDS, data: any, options?: { oneTime?: boolean; func?: (data: any) => void; type?: number }) => void;
};

export const SetDeviceWlan: FC<SetDeviceWLANProps> = (props) => {
    const [selectedWifi, setSelectedWifi] = useState<WifiEntry>();
    const [password, setPassword] = useState('');
    const [wlanList, setWlanList] = useState<WifiEntry[]>([]);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const { sendCommand } = useBLEContext();
    useEffect(() => {
        if (!props.visible) {
            // Clear interval when modal is not visible
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
            return;
        }

        const loadWifisFromESP = async (isInitialLoad: boolean = false) => {
            // Nur Ladeindikator anzeigen, wenn es ein initialer Ladevorgang ist UND die Liste leer ist.
            // Dies reduziert Flackern, falls der useEffect-Hook aufgrund instabiler Props neu ausgelöst wird,
            // während bereits Daten angezeigt werden.
            if (isInitialLoad && wlanList.length === 0) {
                setIsLoading(true);
            }

            const wifiListCallback = (espResponse: { wifis?: WifiEntry[], error?: string }) => {
                setIsLoading(false); // Ladevorgang (ggf. im Hintergrund) abgeschlossen

                if (espResponse.error) {
                    console.error("Error from ESP loading wifi list:", espResponse.error);
                    Alert.alert("Fehler vom Gerät", `WLAN-Liste konnte nicht geladen werden: ${espResponse.error}`);
                    setWlanList([]);
                    setSelectedWifi(undefined);
                    return;
                }

                const list = espResponse.wifis || [];
                setWlanList(list);
                const rawList = espResponse.wifis || [];
                const uniqueWifis: { [ssid: string]: WifiEntry } = {};

                // if (list.length > 0) {
                rawList.forEach(wifi => {
                    if (!wifi.SSID) return; // Skip entries without SSID

                    const existingEntry = uniqueWifis[wifi.SSID];
                    if (!existingEntry || wifi.level > existingEntry.level) {
                        // Add if new, or replace if current signal is stronger
                        uniqueWifis[wifi.SSID] = wifi;
                    }
                });

                const filteredList = Object.values(uniqueWifis);
                // Sort by signal strength (strongest first) as a secondary measure, primarily for Picker display order
                filteredList.sort((a, b) => b.level - a.level);

                setWlanList(filteredList);

                if (filteredList.length > 0) {
                    // Auto-select first if nothing is selected or current selection is not in the new list
                    // if (!selectedWifi || !list.find(w => w.BSSID === selectedWifi.BSSID)) {
                    //     setSelectedWifi(list[0]);}
                    if (!selectedWifi || !filteredList.find(w => w.BSSID === selectedWifi.BSSID)) {
                        setSelectedWifi(filteredList[0]);
                    }
                } else {
                    setSelectedWifi(undefined);
                }
            };

            try {
                // Annahme: GET_WIFI_NETWORKS ist der Befehlscode, um WLANs vom ESP zu laden.
                // Der ESP sollte ein Objekt zurücksenden, z.B. { wifis: [ {SSID: ..., BSSID: ..., ...}, ... ] }
                // oder { error: "Fehlermeldung" }
                sendCommand(
                    Communication.BLE_COMMANDS.GET_WLAN_NETWORKS, // Ersetze dies mit der korrekten Befehls-ID
                    {}, // Daten, die mit dem Befehl gesendet werden (hier leer)
                    { oneTime: true, func: wifiListCallback } // Optionen mit Callback
                );
            } catch (error) {
                console.error("Error sending command to ESP for wifi list:", error);
                Alert.alert("Kommunikationsfehler", "Konnte keine WLAN-Liste vom Gerät anfordern.");
                // Stelle sicher, dass der Ladezustand zurückgesetzt wird, falls er aktiv war.
                if (isLoading) { // Prüfe den aktuellen Zustand, um unnötige Set-Aufrufe zu vermeiden
                    setIsLoading(false);
                }
                setWlanList([]);
                setSelectedWifi(undefined);
            }
        };

        loadWifisFromESP(true); // Initial load
        intervalIdRef.current = setInterval(() => loadWifisFromESP(false), 30000); // Refresh every 30 seconds

        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [props.visible]); // Effekt neu ausführen, wenn sich Sichtbarkeit oder sendCommandToDevice ändert

    const handleConnect = () => {
        if (selectedWifi) {
            props.closeModal(password, selectedWifi);
        } else {
            Alert.alert("Auswahl fehlt", "Bitte wählen Sie ein WLAN-Netzwerk aus.");
        }
    };

    // Fallback for onRequestClose, assuming cancellation
    const handleRequestClose = () => {
        props.closeModal("", undefined);
    }

    const handleCancel = () => {
        // Rufe closeModal mit leeren/undefined Werten auf, um einen Abbruch zu signalisieren
        props.closeModal("", undefined);
    };

    const getSignalStrengthIcon = (level: number): string => {
        // RSSI values are typically negative, with values closer to 0 being stronger.
        // These thresholds are examples and might need adjustment based on typical RSSI ranges.
        if (level > -67) return '📶💪'; // Strong
        if (level > -70) return '📶👌'; // Medium
        if (level > -80) return '📶😕'; // Weak
        return '📶🤷';          // Very Weak or unknown
    };

    const isNetworkSecured = (capabilities: string): boolean => {
        // Common security protocols
        const securedKeywords = ['WPA', 'WEP', 'PSK', 'EAP'];
        return securedKeywords.some(keyword => capabilities.toUpperCase().includes(keyword));
    };

    const formatWlanLabel = (wlan: WifiEntry): string => {
        const ssid = wlan.SSID || `(Kein Name) ${wlan.BSSID.substring(0,6)}...`;
        const signalIcon = getSignalStrengthIcon(wlan.level);
        const securityIcon = isNetworkSecured(wlan.capabilities) ? '🔒' : '🔓';
        return `${securityIcon} ${ssid} (${signalIcon})`;
    };
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    return (
        <Modal visible={props.visible} animationType="slide" transparent={true} onRequestClose={handleRequestClose}>
            <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>WLAN konfigurieren</Text>

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                    ) : wlanList.length > 0 ? (
                        <>
                            <Text style={styles.label}>WLAN auswählen:</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={selectedWifi}
                                    onValueChange={(itemValue) => setSelectedWifi(itemValue)}
                                    style={styles.picker}
                                    prompt="WLAN auswählen"
                                >
                                    {wlanList.map((item) => (
                                        <Picker.Item key={item.BSSID} label={formatWlanLabel(item)} value={item} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.label}>Passwort:</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.inputPassword}
                                    placeholder="Passwort eingeben"
                                    secureTextEntry={!isPasswordVisible}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholderTextColor="#8E8E93"
                                />
                                <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeButton}>
                                    <Text style={styles.eyeButtonText}>{isPasswordVisible ? "🙈" : "👁️"}</Text>
                                    {/* Alternativ Text: {isPasswordVisible ? "Verbergen" : "Anzeigen"} */}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <Text style={styles.noWifisText}>Keine WLAN-Netzwerke gefunden. Bitte Berechtigungen prüfen und WLAN aktivieren.</Text>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Text style={styles.buttonText}>Abbrechen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.connectButton, (!selectedWifi || isLoading) && styles.buttonDisabled]}
                            onPress={handleConnect}
                            disabled={!selectedWifi || isLoading}
                        >
                            <Text style={styles.buttonText}>Verbinden</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    modalContent: {
        width: '90%',
        backgroundColor: "#FFFFFF", // Changed from #f2f2f2 for a cleaner look
        borderRadius: 10,
        padding: 20,
        alignItems: 'stretch', // Ensure children stretch
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
        marginTop: 10,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#FFF', // Ensure picker background is white
    },
    picker: {
        height: 50,
        width: '100%',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
        backgroundColor: '#FFF',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20, // Behält den ursprünglichen marginBottom des Inputs bei
    },
    inputPassword: {
        flex: 1, // Nimmt den verfügbaren Platz ein
        height: 50,
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        backgroundColor: '#FFF',
        // Entferne marginBottom hier, da es vom Container gehandhabt wird
    },
    eyeButton: {
        padding: 10,
        position: 'absolute', // Positioniert das Icon absolut innerhalb des Containers
        right: 5, // Abstand vom rechten Rand
        height: '100%', // Nimmt die volle Höhe des Containers ein
        justifyContent: 'center', // Zentriert das Icon vertikal
    },
    eyeButtonText: {
        fontSize: 20, // Passende Größe für das Icon
        color: '#333',
    },
    button: {
        flex: 1, // Damit die Buttons den Platz in der Reihe gleichmäßig aufteilen
        justifyContent: "center",
        alignItems: "center",
        height: 50,
        borderRadius: 8,
        marginTop: 10, // Add some margin top for spacing from inputs
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20, // Etwas mehr Abstand nach oben
        gap: 10, // Abstand zwischen den Buttons
    },
    cancelButton: {
        backgroundColor: "#FF3B30", // iOS red, common for destructive/cancel actions
        marginRight: 5, // Kleiner Abstand zum rechten Button
    },
    connectButton: {
        backgroundColor: "#007AFF", // iOS blue, common for confirm actions
    },
    buttonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "white",
    },
    buttonDisabled: {
        backgroundColor: "#A9A9A9", // Grey out when disabled
    },
    loader: {
        marginVertical: 20,
    },
    noWifisText: {
        textAlign: 'center',
        marginVertical: 20,
        fontSize: 16,
        color: '#555',
    }
    });

export default SetDeviceWlan;