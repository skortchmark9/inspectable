import AsyncStorage from '@react-native-async-storage/async-storage';

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
    console.log('🔐 Signing in user:', email);
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('🌐 Sign in response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Sign in error:', error);
      throw new Error(error.error || 'Sign in failed');
    }

    const data = await response.json();
    console.log('✅ Sign in successful, saving token...');
    
    this.accessToken = data.access_token;
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('user_email', email);
    
    console.log('💾 Token saved to AsyncStorage');
    console.log('🔑 Token preview:', data.access_token.substring(0, 20) + '...');
    
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
    console.log('🔑 Getting token...');
    if (!this.accessToken) {
      console.log('🔍 No token in memory, checking AsyncStorage...');
      this.accessToken = await AsyncStorage.getItem('access_token');
      console.log('📦 Token from storage:', this.accessToken ? 'Found' : 'Not found');
    } else {
      console.log('💾 Using token from memory');
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
    console.log('🔍 Validating token...');
    const token = await this.getToken();
    if (!token) {
      console.log('❌ No token to validate');
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

      console.log('🔍 Validation response:', response.status);
      
      if (response.ok) {
        const user = await response.json();
        console.log('✅ Token valid for user:', user.email);
        return true;
      } else {
        console.log('❌ Token invalid:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Token validation error:', error);
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
    console.log('🏠 Creating inspection via:', `${BASE_URL}/inspections`);
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

    console.log('🏠 Inspection creation response:', response.status);
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
    console.log('📤 Starting upload to backend:', { inspectionId, photoUri, audioUri: !!audioUri });
    
    try {
      const headers = await this.getAuthHeaders();
      const formData = new FormData();

      // Add photo
      console.log('📷 Adding photo to form data');
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      // Add audio if provided
      if (audioUri) {
        console.log('🎵 Adding audio to form data');
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
      console.log('🌐 Making request to:', url);
      console.log('🔍 Expected pathname in function: /inspections/' + inspectionId + '/items');
      console.log('🔍 Full URL breakdown:', {
        baseUrl: BASE_URL,
        functionName: 'inspection-items',
        expectedPath: `/inspections/${inspectionId}/items`,
        fullUrl: url
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        throw new Error(`Backend error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Backend response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload inspection item');
      }
      return data.data;
    } catch (error) {
      console.error('💥 Upload error details:', error);
      throw error;
    }
  }

  async getInspections(): Promise<any[]> {
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

  async getInspection(id: string): Promise<any> {
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

  async analyzePhoto(photoUri: string): Promise<string> {
    console.log('📷 Testing photo analysis endpoint...');
    
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const url = `${BASE_URL}/ai-analysis/analyze-photo`;
    console.log('🌐 Photo analysis URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    console.log('📊 Photo analysis response:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Photo analysis error:', errorText);
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