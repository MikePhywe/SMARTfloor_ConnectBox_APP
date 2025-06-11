import React, { useState, useEffect, useRef, useCallback } from 'react';
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


interface UploadFileOptions {
  espIp: string;
  endpoint: string;
  fileTypeFilter?: string; // z.B. 'application/octet-stream' für .bin, oder '*/*' für alle
  fileFieldName: string; // Name des Feldes für die Datei im Multipart-Request
  additionalFormData?: { [key: string]: string }; // Zusätzliche Formular-Daten
  onProgress: (progress: number) => void;
  expectedFileExtension?: string; // z.B. '.bin'
  fileExtensionErrorMessage?: string;
}
interface FileItem {
  name: string;
  size?: number;
  type: 'file' | 'folder';
}

interface SdCardModalProps {
  isVisible: boolean;
  onClose: () => void;
  espIp?: string;
}

/**
 * Generische Funktion zum Auswählen einer Datei und Hochladen auf den ESP.
 */
const uploadFileWithPickerBase = async (
  options: UploadFileOptions
): Promise<{ success: boolean; message: string }> => {
  const {
    espIp,
    endpoint,
    fileTypeFilter = '*/*',
    fileFieldName,
    additionalFormData = {},
    onProgress,
    expectedFileExtension,
    fileExtensionErrorMessage
  } = options;

  console.log('[uploadFileWithPickerBase] Called. Options:', JSON.stringify(options, null, 2));
  if (!espIp) {
    return { success: false, message: 'ESP IP-Adresse ist nicht bekannt.' };
  }

  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: fileTypeFilter,
      copyToCacheDirectory: true,
    });
    console.log('[uploadFileWithPickerBase] DocumentPicker result:', JSON.stringify(result, null, 2));

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: 'Keine Datei ausgewählt.' };
    }


    const fileAsset = result.assets[0];
    const fileUri = fileAsset.uri;

    if (expectedFileExtension && !fileAsset.name.toLowerCase().endsWith(expectedFileExtension.toLowerCase())) {
      return { success: false, message: fileExtensionErrorMessage || `Bitte wählen Sie eine ${expectedFileExtension}-Datei.` };
    }

    const uploadUrl = `http://${espIp}:80${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    console.log(`[uploadFileWithPickerBase] Attempting to upload. URL: ${uploadUrl}, File URI: ${fileUri}, FieldName: ${fileFieldName}, Params: ${JSON.stringify(additionalFormData)}`);
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: fileFieldName,
      parameters: additionalFormData,
      onUploadProgress: (event: FileSystem.UploadProgressData) => {
        console.log('FileSystem.uploadAsync onUploadProgress event:', event); // DEBUG
        if (event.totalBytesExpectedToSend > 0) {
          const progress = event.totalBytesSent / event.totalBytesExpectedToSend;
          console.log('Calculated progress (0-1):', progress); // DEBUG
          onProgress(progress); // Rufe die übergebene onProgress-Callback auf
        } else {
          console.warn('FileSystem.uploadAsync onUploadProgress: totalBytesExpectedToSend is not > 0. Event:', event); // DEBUG
        }
      },
    });
    // onProgress(1); // Nicht mehr nötig, da der letzte onUploadProgress-Event dies abdeckt oder der Upload abgeschlossen ist.
    console.log('[uploadFileWithPickerBase] FileSystem.uploadAsync promise resolved. Server Response Status:', uploadResult.status, 'Body:', uploadResult.body);

    if (uploadResult.status >= 200 && uploadResult.status < 300) {
      onProgress(1); // Stelle sicher, dass der Fortschritt bei Erfolg auf 100% ist
      return { success: true, message: `Datei '${fileAsset.name}' erfolgreich hochgeladen. Server: ${uploadResult.body}` };
    } else {
      return { success: false, message: `Fehler vom Server (Status ${uploadResult.status}): ${uploadResult.body}` };
    }
  } catch (error: any) {
    console.error(`[uploadFileWithPickerBase] CRITICAL EXCEPTION during upload to ${endpoint}. Error message: ${error.message}. Full error:`, error);
    onProgress(0); // Setze Fortschritt bei Fehler zurück
    return { success: false, message: `Fehler beim Upload: ${error.message}` };
  }
};

/**
 * Ermöglicht das Auswählen einer beliebigen Datei und das Hochladen auf die SD-Karte des ESP32.
 */
export const uploadGenericFileToEspSDCard = async (
  espIp: string,
  onProgress: (progress: number) => void,
  destinationPath: string = '/' // Standardmäßig ins Root-Verzeichnis der SD-Karte
): Promise<{ success: boolean; message: string }> => {
  console.log("sdkfjhljfhldskajhf");
  const additionalFormData: { [key: string]: string } = {};
  if (destinationPath) {
    // Der ESP-Endpunkt muss dieses Feld 'path' erwarten, um die Datei im richtigen Verzeichnis zu speichern.
    additionalFormData.path = destinationPath;
  }

  return uploadFileWithPickerBase({
    espIp,
    endpoint: '/upload-multipart-sd', // Neuer, dedizierter Endpunkt für Multipart-Uploads
    fileTypeFilter: '*/*', // Erlaube alle Dateitypen
    fileFieldName: 'file', // Angepasst an den Feldnamen, den uploadSelectedFile verwendet
    additionalFormData,
    onProgress,
  });
};

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
  const apiManager = ApiManager.getInstance(espIp); // Hole die Singleton-Instanz mit der IP


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

  // Funktion zur Bestätigung und zum Löschen einer Datei
  const confirmAndDeleteFile = (filename: string) => {
    Alert.alert(
      "Datei löschen",
      `Soll die Datei '${filename}' wirklich gelöscht werden?`,
      [
        {
          text: "Abbrechen",
          style: "cancel"
        },
        { text: "Löschen", onPress: () => deleteFile(filename) }
      ],
      { cancelable: true }
    );
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

// Diese Funktion muss auf der obersten Ebene der Datei stehen, nicht innerhalb der SdCardModal Komponente.


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
                    <TouchableOpacity onPress={() => confirmAndDeleteFile(item.name)}>
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
  

export const performOTAUpdate = async (
  espIp: string,
  onProgress: (progress: number) => void // Callback für Fortschritt (0-100)
): Promise<{ success: boolean; message: string }> => {
  if (!espIp) {
    return { success: false, message: 'ESP IP-Adresse ist nicht bekannt.' };
  }

  try {
    // 1. Datei auswählen
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/octet-stream', // Akzeptiert .bin Dateien
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      onProgress(0);
      return { success: false, message: 'Keine Datei ausgewählt.' };
    }

    const fileAsset = result.assets[0];
    const fileUri = fileAsset.uri;

    if (!fileAsset.name.toLowerCase().endsWith('.bin')) {
      onProgress(0);
      return { success: false, message: 'Bitte wählen Sie eine .bin Datei für das Firmware-Update.' };
    }

    // 2. Upload durchführen
    const uploadUrl = `http://${espIp}/update`; // Port 80 ist Standard für HTTP

    // Initialisiere den Fortschritt
    onProgress(0);

    const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': 'application/octet-stream',
        // 'Accept': 'text/plain', // Optional, um dem Server mitzuteilen, was wir erwarten
      },
      // fieldName: 'update', // Bei BINARY_CONTENT nicht unbedingt nötig, da der gesamte Body die Datei ist.
                              // Der ESPAsyncWebServer für /update erwartet den Stream im Body.
      sessionType: FileSystem.FileSystemSessionType.BACKGROUND, // Optional
      // Fortschrittsberichterstattung für Expo SDK 49+
      // Die Genauigkeit hängt davon ab, wie FileSystem.uploadAsync die Events bereitstellt.
      // Der ESP32 sendet keine Zwischen-Feedbacks während des Schreibens der Chunks.
      // Der Fortschritt hier spiegelt den Upload-Fortschritt von der App zum Server wider.
      onUploadProgress: (event: FileSystem.UploadProgressData) => {
        if (event.totalBytesExpectedToSend > 0) {
          const progressPercentage = Math.round(
            (event.totalBytesSent / event.totalBytesExpectedToSend) * 100
          );
          onProgress(progressPercentage);
        }
      },
    });

    // Nachdem der Upload abgeschlossen ist (oder fehlgeschlagen), setzen wir den Fortschritt auf 100%,
    // da der ESP32 die Datei nun vollständig erhalten hat und verarbeitet.
    onProgress(100);

    // Auswertung der Server-Antwort
    // Ihr ESP32-Server sendet:
    // - 200 OK mit "Update erfolgreich!"
    // - 500 Internal Server Error mit "Update fehlgeschlagen!"
    if (uploadResult.status === 200 && uploadResult.body.includes("Update erfolgreich")) {
      return { success: true, message: 'Firmware-Update erfolgreich zum ESP32 hochgeladen. Das Gerät startet neu.' };
    } else {
      console.error('OTA Update Fehler vom Server:', uploadResult.body, 'Status:', uploadResult.status);
      const serverMessage = uploadResult.body || 'Keine detaillierte Fehlermeldung vom Server.';
      return { success: false, message: `Fehler vom ESP32: ${serverMessage} (Status: ${uploadResult.status})` };
    }

  } catch (error: any) {
    onProgress(0); // Setze Fortschritt zurück bei Fehler
    console.error('OTA Update Fehler:', error);
    let detailedMessage = error.message;
    if (error.code === 'ERR_NETWORK') {
        detailedMessage = 'Netzwerkfehler. Stellen Sie sicher, dass der ESP32 erreichbar ist und die IP-Adresse korrekt ist.';
    }
    return { success: false, message: `Fehler beim OTA-Update: ${detailedMessage}` };
  }
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
