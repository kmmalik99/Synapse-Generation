
import { GoogleGenAI, Modality } from "@google/genai";
import { extractFramesFromVideo } from "../utils/video";

const getAi = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // This is a safeguard, but App.tsx should handle the UI for a missing key.
    throw new Error("API_KEY environment variable not set");
  }
  return new GoogleGenAI({ apiKey });
};

const ENHANCER_SYSTEM_INSTRUCTION = `You are an expert prompt engineer. Your task is to take a user's raw idea and transform it into a powerful, precise, and effective prompt for an AI model. The enhanced prompt should be structured, detailed, and clear. Format your response as a Markdown block.`;

export async function* enhancePromptStream(rawPrompt: string): AsyncGenerator<string> {
  const ai = getAi();
  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: rawPrompt,
    config: {
      systemInstruction: ENHANCER_SYSTEM_INSTRUCTION,
    }
  });

  for await (const chunk of response) {
    yield chunk.text;
  }
}

// FIX: Added the missing `generateImage` function to be used by the ImageGenerator component.
export async function generateImage(prompt: string, aspectRatio: string): Promise<string> {
  // Image generation requires a separate API key flow handled by the component.
  // We re-initialize `ai` here to ensure the latest key from the dialog is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio,
    },
  });

  const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
}

export async function editImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const ai = getAi();
  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType,
    },
  };
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [imagePart, textPart] },
    config: {
        responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("No edited image was generated.");
}

export async function* analyzeImageStream(prompt: string, imageBase64: string, mimeType: string): AsyncGenerator<string> {
  const ai = getAi();
  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType,
    },
  };
  const textPart = { text: prompt };

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [imagePart, textPart] },
  });

  for await (const chunk of response) {
    yield chunk.text;
  }
}

export async function* analyzeVideoStream(prompt: string, videoFile: File): AsyncGenerator<string> {
    const ai = getAi();
    const videoUrl = URL.createObjectURL(videoFile);
  
    // Extract 1 frame per second, up to a max of 50 frames to avoid being too slow
    const frames = await extractFramesFromVideo(videoUrl, 1, 50);
    URL.revokeObjectURL(videoUrl);
  
    if (frames.length === 0) {
      throw new Error("Could not extract any frames from the video.");
    }
  
    const imageParts = frames.map(frameDataURL => ({
      inlineData: {
        data: frameDataURL.split(',')[1],
        mimeType: 'image/jpeg'
      }
    }));
  
    const fullPrompt = `${prompt}\n\nThe following are frames from the video. Analyze them in sequence.`;
  
    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-pro",
      contents: { parts: [{ text: fullPrompt }, ...imageParts] },
    });
  
    for await (const chunk of response) {
        yield chunk.text;
    }
}

export async function* transcribeAudio(audioBase64: string, mimeType: string): AsyncGenerator<string> {
  const ai = getAi();
  const audioPart = {
    inlineData: {
      data: audioBase64,
      mimeType: mimeType,
    }
  };

  const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: "Transcribe the following audio recording:" },
          audioPart
        ]
      },
  });

  for await (const chunk of response) {
    yield chunk.text;
  }
}

export async function generateSpeech(text: string, voice: string): Promise<string> {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
          },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API.");
    }
    return base64Audio;
}


export async function* generateVideo(
  prompt: string,
  imageFile: File | null,
  updateCallback: (message: string) => void,
  aspectRatio: string,
  resolution: string
): AsyncGenerator<{ videoUrl: string, operation: any }> {
  // Video generation requires a separate API key flow handled by the component.
  // We re-initialize `ai` here to ensure the latest key from the dialog is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePayload = imageFile ? {
      imageBytes: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(imageFile);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
      }),
      mimeType: imageFile.type,
  } : undefined;

  let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      ...(imagePayload && { image: imagePayload }),
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio,
      }
  });
  
  const loadingMessages = [
      "Warming up the digital director's chair...",
      "Casting pixels for their big roles...",
      "The digital film is rolling...",
      "Rendering scene by scene...",
      "This can take a few minutes...",
      "Finalizing the special effects...",
      "Polishing the final cut..."
  ];
  let messageIndex = 0;

  while (!operation.done) {
      updateCallback(loadingMessages[messageIndex % loadingMessages.length]);
      messageIndex++;
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
  }
  
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (downloadLink) {
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error(`Failed to download video (status: ${response.status}).`);
      
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);
      yield { videoUrl, operation };
  } else {
      throw new Error("Video generation completed but no download link was found.");
  }
}

export async function* extendVideo(
    prompt: string,
    previousOperation: any,
    updateCallback: (message: string) => void
): AsyncGenerator<{ videoUrl: string, newOperation: any }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const previousVideo = previousOperation.response?.generatedVideos?.[0]?.video;

    if (!previousVideo) {
        throw new Error("Invalid previous video data. Cannot extend.");
    }

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview', // Extension requires the advanced model
        prompt: prompt,
        video: previousVideo,
        config: {
          numberOfVideos: 1,
          resolution: '720p', // Extension is currently limited to 720p
          aspectRatio: previousVideo.aspectRatio,
        }
    });

    const loadingMessages = [
        "Revisiting the cutting room...",
        "Preparing the next scene...",
        "Extending the timeline...",
        "This might take a moment...",
        "Adding new frames...",
        "Stitching the clips together..."
    ];
    let messageIndex = 0;

    while (!operation.done) {
        updateCallback(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error(`Failed to download extended video (status: ${response.status}).`);
        
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        yield { videoUrl, newOperation: operation };
    } else {
        throw new Error("Video extension completed but no download link was found.");
    }
}


export async function generateVideoPromptWithSearch(searchQuery: string): Promise<string> {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchQuery,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a creative director for a video production company. Based on the user's search query and the provided search results, generate a single, detailed, and visually rich video prompt. The prompt should be a single paragraph, ready to be used directly by a text-to-video AI model. Do not add any extra text, titles, introductory phrases (like "Here is a prompt:"), or markdown formatting. Just output the prompt text itself.`,
      },
    });
    return response.text.trim();
  }
