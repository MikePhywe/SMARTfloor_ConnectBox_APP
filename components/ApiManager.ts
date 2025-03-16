import axios, { AxiosInstance, AxiosError, AxiosResponse, AxiosProgressEvent } from 'axios';
import { Alert } from 'react-native';

export interface ApiManagerProgressEvent extends AxiosProgressEvent {

}

class ApiManager {
  private static instance: ApiManager;
  private axiosInstance: AxiosInstance;
  private ip: string;

  private constructor(ip: string) {
    this.ip = ip;
    this.axiosInstance = axios.create({
      // Die Base URL wird nun dynamisch mit der IP erstellt
      baseURL: `http://${this.ip}:80`,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    // Interceptor für Fehlerbehandlung
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (axios.isAxiosError(error)) {
          Alert.alert('Network Error', 'Failed to communicate with the server. Please check your connection.');
        } else {
          console.error('Unexpected Error:', error);
          Alert.alert('Error', 'An unexpected error occurred.');
        }
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(ip?: string): ApiManager {
    if (!ApiManager.instance) {
      if (!ip) {
        throw new Error("IP address must be provided when creating the first instance of ApiManager.");
      }
      ApiManager.instance = new ApiManager(ip);
    } else if (ip && ApiManager.instance.ip !== ip) {
      // Hier könnte man die IP aktualisieren, falls sie sich ändert.
      // Für dieses Beispiel werfen wir einen Fehler, wenn die IP sich ändert.
      throw new Error("IP address cannot be changed after ApiManager has been initialized.");
    }
    return ApiManager.instance;
  }

  public async get<T>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public async post<T>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public async delete<T>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
  public get ipAdress() {
    return this.ip;
  }
  // Weitere Methoden wie put, patch, etc. können hier hinzugefügt werden
}

export default ApiManager;
