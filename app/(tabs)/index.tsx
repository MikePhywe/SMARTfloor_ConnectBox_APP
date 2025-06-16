import { Button, StyleSheet, View, Alert, ScrollView, Platform } from 'react-native';
import React, { useState, useEffect, useRef } from "react";
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text } from '@/components/Themed';
import DeviceModal from "@/components/DeviceConnectionModal";
import FilesModal, { fileItemListProperties } from "@/components/ViewFiles";
import SetDeviceWlan from '@/components/ConnectDeviceToWLAN';
import { WifiEntry } from 'react-native-wifi-reborn';
import { v4 as uuidv4 } from 'uuid';
import SdCardModal, { performOTAUpdate, uploadGenericFileToEspSDCard } from '@/components/SDCard'; // uploadGenericFileToEspSDCard importieren
import { useBLEContext } from "@/contexts/BLEContext";
import { Communication } from '@/constants/bleTypes';
import { ProgressBar } from 'react-native-paper';


// Interface for modal Items
interface modalItem {
  id: string;
  title: string;
  size: number;
  type: string
}

export default function TabOneScreen() {
  // Destructure functions and data from the useBLE hook
  const {
    sendCommand,
    askForSDCard,
    allDevices,
    connectedDevice,
    connectToDevice,
    disconnectDevice,
    receivedData,
    notiviedData,
    logData,
    // Annahme: connectedDeviceIp wird vom BLEContext bereitgestellt, nachdem der ESP seine IP gemeldet hat.
    // Falls nicht, müssen Sie einen anderen Weg finden, die IP zu erhalten.
    // Für dieses Beispiel fügen wir einen Dummy-State hinzu, den Sie anpassen müssen.
    // connectedDeviceIp, 
    requestPermissions,
    scanForPeripherals,
  } = useBLEContext();
  const [espIpForOta, setEspIpForOta] = useState<string | null>(null); // Hier die IP des ESP speichern

  // State variables
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false); // Visibility state for the device modal
  const [FilesModalS, setFilesModalS] = useState<JSX.Element | null>(null); // State for the files modal
  const [isWLANVisible, setIsWLANVisible] = useState<boolean>(false); // Visibility state for the WLAN settings modal
  const [isWebSDCardopen, setWebSDcardopen] = useState(false);
  /**
   * Debug Output States
   */
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const MAX_DEBUG_LINES = 50; // Max number of lines to keep in the debug log
  const scrollViewRef = useRef<ScrollView | null>(null); // Ref für die ScrollView
  /**
   * SD Card File Upload States
   */
  const [isUploadingToSD, setIsUploadingToSD] = useState<boolean>(false);
  const [sdUploadProgress, setSdUploadProgress] = useState<number>(0);
  /**
   * OTA Update States
   */
  const [isOtaUploading, setIsOtaUploading] = useState<boolean>(false);
  const [otaUploadProgress, setOtaUploadProgress] = useState<number>(0);
  const [isPlateScanActive, setIsPlateScanActive] = useState<boolean>(false); // Neuer State für PlateScan
  /**
   * Requests Bluetooth permissions and scans for nearby BLE devices
   */
  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

  /**
   * Hides the device selection modal
   */
  const hideModal = () => {
    setIsModalVisible(false);
  };

  /**
   * Opens the device selection modal and starts scanning for devices
   */
  const openModal = async () => {
    await scanForDevices();
    setIsModalVisible(true);
  };

    /**
   * Opens a modal to show files that are on the SD card
   */
    const openSDCardFilesModal = () => {
      console.log("openSDCardFilesModal aufgerufen"); // Log hinzugefügt
        // Callback function to handle data from the SD card
        const callback = (data: any) => {
          console.log("Callback aufgerufen", data); // Log hinzugefügt
          const keys = Object.keys(data);
          console.log("keys", keys); // Log hinzugefügt
          let tempdata: modalItem[] = [];
          keys.forEach((key) => {
            console.log("key loop",key); // Log hinzugefügt
            if (Array.isArray(data[key])) {
                console.log("if is array"); // Log hinzugefügt
              tempdata = tempdata.concat(
                data[key].map((item: any) => ({
                  id: uuidv4(),
                  title: item.name,
                  size: item.size ?? 0,
                  type: item.type,
                }))
              );
            }
          });
    
          // Update the state to show the FilesModal component
          console.log("vor setFilesModalS"); // Log hinzugefügt
          setFilesModalS(
            <FilesModal
              closeModal={() => setFilesModalS(null)}
              visible={true}
              onClose={(item: fileItemListProperties) => console.log(`closing files modal ${item.title}`)}
              FileItems={tempdata}
            />
          );
          console.log("nach setFilesModalS"); // Log hinzugefügt
        };
    
        // Send command to request SD card directories and files
        console.log("vor sendCommand"); // Log hinzugefügt
        sendCommand(0, "/", { oneTime: true, func: callback, type: 1 });
        console.log("nach sendCommand"); // Log hinzugefügt
      };
    
  /**
   * Handles the OTA update process
   */
  const handleStartOTAUpdate = async () => {
    // Hier müssen Sie die IP-Adresse des ESP32 erhalten.
    // Für dieses Beispiel verwenden wir espIpForOta.
    // In einer echten Anwendung würden Sie diese IP z.B. vom ESP nach WLAN-Verbindung erhalten.
    if (!espIpForOta) { // Ersetzen Sie dies ggf. durch connectedDeviceIp aus dem Context
      Alert.alert(
        "IP-Adresse fehlt",
        "Die IP-Adresse des ESP32 ist nicht bekannt. Bitte stellen Sie sicher, dass das Gerät mit dem WLAN verbunden ist und seine IP-Adresse gemeldet hat."
      );
      return;
    }
    setIsOtaUploading(true);
    setOtaUploadProgress(0);

    const result = await performOTAUpdate(espIpForOta, (progress) => {
      setOtaUploadProgress(progress);
    });

    setIsOtaUploading(false);
    Alert.alert(result.success ? "OTA Status" : "OTA Fehler", result.message);
  };

  /**
   * Handles copying a file to the ESP's SD card using the new picker function
   */
  const handleUploadFileToSDCardWithPicker = async () => {
    if (!espIpForOta) {
      Alert.alert("IP-Adresse fehlt", "Die IP-Adresse des ESP32 ist nicht bekannt. Bitte stellen Sie sicher, dass das Gerät mit dem WLAN verbunden ist.");
      return;
    }

    // Optional: Den Benutzer nach einem Zielpfad fragen.
    // Für dieses Beispiel verwenden wir das Root-Verzeichnis.
    // Du könntest Alert.prompt verwenden, um den Benutzer zu fragen:
    // const destinationPathOnSD = await new Promise<string | undefined>(resolve => Alert.prompt("Zielpfad", "Bitte gib den Zielpfad auf der SD-Karte ein (z.B. /uploads):", text => resolve(text || "/")));
    const destinationPathOnSD = "/"; // Standardmäßig Root

    setIsUploadingToSD(true);
    setSdUploadProgress(0);

    const result = await uploadGenericFileToEspSDCard(
      espIpForOta,
      (progress) => {
        setSdUploadProgress(progress);
      },
      destinationPathOnSD
    );

    setIsUploadingToSD(false);
    Alert.alert(result.success ? "SD Karten Upload" : "SD Karten Upload Fehler", result.message);
  };

  // useEffect cleanup function
  useEffect(() => {
    return () => {
      if (FilesModalS !== null) {
        setFilesModalS(null); // Clean up the FilesModal component
      }
    };
  }, [FilesModalS]);

  // Beispiel: Setzen der ESP IP für OTA (muss durch Ihre Logik ersetzt werden)
  useEffect(() => {
    if (connectedDevice) {
      // Annahme: Nachdem der ESP mit WLAN verbunden ist, sendet er seine IP.
      // Hier simulieren wir das Setzen der IP.
      // In Ihrer App würden Sie auf eine Bluetooth-Nachricht vom ESP lauschen.
      // setEspIpForOta("192.168.1.100"); // Beispiel-IP, ersetzen!
      setTimeout(() => sendCommand(Communication.BLE_COMMANDS.GET_WLAN_DATA, {}, {
        oneTime: true, 
        func: (ipData) => {
          setEspIpForOta(ipData.ip);
        }
      }), 5000);

    } else {
      setEspIpForOta(null);
    }
  }, [connectedDevice]);

  // Effect to handle incoming debug messages from ESP (assuming they come via notiviedData)
  useEffect(() => {
    // Prüfen, ob logData ein Objekt ist und die erwarteten Felder 'type' und 'data' hat
    if (logData && typeof logData === 'object' && logData.hasOwnProperty('data') && typeof logData.data === 'string' && logData.hasOwnProperty('type')) {
      const messageData = logData.data.trim();
      const messageType = logData.type.toUpperCase(); // z.B. INFO, ERROR

      if (messageData === "") return; // Keine leeren Nachrichten loggen

      setDebugLog(prevLog => {
        // Formatierte Nachricht mit Typ und Zeitstempel
        const formattedMessage = `[${new Date().toLocaleTimeString()}] [${messageType}] ${messageData}`;
        const newLog = [formattedMessage, ...prevLog];
        
        if (newLog.length > MAX_DEBUG_LINES) {
          return newLog.slice(0, MAX_DEBUG_LINES);
        }
        return newLog;
      });
    }
  }, [logData]);

  function openWebSdCard(): void {
    setFilesModalS(
      <SdCardModal
        onClose={() => setFilesModalS(null)}
        isVisible={true}
        espIp={espIpForOta || undefined} // Übergebe die IP, falls vorhanden
      />
    );
  }

  const confirmClearUserCredentials = () => {
    Alert.alert(
      "Benutzerdaten löschen",
      "Sollen wirklich alle Benutzerdaten auf dem Gerät unwiderruflich gelöscht werden?",
      [
        {
          text: "Abbrechen",
          style: "cancel"
        },
        { 
          text: "Löschen", 
          onPress: () => sendCommand(Communication.BLE_COMMANDS.RESET_USER_DATA, {}),
          style: "destructive"
        }
      ]
    );
  };
  const togglePlateScan = () => {
    const newState = !isPlateScanActive;
    sendCommand(
      Communication.BLE_COMMANDS.INPTERRUPT_VOLTPORTS, 
      { setInterrupt: newState }, 
      { oneTime: true, func: (data) => {
        console.log("PlateScan command response:", data);
        setIsPlateScanActive(data.getInterrupt);
        setIsPlateScanActive(newState); // Zustand nach erfolgreichem Senden aktualisieren
      }, type: Communication.BLE_COMMANDS.INPTERRUPT_VOLTPORTS }
    );
  };
  const clearDebugLog = () => {
    setDebugLog([]);
  };

  // UI rendering
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      {/* Conditional rendering based on connection status */}
      {connectedDevice ? (
        // If a device is connected
        <View style={styles.connectedContainer}>
          <Text>Connected to: {connectedDevice.name}</Text>
          {/* <Text>Letzte empfangene Daten (Received): {JSON.stringify(receivedData)}</Text> */}
          <Text>Notification Data: {notiviedData}</Text>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Button title="Disconnect" onPress={disconnectDevice} />
            <Button title="Connect to WLAN" onPress={() => setIsWLANVisible(true)} />
            <Button title="Clear User Credentials" onPress={confirmClearUserCredentials} />
            <Button title={isPlateScanActive ? "Turn off PlateScan" : "Turn on PlateScan"} onPress={togglePlateScan} />
            <Button title="SD Card Directories" onPress={openSDCardFilesModal} />
            <Button title="Websocket SD Card" onPress={openWebSdCard} disabled={!espIpForOta}/>
            <Button
              title="Firmware Update (OTA)"
              onPress={handleStartOTAUpdate}
              disabled={!connectedDevice || isOtaUploading || !espIpForOta}
            />
            {isOtaUploading && (
              <ProgressBar progress={otaUploadProgress} color="#007AFF" style={{ marginTop: 10, width: '100%' }} />
            )}
            <Button
              title="Datei auf SD-Karte kopieren"
              onPress={handleUploadFileToSDCardWithPicker}
              disabled={!connectedDevice || isUploadingToSD || !espIpForOta}
            />
            {isUploadingToSD && (
              <ProgressBar progress={sdUploadProgress} color="#34C759" style={{ marginTop: 10, width: '100%' }} />
            )}
          </View>

          {/* ESP Debug Output Window */}
          <View style={styles.debugWindowContainer}>
            <View style={styles.debugHeader}>
              <Text style={styles.debugTitle}>ESP Debug Log</Text>
              <Button title="Clear" onPress={clearDebugLog} color="#FF3B30" />
            </View>
            <ScrollView 
            style={styles.debugScrollView} 
            contentContainerStyle={styles.debugScrollViewContent} 
            ref={scrollViewRef} // Ref hier zuweisen
            onContentSizeChange={() => { 
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({animated: true}); 
              }
            }}>
              {debugLog.length === 0 ? (
                <Text style={styles.debugPlaceholder}>Warte auf Debug-Nachrichten...</Text>
              ) : (
                debugLog.map((msg, index) => <Text key={index} style={styles.debugMessage}>{msg}</Text>)
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        // If no device is connected
        <View style={styles.notConnectedContainer}>
          <Button title="Connect" onPress={openModal} />
          {/* Device connection modal */}
          <DeviceModal
            closeModal={hideModal}
            visible={isModalVisible}
            connectToPeripheral={connectToDevice}
            devices={allDevices}
          />
        </View>
      )}

      {/* WLAN settings modal */}
      <SetDeviceWlan
        visible={isWLANVisible}
        closeModal={(passwd: string, wlan: WifiEntry | undefined) => {
          setIsWLANVisible(false); // Modal immer schließen
          if (wlan) {
            // Annahme: SET_WIFI_CREDENTIALS ist der Befehlscode zum Setzen der WLAN-Daten
            sendCommand(Communication.BLE_COMMANDS.SET_WLAN_CREDENTIALS, { ...wlan, passwd });
            // Hier wäre ein guter Ort, um den ESP anzuweisen, seine neue IP-Adresse zu senden,
            // oder die App könnte nach einer kurzen Verzögerung versuchen, die IP abzufragen.
            // Beispiel (konzeptionell):
            setTimeout(() => sendCommand(Communication.BLE_COMMANDS.GET_WLAN_DATA, {}, {oneTime: true, func: (ipData) => setEspIpForOta(ipData.ip)}), 5000);
            Alert.alert("WLAN Konfiguriert", "Der ESP verbindet sich nun mit dem WLAN. Bitte warten Sie einen Moment, bis die IP-Adresse für weitere Funktionen (OTA, Websocket SD) verfügbar ist.");
          }
        }}
       
      />
      {/* Show SD card files modal */}
      {FilesModalS}
      {/* <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" /> */}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%', // Set the width to 90% of the screen width
  },
  notConnectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    width: '100%', // Set the width to 100% of the connectedContainer width
    padding: 10,
    justifyContent: 'space-around',
    gap: 10
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  debugWindowContainer: {
    width: '100%',
    marginTop: 15,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 5, // Kleineres Padding für den Container
    maxHeight: 150, // Maximale Höhe für das Debug-Fenster
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 5, // Padding für den Header-Inhalt
  },
  debugTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  debugScrollView: {
    flexGrow: 1, // Wichtig, damit ScrollView innerhalb von maxHeight funktioniert
    backgroundColor: '#f9f9f9', // Leichter Hintergrund für den Scroll-Bereich
  },
  debugScrollViewContent: {
    padding: 5, // Padding für den Inhalt der ScrollView
  },
  debugMessage: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospace für bessere Lesbarkeit
    marginBottom: 2,
  },
  debugPlaceholder: {
    fontSize: 10,
    color: '#aaa',
    fontStyle: 'italic',
  }
});
