import React, { createContext, useContext } from 'react';
import useBLE, { bleCallback, debugLogType } from '@/hooks/useBLE'; // Importiere useBLE aus deinem Hook-Verzeichnis
import { Communication } from '@/constants/bleTypes';


// Erstelle den BLE-Kontext
export interface BLEContextProps {
  sendCommand: (command: Communication.BLE_COMMANDS, params: any, bleCallback?: bleCallback) => void;
  askForSDCard: (callback: {oneTime: boolean, type:number , func: (datat: any) => void}) => void;
  allDevices: any[];
  connectedDevice: any;
  connectToDevice: (device: any) => void;
  disconnectDevice: () => void;
  receivedData: any;
  registerCallback: (callback: bleCallback & {id: string})=> void,
  notiviedData: any;
  logData: debugLogType;
  requestPermissions: () => Promise<boolean>;
  scanForPeripherals: () => void;
}

const BLEContext = createContext<BLEContextProps | null>(null);

// Erstelle einen Provider für den BLE-Kontext
export const BLEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bleData = useBLE();

  return (
    <BLEContext.Provider value={bleData}>
      {children}
    </BLEContext.Provider>
  );
};

// Erstelle einen Hook, um den BLE-Kontext zu verwenden
export const useBLEContext = () => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLEContext must be used within a BLEProvider');
  }
  return context;
};

export default BLEContext;
