import { Button, StyleSheet, Alert, FlatList } from 'react-native';
import WifiManager, { WifiEntry } from "react-native-wifi-reborn";
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { useEffect, useState } from 'react';
import { PermissionsAndroid } from 'react-native';

export default function TabThreeScreen() {
  const [wifiList, setWifiList] = useState<WifiEntry[]>([]);
  const [currentSSID, setCurrentSSID] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  /**
   * Requests the necessary Android permissions for WiFi functionalities.
   */
  const requestAndroidPermissions = async () => {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission is required for WiFi connections',
        message: 'This app needs location permission as this is required to scan for wifi networks.',
        buttonNegative: 'DENY',
        buttonPositive: 'ALLOW',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      // Permission granted, continue with WiFi functionalities
    } else {
      Alert.alert("Permission denied");
    }
  };

  /**
   * Loads the list of available WiFi networks.
   */
  const loadWifiList = async () => {
    setIsScanning(true);
    setIsRefreshing(true);
    try {
      const list = await WifiManager.loadWifiList();
      setWifiList(list);
    } catch (error) {
      console.error("Error loading WiFi list:", error);
      Alert.alert("Error", "Could not load WiFi list.");
    } finally {
      setIsScanning(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Gets the currently connected WiFi SSID.
   */
  const getCurrentSSID = async () => {
    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      setCurrentSSID(ssid);
    } catch (error) {
      console.error("Error getting current SSID:", error);
      Alert.alert("Error", "Cannot get current SSID.");
    }
  };

  // Load the wifilist and current ssid on component mount
  useEffect(() => {
    requestAndroidPermissions();
    loadWifiList();
    getCurrentSSID();
  }, []);

  //render each item of the flatlist
  const renderItem = ({ item }: { item: WifiEntry }) => (
    <View style={styles.wifiItem}>
      <Text>{item.SSID}</Text>
      <Text>Level: {item.level}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab Three</Text>
      {/* Buttons for managing wifi list */}
      <View style={styles.buttonContainer}>
        <Button title="Refresh" onPress={loadWifiList} disabled={isScanning} />
        <Button title="Get Current SSID" onPress={getCurrentSSID} disabled={isScanning} />
      </View>

      {/* Loading indicator while scanning */}
      {isScanning && <Text>Scanning for Wi-Fi networks...</Text>}

      {/* Display current SSID */}
      {currentSSID !== "" && <Text style={styles.ssidText}>Current SSID: {currentSSID}</Text>}

      {/* List of available wifi */}
      <FlatList
        data={wifiList}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()} // Index as fallback key
        onRefresh={loadWifiList}
        refreshing={isRefreshing}
      />
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/three.tsx" />
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    width: '100%',
  },
  ssidText: {
    marginBottom: 20,
  },
  wifiItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
