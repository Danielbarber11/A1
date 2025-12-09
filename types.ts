
export enum Screen {
  AUTH = 'AUTH',
  TERMS = 'TERMS',
  HOME = 'HOME',
  WORKSPACE = 'WORKSPACE',
  PREMIUM = 'PREMIUM',
  ADVERTISE = 'ADVERTISE',
  AD_MANAGEMENT = 'AD_MANAGEMENT'
}

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum SettingsTab {
  ACCOUNT = 'ACCOUNT',
  PREMIUM = 'PREMIUM',
  INTERFACE = 'INTERFACE',
  HISTORY = 'HISTORY',
  ACCESSIBILITY = 'ACCESSIBILITY',
  HELP = 'HELP',
  CONTACT = 'CONTACT',
  ABOUT = 'ABOUT',
  TERMS = 'TERMS'
}

export enum ChatMode {
  CREATOR = 'CREATOR',
  QUESTION = 'QUESTION'
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface SavedProject {
  id: string;
  cloudId?: string; // For Firebase Sync
  name: string; 
  language: string;
  model: string;
  lastModified: number;
  code: string;
  creatorMessages: ChatMessage[];
  questionMessages: ChatMessage[];
  codeHistory: string[];
}

export interface ProjectConfig {
  id?: string;
  prompt: string;
  language: string;
  model: string;
  chatMode: ChatMode;
  files?: FileList | null;
  initialCode?: string;
  initialCreatorMessages?: ChatMessage[];
  initialQuestionMessages?: ChatMessage[];
  initialCodeHistory?: string[];
}

export interface GeneratedCode {
  language: string;
  code: string;
}

export type Theme = 'light' | 'dark' | 'midnight' | 'sunset' | 'ocean' | 'forest' | 'cherry';

export interface UserPreferences {
  enterToSend: boolean;
  streamCode: boolean;
  saveHistory: boolean;
  appLanguage?: 'he' | 'en';
  theme?: Theme;
  dailyRequestsCount?: number;
  lastRequestDate?: string;
}

export interface User {
  uid?: string; // Firebase UID
  email: string;
  password?: string; 
  name?: string;
  picture?: string;
  hasAcceptedTerms: boolean;
  preferences?: UserPreferences;
  isAdmin?: boolean;
  isPremium?: boolean;
  hasAdSupportedPremium?: boolean;
}

export interface AdMedia {
    type: 'image' | 'video';
    data: string; // Base64 string
    name: string;
}

export interface AdRequest {
  id: string;
  userId: string;
  userEmail: string;
  description: string;
  budget: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
  mediaFiles: AdMedia[]; 
  targetUrl?: string;
}
