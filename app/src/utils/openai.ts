import * as FileSystem from 'expo-file-system';

const OPENAI_API_KEY = '<YOUR_OPENAI_API_KEY>';


export async function analyzeImage(base64Image: string): Promise<string> {
  if (OPENAI_API_KEY === '<YOUR_OPENAI_API_KEY>') {
    return 'Furnace nameplate'; // Mock response for testing
  }

  try {
    const cleanBase64 = base64Image.trim().replace(/\n/g, '');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                // text: 'Identify this building equipment or HVAC component. Provide a brief, specific label (e.g., "Furnace nameplate", "Thermostat", "Breaker panel"). Focus on equipment relevant to home inspections.'
                text: 'What is in this picture?'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 50,
      }),
    });

    const parsed = await response.json();
    console.log('OpenAI Vision Response:', parsed);

    return parsed.choices?.[0]?.message?.content ?? 'Unknown equipment';
  } catch (error) {
    console.error('OpenAI Vision error:', error);
    return 'Equipment identification failed';
  }
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (OPENAI_API_KEY === '<YOUR_OPENAI_API_KEY>') {
    return 'Looking at the equipment model number and checking its condition'; // Mock response for testing
  }

  try {
    // Read the audio file
    const audioInfo = await FileSystem.getInfoAsync(audioUri);
    if (!audioInfo.exists) {
      throw new Error('Audio file not found');
    }

    // Create FormData for Whisper API
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const parsed = await response.json();
    console.log('OpenAI Whisper Response:', parsed);

    return parsed.text ?? 'No transcription available';
  } catch (error) {
    console.error('OpenAI Whisper error:', error);
    return 'Audio transcription failed';
  }
}