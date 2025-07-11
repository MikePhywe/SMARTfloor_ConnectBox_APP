/* eslint-disable no-bitwise */
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { Buffer } from "buffer";
import crc from "crc-react-native";

// import msgPack from "@msgpack/msgpack";
import msgPack from 'msgpack-lite';
import * as ExpoDevice from "expo-device";

import base64 from "react-native-base64";

import {

  BleError,
  BleManager,
  Characteristic,
  Device,
} from "react-native-ble-plx";
import useStateWithCallback from "./useStateWithCallback";
import { Communication } from "@/constants/bleTypes";
import { BLEContextProps } from "@/contexts/BLEContext";
import ApiManager from "@/components/ApiManager";

const DATA_SERVICE_UUID = "243c24bf-6615-461d-8cda-68d38b90b9b6";
const CHARACTERISTIC_UUID_NOTIFY = "d6e3ae85-8366-4508-8136-71d12dbf8955";
const CHARACTERISTIC_UUID_DATA = "869abea9-ea1f-40c6-a8a4-7f7861076456";

export type info = "info";
export type error = "error";
export type verbose = "verbose";
export type debug = "debug";
export type debugLogType = {type: info | error | verbose | debug, data: string} | null;

export type bleCallback = {
  oneTime: boolean;
  
  type?: Communication.BLE_COMMANDS;
  func: (data: any) => void;
};

