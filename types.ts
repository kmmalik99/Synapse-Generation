
import React from 'react';

export enum AppMode {
  Enhancer = 'enhancer',
  AppBuilder = 'appBuilder',
  ImageGenerator = 'imageGenerator',
  ImageAnalyst = 'imageAnalyst',
  ImageEditor = 'imageEditor',
  ImageAnimator = 'imageAnimator',
  VideoGenerator = 'videoGenerator',
  VideoEditor = 'videoEditor',
  VideoAnalyst = 'videoAnalyst',
  VoiceChat = 'voiceChat',
  TextToSpeech = 'textToSpeech',
  AudioTranscriber = 'audioTranscriber',
  Chat = 'chat',
}

export interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    // To hold special content like audio players, videos, or buttons
    content?: React.ReactNode; 
}