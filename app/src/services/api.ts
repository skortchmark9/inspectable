import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendInspectionListResponse, BackendInspectionDetailsResponse } from '@/types';

const SUPABASE_URL = 'https://yqevuyyiorrdsopufeyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZ1eXlpb3JyZHNvcHVmZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzE1ODUsImV4cCI6MjA2NzQwNzU4NX0.Kjr18soW5R5yMscDZcIRZdE1moPFE89S2fBhujJ2xOY';
const BASE_URL = `${SUPABASE_URL}/functions/v1`;

class AuthManager {
  private static instance: AuthManager;
  private accessToken: string | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async signIn(email: string, password: string): Promise<string> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Sign in failed:', error);
      throw new Error(error.error || 'Sign in failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('user_email', email);
    return data.access_token;
  }

  async signUp(email: string, password: string): Promise<string> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sign up failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('user_email', email);
    return data.access_token;
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('user_email');
  }

  async getToken(): Promise<string | null> {
    if (!this.accessToken) {
      this.accessToken = await AsyncStorage.getItem('access_token');
    }
    return this.accessToken;
  }

  async getCurrentUser(): Promise<string | null> {
    return AsyncStorage.getItem('user_email');
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  async validateToken(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return false;
    }

    try {
      // Test token by getting user info
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });
      
      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

class InspectionAPIClient {
  private static instance: InspectionAPIClient;
  private authManager: AuthManager;

  constructor() {
    this.authManager = AuthManager.getInstance();
  }

  static getInstance(): InspectionAPIClient {
    if (!InspectionAPIClient.instance) {
      InspectionAPIClient.instance = new InspectionAPIClient();
    }
    return InspectionAPIClient.instance;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.authManager.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  async createInspection(propertyAddress: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${BASE_URL}/inspections`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        property_address: propertyAddress,
        metadata: { source: 'ios' },
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create inspection');
    }
    return data.data;
  }

  async uploadInspectionItem(
    inspectionId: string,
    photoUri: string,
    audioUri: string | null,
    label: string,
    location?: { latitude: number; longitude: number },
    notes?: string
  ): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const formData = new FormData();

      // Add photo
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      // Add audio if provided
      if (audioUri) {
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'audio.m4a',
        } as any);
      }

      // Add other fields
      formData.append('label', label);
      if (location) {
        formData.append('location', JSON.stringify(location));
      }
      if (notes) {
        formData.append('notes', notes);
      }

      const url = `${BASE_URL}/inspection-items/inspections/${inspectionId}/items`;
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', response.status, errorText);
        throw new Error(`Backend error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload inspection item');
      }
      return data.data;
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }

  async getInspections(): Promise<BackendInspectionListResponse[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${BASE_URL}/inspections`, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get inspections');
    }
    return data.data;
  }

  async getInspection(id: string): Promise<BackendInspectionDetailsResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${BASE_URL}/inspections/${id}`, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get inspection');
    }
    return data.data;
  }

  async deleteInspection(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${BASE_URL}/inspections/${id}`, {
      method: 'DELETE',
      headers: headers,
    });
    console.log('deleting mf', id);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Delete inspection failed:', response.status, errorText);
      throw new Error(`Failed to delete inspection: ${response.status}`);
    }
    console.log('deleted mf');

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete inspection');
    }
  }

  async analyzePhoto(photoUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const url = `${BASE_URL}/ai-analysis/analyze-photo`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Photo analysis failed:', response.status, errorText);
      throw new Error(`Photo analysis failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to analyze photo');
    }
    return data.data.suggested_label;
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);

    const response = await fetch(`${BASE_URL}/ai-analysis/transcribe-audio`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to transcribe audio');
    }
    return data.data.transcription;
  }
}

export const authManager = AuthManager.getInstance();
export const apiClient = InspectionAPIClient.getInstance();