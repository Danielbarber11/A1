// ===== FIREBASE CONFIG =====
// This file manages cloud storage for data persistence
// Data is synchronized across all devices for the same user

import { getDatabase, ref, set, get, child, push, remove } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || ''
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== CLOUD DATA SERVICE =====
export const CloudDataService = {
  // Save user data to cloud
  async saveUserData(userId: string, userData: any) {
    try {
      await set(ref(db, `users/${userId}`), {
        ...userData,
        lastUpdated: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving user data:', error);
      return { success: false, error };
    }
  },

  // Load user data from cloud
  async loadUserData(userId: string) {
    try {
      const snapshot = await get(child(ref(db), `users/${userId}`));
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('Error loading user data:', error);
      return { success: false, error };
    }
  },

  // Save user history to cloud
  async saveUserHistory(userId: string, history: string[]) {
    try {
      await set(ref(db, `users/${userId}/history`), history);
      return { success: true };
    } catch (error) {
      console.error('Error saving history:', error);
      return { success: false, error };
    }
  },

  // Load user history from cloud
  async loadUserHistory(userId: string) {
    try {
      const snapshot = await get(child(ref(db), `users/${userId}/history`));
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error loading history:', error);
      return { success: false, error };
    }
  },

  // Save project configuration
  async saveProjectConfig(userId: string, projectId: string, config: any) {
    try {
      await set(ref(db, `users/${userId}/projects/${projectId}`), config);
      return { success: true };
    } catch (error) {
      console.error('Error saving project:', error);
      return { success: false, error };
    }
  },

  // Load all user projects
  async loadUserProjects(userId: string) {
    try {
      const snapshot = await get(child(ref(db), `users/${userId}/projects`));
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: {} };
    } catch (error) {
      console.error('Error loading projects:', error);
      return { success: false, error };
    }
  },

  // Save user preferences
  async saveUserPreferences(userId: string, preferences: any) {
    try {
      await set(ref(db, `users/${userId}/preferences`), preferences);
      return { success: true };
    } catch (error) {
      console.error('Error saving preferences:', error);
      return { success: false, error };
    }
  },

  // Load user preferences
  async loadUserPreferences(userId: string) {
    try {
      const snapshot = await get(child(ref(db), `users/${userId}/preferences`));
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      }
      return { success: true, data: {} };
    } catch (error) {
      console.error('Error loading preferences:', error);
      return { success: false, error };
    }
  }
};

export default CloudDataService;
