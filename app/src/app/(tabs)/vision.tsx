import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Button, Image, Linking, StyleSheet, Text, View } from "react-native";

const OPENAI_API_KEY = 'none';

async function callOpenAIVisionAsync(base64Image) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is this a picture of?" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    }),
  });

  const parsed = await response.json();

  console.log("OpenAI Response:", parsed);

  return parsed.choices?.[0]?.message?.content ?? "No description found.";
}

function VisionScreen() {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState(null);

  const takePictureAsync = async () => {
    const { cancelled, uri, base64 } = await ImagePicker.launchCameraAsync({
      base64: true,
    });
    if (!cancelled) {
      setImage(uri);
      setStatus("Analyzing...");
      try {
        const result = await callOpenAIVisionAsync(base64);
        setStatus(result);
      } catch (error) {
        console.log(error);
        setStatus(`Error: ${error.message}`);
      }
    } else {
      setImage(null);
      setStatus(null);
    }
  };

  return (
    <View style={styles.container}>
      {image && <Image style={styles.image} source={{ uri: image }} />}
      {status && <Text style={styles.text}>{status}</Text>}
      <Button onPress={takePictureAsync} title="Take a Picture" />
    </View>
  );
}

export default function App() {
  const [permission, request] = ImagePicker.useCameraPermissions({
    get: true,
  });

  const requestPermission = async () => {
    if (permission.status === "denied") {
      Linking.openSettings();
    } else {
      request();
    }
  };

  if (OPENAI_API_KEY === "<YOUR_OPENAI_API_KEY>") {
    return (
      <View style={styles.container}>
        <Text>
          You have not setup the API yet. Please add your OpenAI API key to the code.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>
          You have not granted permission to use the camera on this device!
        </Text>
        <Button onPress={requestPermission} title="Request Permission" />
      </View>
    );
  }

  return <VisionScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 10,
  },
  text: {
    marginVertical: 10,
    textAlign: "center",
  },
});
