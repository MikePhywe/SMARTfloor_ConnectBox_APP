import React, { FC, useCallback } from 'react';
import {
    FlatList,
    ListRenderItemInfo,
    Modal,
    SafeAreaView,
    Text,
    StyleSheet,
    TouchableOpacity,
  } from "react-native";

export type fileItemListProperties = {
    id: string,
    title: string,
    size: number,
    type: string,
}

type FileItemProps = {
    item: ListRenderItemInfo<fileItemListProperties>,
    onPress: () => void,
}

type filesListModalProperties = { 
    FileItems: fileItemListProperties[],
    visible: boolean,
    onClose: (item: fileItemListProperties) => void,
    closeModal: () => void
}

export const FileItem: FC<FileItemProps> = ({ item, onPress }) => {
    const handlePress = useCallback(() => {
        onPress();
    }, [onPress]);
    
    return (
        <TouchableOpacity onPress={handlePress} style={modalStyle.File}>
            <Text>{item.item.type === 'folder' ? '📁 ' : '📄 '}</Text>
            <Text>{item.item.title}</Text>
            <Text>{item.item.size} bytes</Text>
        </TouchableOpacity>
    )
}

export const FilesListModal: FC<filesListModalProperties> = ({FileItems, onClose, visible, closeModal }) => { 
    const renderFilesModalListItem = useCallback(
        (item: ListRenderItemInfo<fileItemListProperties>) => {
          return (
            <FileItem
              item={item}
              onPress={() => onClose(item.item)}
            />
          );
        },
        [closeModal, onClose]
      );

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <SafeAreaView style={modalStyle.modalContainer}>
                <FlatList
                    data={FileItems}
                    renderItem={renderFilesModalListItem}
                    keyExtractor={(item) => item.title}
                />
                        
                <TouchableOpacity style={modalStyle.closeButton} onPress={closeModal}>
                    <Text style={modalStyle.closeButtonText}>Schließen</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );

};

const modalStyle = StyleSheet.create({
    modalContainer: {
      flex: 1,
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
        marginVertical: 1
    }
});

export default FilesListModal;