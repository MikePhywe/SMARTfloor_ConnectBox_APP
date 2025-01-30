import { Button, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState } from "react";
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import DeviceModal from "@/components/DeviceConnectionModal";
import useBLE from "@/hooks/useBLE";
 
export default function TabOneScreen() {
  const {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <TouchableOpacity onPress={openModal} >
        <Text>Connect</Text>
      </TouchableOpacity> 
      {
      connectedDevice ? (
          <>
            <Text>Verbunden mit: {connectedDevice.name}</Text>
            {/* <Text>Empfangene Daten: {[...receivedData.data]}</Text> */}
            <Text>Nachriten Daten: {notiviedData}</Text>
            <Button title="Trennen" onPress={disconnectDevice} />
            <Button title="sdCard directories" onPress={askForSDCard}/>
          </>
        ): (
        <DeviceModal
          closeModal={hideModal}
          visible={isModalVisible}
          connectToPeripheral={connectToDevice}
          devices={allDevices}
         />) 
}
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
