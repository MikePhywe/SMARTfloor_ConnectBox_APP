import { Button, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState } from "react";
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import DeviceModal from "@/components/DeviceConnectionModal";
import FilesModal, { fileItemListProperties } from "@/components/ViewFiles";
import useBLE, { bleCallback } from "@/hooks/useBLE";
import SetDeviceWlan from '@/components/ConnectDeviceToWLAN';
import { WifiEntry } from 'react-native-wifi-reborn';
 
export default function TabOneScreen() {
  const {
    sendCommand,
    askForSDCard,
    allDevices,
    connectedDevice,
    connectToDevice,
    disconnectDevice,
    color,
    receivedData,
    notiviedData,
    requestPermissions,
    scanForPeripherals,
  } = useBLE();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [FilesModalS, setFilesModalS] = useState<any>(<></>);
  const [isWLANVisible, setIsWLANVisible] = useState<boolean>(false);

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  };

  
  
  function makeUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>       
      {
      connectedDevice ? (
          <>
            <Text>Verbunden mit: {connectedDevice.name}</Text>
            {/* <Text>Empfangene Daten: {[...receivedData.data]}</Text> */}
            <Text>Nachriten Daten: {notiviedData}</Text>
            <View style={styles.buttonContainer}>
            <Button title="Trennen" onPress={disconnectDevice} />
            <Button title= "conect device to wlan" onPress={() => { 
              setIsWLANVisible(true);
            }}/>
            <Button title="user credentials löschen" onPress={() => {
              sendCommand(6, {});
            }} />
            <Button title="sdCard directories" onPress={
              () => {
                const callback = (data: any) => {
                  const keys = Object.keys(data);
                  let tempdata: fileItemListProperties[] = [];
                  keys.forEach((key) => {
                    if(Array.isArray(data[key])) {
                      tempdata = tempdata.concat(data[key].map((item) => (
                      {
                        id: makeUUID(),
                        title: item.name,
                        size: item.size ?? 0,
                        type: item.type
                      })));
                    }
                  });
                  console.log(data);
                  setFilesModalS(
                    <FilesModal
                      closeModal={() => setFilesModalS(null)}
                      visible={true}
                      onClose={(item: fileItemListProperties) => console.log(`closing files modal ${item.title}`)} 
                      FileItems={tempdata}            
                  />)
                };
                
                // askForSDCard({oneTime:true,type:0, func: callback});
                sendCommand(0,"/", {oneTime:true, func: callback})
              }
              
            }/>
            </View>
            
            
          </>
        ): (
          <>
            <Button title="Connect" onPress={openModal} />
            
            <DeviceModal
              closeModal={hideModal}
              visible={isModalVisible}
              connectToPeripheral={connectToDevice}
              devices={allDevices}
            />
            
          </>) 
          }
      <SetDeviceWlan visible={isWLANVisible} closeModal={(passwd: string, wlan: WifiEntry | undefined) => {
        console.log("wlan callback");
        if(wlan) {
          sendCommand(5, {...wlan, passwd});
        }
        setIsWLANVisible(false)
      
      }}/>
      {FilesModalS}
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    height: "50%",
    padding: 10,
    justifyContent: 'space-around',
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
