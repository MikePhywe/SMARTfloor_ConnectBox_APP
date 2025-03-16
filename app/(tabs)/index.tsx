import { Button, StyleSheet, View, Alert } from 'react-native';
import React, { useState, useEffect } from "react";
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text } from '@/components/Themed';
import DeviceModal from "@/components/DeviceConnectionModal";
import FilesModal, { fileItemListProperties } from "@/components/ViewFiles";
import SetDeviceWlan from '@/components/ConnectDeviceToWLAN';
import { WifiEntry } from 'react-native-wifi-reborn';
import { v4 as uuidv4 } from 'uuid';
// import SDCardManager from '@/components/SDCard';
import SdCardModal from '@/components/SDCard';
import { useBLEContext } from "@/contexts/BLEContext";


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
    requestPermissions,
    scanForPeripherals,
  } = useBLEContext();

  // State variables
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false); // Visibility state for the device modal
  const [FilesModalS, setFilesModalS] = useState<JSX.Element | null>(null); // State for the files modal
  const [isWLANVisible, setIsWLANVisible] = useState<boolean>(false); // Visibility state for the WLAN settings modal
  const [isWebSDCardopen, setWebSDcardopen] = useState(false);
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
    

  // useEffect cleanup function
  useEffect(() => {
    return () => {
      if (FilesModalS !== null) {
        setFilesModalS(null); // Clean up the FilesModal component
      }
    };
  }, [FilesModalS]);

  function openWebSdCard(): void {
    setFilesModalS(
      <SdCardModal
        onClose={() => setFilesModalS(null)}
        isVisible={true}
        espIp='192.168.178.188'
      />
    );
  }

  // UI rendering
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      {/* Conditional rendering based on connection status */}
      {connectedDevice ? (
        // If a device is connected
        <View style={styles.connectedContainer}>
          <Text>Connected to: {connectedDevice.name}</Text>
          {/* <Text>Received Data: {[...receivedData.data]}</Text> */}
          <Text>Notification Data: {notiviedData}</Text>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Button title="Disconnect" onPress={disconnectDevice} />
            <Button title="Connect to WLAN" onPress={() => setIsWLANVisible(true)} />
            <Button title="Clear User Credentials" onPress={() => sendCommand(6, {})} />
            <Button title="SD Card Directories" onPress={openSDCardFilesModal} />
            <Button title="WEBsocket SD Card" onPress={openWebSdCard}/>
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
          if (wlan) {
            sendCommand(5, { ...wlan, passwd });
          }
          setIsWLANVisible(false);
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
});
