import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import RNFS, { ReadDirItem } from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import  ManageExternalStorage  from 'react-native-external-storage-permission';


// Interface für Datei-Items
interface FileItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  type: string;
}

export default function TabTwoScreen() {
  // State-Variablen
  const [files, setFiles] = useState<FileItem[]>([]); // Liste der Dateien im aktuellen Verzeichnis
  const [currentDirectory, setCurrentDirectory] = useState<string>(RNFS.ExternalStorageDirectoryPath + '/Download'); // Aktuelles Verzeichnis
  const [loading, setLoading] = useState<boolean>(true); // Ladezustand
useEffect(() => {
  ManageExternalStorage.checkAndGrantPermission().then((result: any)=> { 
    if (result) {
      console.log("permission granted")
  } else {
      // fail
      console.log("permission not granted")
      
  }

  });
}, [])
  /**
   * Lädt die Dateien und Ordner eines bestimmten Verzeichnisses
   * @param directoryPath Der Pfad des zu ladenden Verzeichnisses
   */
  const loadFiles = async (directoryPath: string) => {
    setLoading(true);
    try {
      // Liest den Inhalt des Verzeichnisses
      const files: ReadDirItem[] = await RNFS.readDir(directoryPath);
      console.log("All files", files); // Logge alle Files
      // Konvertiert die Dateiliste in ein Array von FileItem-Objekten
      const fileItems: FileItem[] = await Promise.all(files.map(async (file) => {
        console.log("Single File", file); // Logge ein File
        let fileType = ""; // Standardwert für Ordner
        let fileSize = 0;
        
        if (!file.isDirectory()) {
          fileType = file.name.split('.').pop() ?? '';
          fileSize = file.size;
        } else {
            const stats = await RNFS.stat(file.path);
            fileSize = stats.size;
        }
        console.log("filetype", fileType);
        return {
          name: file.name,
          path: file.path,
          size: fileSize,
          isDirectory: file.isDirectory(),
          type: fileType, // Dateiendung als Typ extrahieren
        }
      }));
      console.log("fileItems", fileItems); // Logge alle FileItems
      setFiles(fileItems);
      setCurrentDirectory(directoryPath);
    } catch (error) {
      console.error('Error reading directory:', error);
      Alert.alert('Error', 'Could not read directory.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigiert zum übergeordneten Verzeichnis
   */
  const goBack = () => {
    if (currentDirectory !== RNFS.ExternalStorageDirectoryPath + '/Download') {
      const parentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
      loadFiles(parentDirectory);
    }
  };

  /**
   * Öffnet ein Verzeichnis und lädt dessen Inhalt
   * @param path Der Pfad des zu öffnenden Verzeichnisses
   */
  const openDirectory = (path: string) => {
    loadFiles(path);
  };

  // Lädt die Dateien des Download-Verzeichnisses beim ersten Rendern
  useEffect(() => {
    loadFiles(RNFS.ExternalStorageDirectoryPath + '/Download');
  }, []);

  /**
   * Rendert ein einzelnes Element in der Dateiliste
   * @param item Das FileItem-Objekt
   */
  const renderItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      onPress={() => {
        if (item.isDirectory) {
          openDirectory(item.path);
        } else {
          Alert.alert('File', `Opening file: ${item.name}`);
        }
      }}
      style={styles.fileItem}
    >
      <Text>{item.isDirectory ? '📁 ' : '📄 '}{item.name}</Text>
      <Text>Size: {item.size} bytes, Type: {item.type}</Text>
    </TouchableOpacity>
  );

  // UI rendering
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Local Files</Text>
      {/* "Zurück"-Button, nur anzeigen, wenn wir nicht im Download-Verzeichnis sind */}
      {currentDirectory !== RNFS.ExternalStorageDirectoryPath + '/Download' && (
        <TouchableOpacity onPress={goBack} style={styles.goBackButton}>
          <Text>Back</Text>
        </TouchableOpacity>
      )}
      {/* Ladeanzeige */}
      {loading && <Text>Loading files...</Text>}
      {/* Dateiliste */}
      <FlatList
        data={files}
        renderItem={renderItem}
        keyExtractor={(item) => item.path}
      />
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  fileItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  goBackButton: {
    backgroundColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    alignSelf: 'flex-start'
  },
});