const bleManager = new BleManager();
let revieceCallbacks: (bleCallback & { id: string})[] = [];
export default function useBLE(): BLEContextProps {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [logData, setLogData] = useState<debugLogType>(null);
  const [receivedData, setReceivedData] = useState<{type: Communication.BLE_COMMANDS, data: any}>({type: Communication.BLE_COMMANDS.ERROR_MESSAGE, data: null});
  

  // const [revieceCallbacks, setRevieceCallbacks] = useStateWithCallback<bleCallback[]>([]);
  const [notiviedData, setNotiviedData] = useState<number>(0);
  const recievePackage = useRef<{type: Communication.BLE_COMMANDS ,checksum: number, len: number, id: string, memory: Buffer[]}>({type: Communication.BLE_COMMANDS.ERROR_MESSAGE, checksum:0, len: 0, id:"", memory:[]});
  
  useEffect(() => {
    console.log("callbacks changed");
  }, [revieceCallbacks])
// Ref, um den vorherigen Verbindungsstatus zu speichern
  const prevConnectedDeviceRef = useRef<Device | null>(null);

  useEffect(() => {
    if (connectedDevice && !prevConnectedDeviceRef.current) {
      // Gerät wurde gerade verbunden
      console.log(
        "Bluetooth-Gerät verbunden:",
        connectedDevice.name || connectedDevice.id
      );
      
      sendCommand(Communication.BLE_COMMANDS.GET_WLAN_DATA, {}, { // Ersetze GET_DEVICE_INFO mit deinem Befehl
        oneTime: true,
        func: (deviceInfo) => {
          console.log("Geräteinformationen nach Verbindung:", deviceInfo);
        }
      });
    }
    // Aktualisiere den Ref für den nächsten Render
    prevConnectedDeviceRef.current = connectedDevice;
  }, [connectedDevice]); // Abhängigkeit: connectedDevice. sendCommand ggf. hinzufügen, wenn es im Effekt genutzt wird.

  const tryCallbacks = (id: string, data: any) => {
    let delCallback: string[] = [];
    console.log("callback for")
    for (let callback of revieceCallbacks) {
      console.log("callback calling")
      if (callback.id === id) {
        callback.func(data);
        if (callback.oneTime) {
          delCallback.push(callback.id);
        }
      }
    }
    revieceCallbacks =  revieceCallbacks.filter((cb) =>!delCallback.includes(cb.id));
  };

  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();

        return isAndroid31PermissionsGranted;
      }
    } else {
      return true;
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      deviceConnection.requestMTU(512);
      setConnectedDevice(deviceConnection);
      await deviceConnection.discoverAllServicesAndCharacteristics();
      bleManager.stopDeviceScan();

      startStreamingData(deviceConnection);
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
    }
  };

  const disconnectDevice = () => {
    if (connectedDevice) {
      connectedDevice.cancelConnection();
      setConnectedDevice(null);
    }
  };

  const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;

  const scanForPeripherals = () =>
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }

      if (
        device &&
        (device.localName === "SMARTfloorConnectBox" || device.name === "SMARTfloorConnectBox")
      ) {
        setAllDevices((prevState: Device[]) => {
          if (!isDuplicteDevice(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });

  const onDataUpdate = async (
    error: BleError | null,
    characteristic: Characteristic | null
  ) => {
    if (error) {
      console.log(error);
      return;
    } else if (!characteristic?.value) {
      console.log("No Data was received");
      return;
    } 
    setNotiviedData((prev) => prev+1);
    try{
      let obj = {number: 0, checksum:0};
      if(recievePackage.current && recievePackage.current?.checksum !== 0) {
        recievePackage.current.memory.push(Buffer.from(characteristic?.value, 'base64'));
        if(recievePackage.current.memory.reduce((n, {length}) => n+ length,0 ) >= recievePackage.current.len) {
          
          const data = Buffer.concat([...recievePackage.current.memory])
          const checksum = crc.crc32(data);
          if (checksum != recievePackage.current.checksum) {
            recievePackage.current = {checksum:0, len: 0, id:"", memory:[], type:Communication.BLE_COMMANDS.ERROR_MESSAGE};
            return;
            // throw new Error("wrong checksum in data");
          }
          // LIST SD CARD
          let decodedData;
          switch (recievePackage.current.type) {
            case Communication.BLE_COMMANDS.GET_SD_FILESYSTEM:
              decodedData = msgPack.decode(data);
              if(decodedData.Call_ID !== undefined) {
                tryCallbacks(decodedData.Call_ID, decodedData);
              }
              break;
            case Communication.BLE_COMMANDS.SET_VOLTAGE_PORT:
              decodedData = msgPack.decode(data);
              
              tryCallbacks("plateinfopage", decodedData);
              
              break;
            case Communication.BLE_COMMANDS.SEND_SMARTFLOOR_DATA:
              decodedData = msgPack.decode(data);
              setReceivedData(decodedData);
              break;

            case Communication.BLE_COMMANDS.SEND_WIFI_DATA: 
            case Communication.BLE_COMMANDS.GET_WLAN_DATA:
              const {ip, ssid, level, channel} = msgPack.decode(data);
              ApiManager.getInstance(ip);
              break;
            
            case Communication.BLE_COMMANDS.LOG_DATA:
              console.log(msgPack.decode(data));
              setLogData(msgPack.decode(data) as debugLogType);
              break;
              

            default:
              
              console.log('Recived BLECommand not implemented');
              console.log(`${checksum} vs ${recievePackage.current.checksum}`);
              console.log(msgPack.decode(data));
              console.log(recievePackage.current);
              break;
          }
          decodedData = msgPack.decode(data);
          if(decodedData.Call_ID !== undefined) {
            tryCallbacks(decodedData.Call_ID, decodedData);
            
          }
          // if(recievePackage.current.type === Communication.BLE_COMMANDS.GET_SD_FILESYSTEM) {
          //   const decodedData = msgPack.decode(data);
          //   // setReceivedData(decodedData);
          //   if(decodedData.Call_ID !== undefined) {
          //     tryCallbacks(decodedData.Call_ID, decodedData);
          //   }
          // }
          // SMARTfloor data 
          // else if (recievePackage.current.type === Communication.BLE_COMMANDS.SEND_SMARTFLOOR_DATA) {
          //   const decodedData = msgPack.decode(data);
          //   setReceivedData(decodedData);
          // } else if (recievePackage.current.type === Communication.BLE_COMMANDS.SEND_WIFI_DATA) {
          //   const {ip, ssid} = msgPack.decode(data);
          //   ApiManager.getInstance(ip);
          // }

          
          recievePackage.current = {checksum:0, len: 0, id:"", memory:[], type:Communication.BLE_COMMANDS.ERROR_MESSAGE};
        }
        
        // if(recievePackage.current.memory.length === recievePackage.current.len) {
        //   const data = Buffer.from(recievePackage.current.memory, 'base64');
        //   console.log(msgPack.decode(data));
        // }
      } else {
        const data = msgPack.decode(Buffer.from(characteristic?.value, 'base64'));
        recievePackage.current!.checksum = data[2];
        recievePackage.current.len = data[1];
        recievePackage.current.id = characteristic.deviceID;
        recievePackage.current.type = data[0]
        // console.log(`datatype: ${data[0]}`);
      }
      
      
      // const firstRec = base64.decode(characteristic.value);
      // let recived = JSON.parse(firstRec);
    } catch (err) {
      recievePackage.current = {type:Communication.BLE_COMMANDS.ERROR_MESSAGE, checksum:0, len: 0, id:"", memory:[]};
      console.log(err);
    }
    
    // const colorCode = base64.decode(characteristic.value);
    
    // const data = await bleManager.readCharacteristicForDevice(
    //   characteristic.deviceID,
    //   DATA_SERVICE_UUID,
    //   CHARACTERISTIC_UUID_DATA
    // )
    // if (!data?.value) {
    //   console.log("No Data Received");
    //   return;
    // }
    // let test = Buffer.from(data.value, 'base64');
    // let notifyMessage: {t: string, l: number} = JSON.parse(colorCode);
    // if (notifyMessage.l === test.length) {
    //   console.log(`Received same length ${notifyMessage.l}`);
      
    // } else { 
    //   console.log(`Received diffrent length ${notifyMessage.l - test.length}`);
    //   console.log(`direkt conv ${base64.decode(data.value).length}, ${notifyMessage.l}, ${test.length}`);
    // }
    
    // let ar = new Uint8Array(test);
    // try {

    // let str = msgPack.decode(test);
    // console.log(str);
    // } catch(e) {
    //   console.log(e);
    //   return;
    // }
    // console.log(base64.decode(data.value));
    // console.log(decodeMulti(Buffer.from(base64.decode(data.value))));
    // let color = "white";
    // if (colorCode === "B") {
    //   color = "blue";
    // } else if (colorCode === "R") {
    //   color = "red";
    // } else if (colorCode === "G") {
    //   color = "green";
    // }

    // setColor(color);
  };
  // const onDataUpdate2 = async (
  //   error: BleError | null,
  //   characteristic: Characteristic | null
  // ) => {
  //   if (error) {
  //     console.log(error);
  //     return;
  //   } else if (!characteristic?.value) {
  //     console.log("No Data was received");
  //     return;
  //   } 
  //   setReceivedData((prev) => prev+1);
  //   // const colorCode = base64.decode(characteristic.value);
    
  //   // const data = await bleManager.readCharacteristicForDevice(
  //   //   characteristic.deviceID,
  //   //   DATA_SERVICE_UUID,
  //   //   CHARACTERISTIC_UUID_DATA
  //   // )
  //   // if (!data?.value) {
  //   //   console.log("No Data Received");
  //   //   return;
  //   // }
  //   // let test = Buffer.from(data.value, 'base64');
  //   // let notifyMessage: {t: string, l: number} = JSON.parse(colorCode);
  //   // if (notifyMessage.l === test.length) {
  //   //   console.log(`Received same length ${notifyMessage.l}`);
      
  //   // } else { 
  //   //   console.log(`Received diffrent length ${notifyMessage.l - test.length}`);
  //   //   console.log(`direkt conv ${base64.decode(data.value).length}, ${notifyMessage.l}, ${test.length}`);
  //   // }
    
  //   // let ar = new Uint8Array(test);
  //   // try {

  //   // let str = msgPack.decode(test);
  //   // console.log(str);
  //   // } catch(e) {
  //   //   console.log(e);
  //   //   return;
  //   // }
  //   // console.log(base64.decode(data.value));
  //   // console.log(decodeMulti(Buffer.from(base64.decode(data.value))));
  //   // let color = "white";
  //   // if (colorCode === "B") {
  //   //   color = "blue";
  //   // } else if (colorCode === "R") {
  //   //   color = "red";
  //   // } else if (colorCode === "G") {
  //   //   color = "green";
  //   // }

  //   // setColor(color);
  // };
  const startStreamingData = async (device: Device) => {
    if (device) {
      device.monitorCharacteristicForService(
        DATA_SERVICE_UUID,
        CHARACTERISTIC_UUID_NOTIFY,
        onDataUpdate
      );
      // device.monitorCharacteristicForService(
      //   DATA_SERVICE_UUID,
      //   CHARACTERISTIC_UUID_DATA,
      //   onDataUpdate2
      // );
      // let i=0;
      // const interval = setTimeout(async () => {
      //   console.log("Interval");
      //   do  {
      //   try {
      //     const characteristic = await device.readCharacteristicForService(
      //       DATA_SERVICE_UUID,
      //       CHARACTERISTIC_UUID_DATA
      //     );
  
      //     // Dekodiere die empfangenen Daten
          
      //     if (characteristic.isIndicatable && characteristic?.value) {
      //       try{
      //         const data = Buffer.from(characteristic?.value, 'base64');;
      //         let decodedData = msgPack.decode(data);
      //         console.log(decodedData);
      //         // setReceivedData((prev) => prev + decodedData);
      //         setReceivedData((prev) => prev + 1);
      //         characteristic.value = null;
      //       } catch(e) {
      //         console.log(e);
      //       }
      //       // const decodedData = Buffer.from(data, "base64").toString("utf-8");
      //       // console.log("Empfangene Daten:", decodedData);
      //       // setReceivedData((prev) => prev + decodedData);
      //     }
      //   } catch (error) {
      //     console.error("Fehler beim Lesen der Charakteristik:", error);
      //     clearTimeout(interval);
      //     return;
      //   }
      // } while (true) 
      // }, 10); // Intervall: alle 1 Sekund
    } else {
      console.log("No Device Connected");
    }
  };

  let askForSDCard = async (callback: {oneTime: boolean, type:number , func: (datat: any) => void}) => {
    const id = Math.floor(Math.random() * 100).toString();
    const request = {...callback, id }
    // const value = msgPack.encode(request.id).toString("base64");
    const value = base64.encode(id +"|"+ callback.type);
    console.log(`Message len ${value.length}`);
    console.log(value);
    console.log(`message: ${id}`);
    // connectedDevice?.requestMTU(value.length).then(
    //   (ret) => {
        // console.log(`requested mtu ${ret?.mtu}`);
        revieceCallbacks = [...revieceCallbacks, request];
        connectedDevice?.writeCharacteristicWithoutResponseForService(DATA_SERVICE_UUID, CHARACTERISTIC_UUID_DATA, value, "");
        console.log(connectedDevice?.mtu)
    //   }
    // ).catch((err) => console.log(err));
    
  };

  const registerCallback = ( callback: bleCallback & {id: string}) => {
    revieceCallbacks = [...revieceCallbacks, callback];

  }

  const sendCommand = async (command: Communication.BLE_COMMANDS, message: any ,callback?:{oneTime: boolean, func: (datat: any) => void}) => {
    console.log("send Data called");
    const id = Math.floor(Math.random() * 100).toString();
    if (callback) {
      const request ={...callback, type: command, id};
      revieceCallbacks = [...revieceCallbacks, request];
    }
    const _Buffer = String.fromCharCode.apply(null, msgPack.encode({id, command: command.toString(), message}) as any);// .toString("base64");
    const value = base64.encode(_Buffer);//_Buffer.toString("base64");

    console.log(`sending value : ${_Buffer}`);
    try { 
      // await bleManager.requestMTUForDevice(connectedDevice!.id, value.length);
      console.log("sending Data");
      connectedDevice?.writeCharacteristicWithoutResponseForService(DATA_SERVICE_UUID, CHARACTERISTIC_UUID_DATA, value, "");
    }  
    catch(e) {
      console.error(`Ble error: ${e}`);
      // connectedDevice?.writeCharacteristicWithoutResponseForService(DATA_SERVICE_UUID, CHARACTERISTIC_UUID_DATA, value, "");
    };
    // 
  }
  return {
    sendCommand,
    askForSDCard,
    connectToDevice,
    disconnectDevice,
    allDevices,
    connectedDevice,
    receivedData,
    notiviedData,
    logData,
    registerCallback,
    requestPermissions,
    scanForPeripherals,
    // startStreamingData,
  };
}

// export default useBLE;
