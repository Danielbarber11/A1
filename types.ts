
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
  name: string; // The prompt acts as the name usually
  language: string;
  model: string;
  lastModified: number;
  code: string;
  creatorMessages: ChatMessage[];
  questionMessages: ChatMessage[];
  codeHistory: string[];
}

export interface ProjectConfig {
  id?: string; // Optional ID for existing projects
  prompt: string;
  language: string;
  model: string;
  chatMode: ChatMode;
  files?: FileList | null;
  // For loading existing projects
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
  email: string;
  password?: string; // Optional for Google Auth
  name?: string;
  picture?: string;
  hasAcceptedTerms: boolean;
  preferences?: UserPreferences;
  isAdmin?: boolean;
  isPremium?: boolean;
  hasAdSupportedPremium?: boolean;
}

export interface AdRequest {
  id: string;
  userId: string;
  userEmail: string;
  description: string;
  budget: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
  mediaName?: string; // Simulation of file
  targetUrl?: string;
}
