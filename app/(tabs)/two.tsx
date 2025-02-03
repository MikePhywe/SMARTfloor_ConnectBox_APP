import { Button, PermissionsAndroid, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Directory, File, Paths } from 'expo-file-system/next';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';

function printDirectory(directory: Directory, indent: number = 0) {
  // askPermissions();
  console.log(`${' '.repeat(indent)} + ${directory.name}`);
  const contents = directory.list();
  for (const item of contents) {
    if (item instanceof Directory) {
      printDirectory(item, indent + 2);
    } else {
      console.log(`${' '.repeat(indent + 2)} - ${item.name} (${item.size} bytes)`);
    }
  }
}

const askPermissions = async function () {
  const albumUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("/Documents");
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(albumUri);
  if (permissions.granted) {
    console.log('Permissions granted');
  } else {
    console.log('Permissions denied');
  }
}

export default function TabTwoScreen() {
  const [permissions, setPermissions] = useState(false);
   const [selectedWifi, setSelectedWifi] = useState();
  const test = async () => {
    try {
      
      // askPermissions();
      // const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      // console.log(`path: ${FileSystem.StorageAccessFramework.getUriForDirectoryInRoot()}`);	
      const file = new File("storage/emulated/0/Documents", 'Example.txt');
      const fileUri = FileSystem.documentDirectory + 'Example.txt';
      const content = await FileSystem.readAsStringAsync(file.uri);
      console.log(content);
    } catch (error) {
      console.error(error);
  }}
  useEffect(() => {
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: "Files System Permission",
        message: "Local storage",
        buttonPositive: "OK",
      }
    ).then((answere) => {
      setPermissions(answere === 'granted');
      console.log(answere); // askPermissions result
    });
    
  },[]);
  return (
    <View style={styles.container}>
      <Picker selectedValue={selectedWifi} onValueChange={(itemValue, itemIndex) => setSelectedWifi(itemValue)}>
                    {/* { wlanList.map((item) => (<Picker.Item label={item.SSID} value={item.SSID} />)) }                 */}
                    <Picker.Item label="Java" value="java" />
                    <Picker.Item label="JavaScript" value="js" />
                </Picker>
      <Text style={styles.title}>Tab Two</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/two.tsx" />
      <Button title='file' onPress={test}/>
      <Button title='directory' onPress={async () => {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync("/storage/emulated/0/Documents");
        printDirectory(new Directory("/storage/emulated/0/Documents")?? Paths.cache)}}/>
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
