import { Button, StyleSheet } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { useEffect } from 'react';
import { PermissionsAndroid } from 'react-native';

export default function TabThreeScreen() {
    const requestAndroidPermissions = async () => {const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location permission is required for WiFi connections',
          message:
            'This app needs location permission as this is required  ' +
            'to scan for wifi networks.',
          buttonNegative: 'DENY',
          buttonPositive: 'ALLOW',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        // You can now use react-native-wifi-reborn
      } else {
        // Permission denied
      }};
    const wifiList = () => WifiManager.loadWifiList().then((list) => {
        list.forEach((item) => {console.log(item.SSID);});
       });
       const current =() => WifiManager.getCurrentWifiSSID().then(
        ssid => {
          console.log("Your current connected wifi SSID is " + ssid);
        },
        () => {
          console.log("Cannot get current SSID!");
        }
      );
    useEffect( () =>{
        // WifiManager.connectToProtectedSSID(ssid, password, isWep).then(
        //     () => {
        //       console.log("Connected successfully!");
        //     },
        //     () => {
        //       console.log("Connection failed!");
        //     }
        //   );
        requestAndroidPermissions();
          
    },[]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab Two</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/two.tsx" />
      <Button title='currentWifi' onPress={current}/>
      <Button title='allWifi' onPress={wifiList}/>
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
