export interface VoiceOption {
  id: string;
  name: string;
  labelAr: string;
  labelEn: string;
  gender: "female" | "male" | "neutral";
  toneAr: string;
  toneEn: string;
}

export interface GeneratedAudioItem {
  id: string;
  title: string;
  text: string;
  audioUrl: string;
  rawBase64: string;
  duration?: number;
  createdAt: string;
  voice: string;
  isMultiSpeaker?: boolean;
  speaker1?: string;
  speaker2?: string;
  voice1?: string;
  voice2?: string;
  cacheKey?: string;
  stylePrompt?: string;
  speakingRate?: "slow" | "normal" | "fast";
}

export interface TopicTemplate {
  id: string;
  titleAr: string;
  titleEn: string;
  categoryAr: string;
  categoryEn: string;
  isDialogue?: boolean;
  speaker1?: string;
  speaker2?: string;
  speaker1En?: string;
  speaker2En?: string;
  voice1?: string;
  voice2?: string;
  defaultTextAr: string;
  defaultTextEn: string;
}
