export interface Album {
  id: string;
  name: string; // Encrypted if isPrivate, or always encrypted for safety
  description: string; // Encrypted
  isPrivate: boolean; // Private albums require an extra layer or are hidden without unlock
  createdAt: number;
}

export interface Photo {
  id: string;
  albumId: string;
  encryptedData: string; // Encrypted base64 of image or video
  type: 'image' | 'video';
  mimeType: string;
  filename: string;
  caption: string; // Encrypted
  createdAt: number;
}

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // Encrypted
  description: string; // Encrypted
  icon: string; // lucide icon identifier
  category: string; // e.g., 'Viaje', 'Aniversario', 'Cita', 'Otro'
  createdAt: number;
}

export interface RomanticMessage {
  id: string;
  author: string; // Encrypted
  text: string; // Encrypted
  color: string; // Tailwind bg class
  style: 'sticky' | 'letter';
  createdAt: number;
}

export interface Song {
  id: string;
  title: string; // Plain or encrypted
  artist: string; // Plain or encrypted
  url: string; // MP3 URL, YouTube Embed ID, or Spotify URL
  note: string; // Encrypted romantic note why it's "our song"
  createdAt: number;
  isPreloaded?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  hint?: string;
  isCustom?: boolean;
}

export interface Coupon {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  unlocked: boolean;
  claimedAt?: number;
}

export interface RelationshipConfig {
  partnerAName: string;
  partnerBName: string;
  startDate: string; // YYYY-MM-DD
  loveKeyHash?: string; // SHA-256 hash of key to verify on returning
}
