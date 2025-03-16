import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { Buffer } from 'buffer';
import { ProgressBar } from 'react-native-paper'; // npm install react-native-paper
// import axios, { AxiosError } from 'axios'; // Importiere axios und AxiosError
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import ApiManager, { ApiManagerProgressEvent } from '@/components/ApiManager'; 

interface FileItem {
  name: string;
  size?: number;
  type: 'file' | 'folder';
}

interface SdCardModalProps {
  isVisible: boolean;
  onClose: () => void;
  espIp: string;
}

const SdCardModal: React.FC<SdCardModalProps> = ({ isVisible, onClose, espIp }) => {
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [readFileFilename, setReadFileFilename] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [uploadFilename, setUploadFilename] = useState<string>('');
  const [uploadContent, setUploadContent] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [newFolderName, setNewFolderName] = useState<string>('');
  // const [ip, setIp] = useState<string>(espIp);
  const [readProgress, setReadProgress] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showFullFileContent, setShowFullFileContent] = useState<boolean>(false); //Neuer State um alle daten anzuzeigen.
  const MAX_DISPLAY_LENGTH = 500; // Maximale Anzahl an Bytes, welche angezeigt werden sollen.
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadFileProgress, setUploadFileProgress] = useState<number>(0);
  const [isUploadFileProgress, setIsUploadFileProgress] = useState<boolean>(false);
  //const [ip, setIp] = useState<string>(espIp);
  const apiManager = ApiManager.getInstance(); // Hole die Singleton-Instanz mit der IP


  // useEffect(() => {
  //   // Hier wird die IP nur gesetzt, wenn sie sich ändert.
  //   if(ip !== espIp){
  //     setIp(espIp);
  //   }
  // }, [espIp]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    listFiles().then(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    listFiles();
  }, [currentPath]);

  const listFiles = async () => {
    try {
      // const response = await axios.get(`http://${ip}:80/list?path=${currentPath}`, {
      //   headers: {
      //     'Cache-Control': 'no-cache',
      //   },
      // });
      const response = await apiManager.get<any>(`/list?path=${currentPath}`);

      const data = response.data;
      const folder = Object.keys(data);
      if (data.error) {
        Alert.alert('Error', data.error);
        setFiles([]);
        setCurrentPath('/');
      } else if (folder.length > 1) {
        console.log(data);
        setFiles([]);
        Alert.alert('Error', 'Unexpected response format for file list');
      } else if (data[folder[0]]) {
        setFiles(data[folder[0]]);
      }
    } catch (error: any) {
      
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load file list');
      
    }
  };

  const readFile = async () => {
    let path = currentPath === '/' ? currentPath : currentPath + '/';
    setFileContent('');
    setReadProgress(0);
    setIsReading(true);
    setShowFullFileContent(false); // Auf false setzen, wenn die Datei neu geladen wird.
    try {
      // const response = await axios.get(`http://${ip}:80/read?filename=${path}${readFileFilename}`, {
      //   responseType: 'arraybuffer',
      //   headers: {
      //     'Cache-Control': 'no-cache',
      //   },
      //   onDownloadProgress: (progressEvent) => {
      const response = await apiManager.get<any>(`/read?filename=${path}${readFileFilename}`, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent: ApiManagerProgressEvent) => {
          if (progressEvent.total) {
            const total = progressEvent.total;
            const loaded = progressEvent.loaded;
            setReadProgress(total ? loaded / total : 0);
            console.log(`Download progress: ${loaded} of ${total}`);
          }
        },
      });

      const receivedData = new Uint8Array(response.data);
      const fileContentString = Buffer.from(receivedData).toString('utf-8');
      setFileContent(fileContentString);
    } catch (error: any) {
      
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to read file');
      
    } finally {
      setIsReading(false);
      setReadProgress(0);
    }
  };

  const uploadFile = async () => {
    let path = currentPath === '/' ? currentPath : currentPath + '/';
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // const response = await axios.post(
      //   `http://${ip}:80/upload`,
      //   `filename=${path}${uploadFilename}&data=${uploadContent}`,
      //   {
      //     headers: {
      //       'Content-Type': 'application/x-www-form-urlencoded',
      //       'Cache-Control': 'no-cache',
      //     },
      //   }
      // );
      const response = await apiManager.post<any>(
        `/upload`,
        `filename=${path}${uploadFilename}&data=${uploadContent}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      Alert.alert(response.data);
      setUploadFilename('');
      setUploadContent('');
      listFiles();
    } catch (error: any) {
    
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteFile = async (filename: string) => {
    let path = currentPath === '/' ? currentPath : currentPath + '/';
    try {
      // const response = await axios.delete(`http://${ip}:80/delete?filename=${path}${filename}`, {
      //   headers: {
      //     'Cache-Control': 'no-cache',
      //   },
      // });
      const response = await apiManager.delete<any>(`/delete?filename=${path}${filename}`);

      Alert.alert(response.data);
      listFiles();
    } catch (error: any) {
      
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  const createFolder = async () => {
    let path = currentPath === '/' ? currentPath : currentPath + '/';
    try {
      // const response = await axios.post(`http://${ip}:80/mkdir?path=${path}${newFolderName}`, null, {
      //   headers: {
      //     'Cache-Control': 'no-cache',
      //   },
      // });
      const response = await apiManager.post<any>(`/mkdir?path=${path}${newFolderName}`);

      Alert.alert(response.data);
      setNewFolderName('');
      listFiles();
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to create folder');
      
    }
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const lastSlashIndex = currentPath.lastIndexOf('/');
    const parentPath = lastSlashIndex === 0 ? '/' : currentPath.substring(0, lastSlashIndex);
    setCurrentPath(parentPath);
  };

  // Funktion zum Anzeigen des vollständigen Inhalts
  const toggleShowFullFileContent = () => {
    setShowFullFileContent(!showFullFileContent);
  };

  const displayContent = showFullFileContent ? fileContent : fileContent.substring(0, MAX_DISPLAY_LENGTH);

  const requestAndroidPermissions = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Berechtigung für Dateizugriff',
          message:
            'Diese App benötigt Zugriff auf Ihre Dateien, um Dateien auszuwählen und zu senden.',
          buttonNeutral: 'Später fragen',
          buttonNegative: 'Abbrechen',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Berechtigung für Dateizugriff erteilt');
      } else {
        console.log('Berechtigung für Dateizugriff verweigert');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Funktion zum Auswählen einer Datei aus dem Download-Ordner
  const pickFile = async () => {
    if (Platform.OS === 'android') {
      await requestAndroidPermissions();
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' }); // Alle Dateitypen
      if (result.canceled) {
        return;
      }
      setSelectedFileUri(result.assets[0].uri);
      setSelectedFileName(result.assets[0].name);
    } catch (error: any) {
      console.error('Fehler beim Auswählen der Datei:', error);
      Alert.alert('Fehler', 'Fehler beim Auswählen der Datei.');
    }
  };

     // Funktion zum Hochladen der ausgewählten Datei
     const uploadSelectedFile = async () => {
      if (!selectedFileUri || !selectedFileName) {
        Alert.alert('Fehler', 'Bitte wähle zuerst eine Datei aus.');
        return;
      }
      setIsUploadFileProgress(true);
      setUploadFileProgress(0);
      let path = currentPath === '/' ? currentPath : currentPath + '/';
      const chunkSize = 1048576; // 1MB in Bytes

      try {
        const fileInfo = await FileSystem.getInfoAsync(selectedFileUri);
        if (!fileInfo.exists || !fileInfo.size) {
          throw new Error(`File does not exist or has no size at URI: ${selectedFileUri}`);
        }
        const fileSize = fileInfo.size;
        let bytesUploaded = 0;
        let chunkNumber = 0;
          // Die einzelnen Stücke werden einzeln hochgeladen.
        while (bytesUploaded < fileSize) {
          // Schritt 1: Lesen des nächsten Dateiausschnitts
          const end = Math.min(bytesUploaded + chunkSize, fileSize);
          const chunkContent = await FileSystem.readAsStringAsync(selectedFileUri, {
            encoding: FileSystem.EncodingType.Base64,
            position: bytesUploaded,
            length: end - bytesUploaded,
          });

          // Schritt 2: Erstelle Upload-Optionen
          const uploadOptions: FileSystem.UploadOptionsMultipart = {
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: 'application/octet-stream',
            parameters: {
              filename: path + selectedFileName,
              chunk: chunkNumber.toString(),
              totalChunks: Math.ceil(fileSize / chunkSize).toString(),
            },
          };

          // Schritt 3: Führe den Upload des Chunks durch
          const response = await FileSystem.uploadAsync(
            `http://${ApiManager.getInstance().ipAdress}:80/upload`,
            selectedFileUri,
            uploadOptions
          );

          if (response.status >= 200 && response.status < 300) {
            console.log(`Chunk ${chunkNumber} uploaded successfully.`);
          } else {
            throw new Error(`Chunk ${chunkNumber} upload failed with status code ${response.status}`);
          }
          
          // Schritt 4: Aktualisiere den Fortschritt und die Variablen
          const progress = (bytesUploaded + (end - bytesUploaded)) / fileSize;
          setUploadFileProgress(progress);
          bytesUploaded += (end - bytesUploaded);
          chunkNumber++;
        }
            // Alert wenn alles fertig ist.
            Alert.alert("File uploaded successfully!");
      } catch (error: any) {
       
          console.error('Error:', error);
          Alert.alert('Error', 'Failed to upload file');
        
      } finally {
        setIsUploadFileProgress(false);
        setUploadFileProgress(0);
        listFiles();
        setSelectedFileUri(null);
        setSelectedFileName(null);
      }
    };


  return (
    <Modal visible={isVisible} onRequestClose={onClose} animationType="slide">
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Button title="Zurück" onPress={onClose} />
          <Text style={styles.title}>SD Card Manager</Text>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.pathBar}>
            <Button title="Up" onPress={navigateUp} disabled={currentPath === '/'} />
            <Text style={styles.currentPath}>{currentPath}</Text>
          </View>
          <FlatList
            data={files}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => item.type === 'folder' ? navigateToFolder(item.name) : null}>
                <View style={styles.fileItem}>
                  <Text style={item.type === 'folder' ? styles.folderName : styles.fileName}>{item.name}</Text>
                  {item.type === 'file' && <Text>({item.size} bytes)</Text>}
                  {item.type === 'file' && (
                    <TouchableOpacity onPress={() => deleteFile(item.name)}>
                      <Text style={styles.deleteButton}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.fileListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
          <View style={styles.section}>
            <Text style={styles.subtitle}>Create Folder</Text>
            <TextInput
              style={styles.input}
              placeholder="New folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <Button title="Create Folder" onPress={createFolder} />
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>Read File</Text>
            <TextInput
              style={styles.input}
              placeholder="Filename to read"
              value={readFileFilename}
              onChangeText={setReadFileFilename}
            />
            <Button title="Read File" onPress={readFile} disabled={isReading} />
            {isReading && (
              <ProgressBar progress={readProgress} color={'blue'} style={styles.progressBar} />
            )}
            <View style={styles.fileContentContainer}>
              <Text style={styles.fileContent}>{displayContent}</Text>
              {fileContent.length > MAX_DISPLAY_LENGTH && (
                <Button
                  title={showFullFileContent ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                  onPress={toggleShowFullFileContent}
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>Upload File</Text>
            <TextInput
              style={styles.input}
              placeholder="Filename for upload"
              value={uploadFilename}
              onChangeText={setUploadFilename}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="File content"
              value={uploadContent}
              onChangeText={setUploadFilename}
            />
              <Button title="Upload File" onPress={uploadFile} disabled={isUploading} />
              {isUploading && (
                <ProgressBar progress={uploadProgress} color={'blue'} style={styles.progressBar} />
              )}
            </View>
            {/* Neuer Bereich für das Auswählen und Hochladen von Dateien */}
            <View style={styles.section}>
              <Text style={styles.subtitle}>Upload File from Device</Text>
              <Button title="Select File" onPress={pickFile} />
              {selectedFileName && <Text>Selected: {selectedFileName}</Text>}
              <Button
                title="Upload Selected File"
                onPress={uploadSelectedFile}
                disabled={!selectedFileUri || isUploadFileProgress}
              />
              {isUploadFileProgress && (
                <ProgressBar progress={uploadFileProgress} color={'blue'} style={styles.progressBar} />
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  };
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  content: {
    flex: 1, // Wichtig für KeyboardAvoidingView
    padding: 10,
  },
  section: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 5,
  },
  deleteButton: {
    color: 'red',
  },
  fileContentContainer: {
    marginTop: 10,
    backgroundColor: '#eee',
    padding: 10,
  },
  fileContent: {
    
  },
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  currentPath: {
    marginLeft: 10,
  },
  folderName: {
    fontWeight: 'bold',
  },
  fileName: {
    fontWeight: 'normal',
  },
  progressBar: {
    marginTop: 5,
    marginBottom: 5,
  },
  fileListContent: {
    paddingBottom: 20, // Füge Padding unten hinzu, um Platz für die Tastatur zu schaffen
  },
});

export default SdCardModal;
