import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    ListRenderItemInfo,
    Modal,
    SafeAreaView,
    Text,
    StyleSheet,
    TouchableOpacity,
    PermissionsAndroid,
    TextInput,
} from "react-native";
import {Picker} from '@react-native-picker/picker';

import WifiManager, { WifiEntry } from "react-native-wifi-reborn";

type SetDeviceWLANProps = {
    visible: boolean;
    closeModal: (passwd: string, wlan: WifiEntry | undefined) => void;
};

export const SetDeviceWlan: FC<SetDeviceWLANProps> = (props) => { 
    const [selectedWifi, setSelectedWifi] = useState<WifiEntry>();
    const [password, setPassword] = useState('');
    const [wlanList, setWlanList] = useState<WifiEntry[]>([]);
    const pickerRef = useRef(null);
    let timer: NodeJS.Timeout;
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
        
    useEffect( () =>{
        
        requestAndroidPermissions();
        WifiManager.loadWifiList().then((list) => {
            setWlanList(list);
        })
        if(timer) clearInterval(timer);
        timer = setInterval(() => { 
                WifiManager.loadWifiList().then((list) => {
                setWlanList(list);
            })
            },60000);
    },[]);
    
    return (
        <Modal visible={props.visible} animationType="slide" transparent={true}>
            <SafeAreaView style={modalStyle.modalContainer}>
                {<Picker ref={pickerRef} selectedValue={selectedWifi} onValueChange={(itemValue, itemIndex) => setSelectedWifi(itemValue)}>
                    { wlanList.map((item) => (<Picker.Item key={item.BSSID} label={item.SSID} value={item} />)) }                
                </Picker>}
                <TextInput placeholder='Password' secureTextEntry={true} onChangeText={setPassword}/>
                        
                <TouchableOpacity style={modalStyle.closeButton} onPress={() => props.closeModal(password, selectedWifi)}>
                    <Text style={modalStyle.closeButtonText}>Schließen</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );

};

const modalStyle = StyleSheet.create({
    modalContainer: {
      flex: 1,
      height: '100%',
      backgroundColor: "#f2f2f2",
    },
    modalFlatlistContiner: {
      flex: 1,
      justifyContent: "center",
    },
    closeButton: {
        backgroundColor: "#FF6060",
        justifyContent: "center",
        alignItems: "center",
        height: 50,
        marginHorizontal: 20,
        marginTop: 50,
        marginBottom: 5,
        borderRadius: 8,
        
    },
    closeButtonText: {
        
        fontSize: 18,
        fontWeight: "bold",
        color: "white",
        
    },
    File: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        borderWidth: 1,
        marginVertical: 2
    }
});

export default SetDeviceWlan;