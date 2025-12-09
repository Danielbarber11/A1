
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  child, 
  onValue,
  query,
  orderByChild
} from "firebase/database";
import { getStorage } from "firebase/storage";
import { User, SavedProject } from "../types";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDxSOTXOOuck0N1vnqQPKC5YwBfH_g7Efo",
  authDomain: "verdantconnect-wp8dj.firebaseapp.com",
  databaseURL: "https://verdantconnect-wp8dj-default-rtdb.firebaseio.com",
  projectId: "verdantconnect-wp8dj",
  storageBucket: "verdantconnect-wp8dj.firebasestorage.app",
  messagingSenderId: "530048230107",
  appId: "1:530048230107:web:e400c941adc4d4f829e2fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getDatabase(app); // Realtime Database
export const storage = getStorage(app);

// --- AUTHENTICATION ---
const provider = new GoogleAuthProvider();

// Custom Parameters with the Client ID provided
provider.setCustomParameters({
  client_id: '1029411846084-2jidcvnmiumb0ajqdm3fcot1rvmaldr6.apps.googleusercontent.com',
  prompt: 'select_account'
});

provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Reference to user in Realtime DB
    const dbRef = ref(db);
    const userRef = child(dbRef, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    let appUser: User = {
      email: user.email || "",
      name: user.displayName || "User",
      picture: user.photoURL || "",
      uid: user.uid,
      hasAcceptedTerms: false 
    };

    if (snapshot.exists()) {
      // Existing user: Load data
      const data = snapshot.val();
      
      appUser = { 
          ...appUser, 
          ...data,
          hasAcceptedTerms: true // Existing users skip terms
      };
      
      // Update last login
      await set(ref(db, `users/${user.uid}`), {
          ...data,
          lastLogin: Date.now(),
          email: user.email, 
          picture: user.photoURL
      });

    } else {
      // New user
      await set(ref(db, `users/${user.uid}`), {
          ...appUser,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          hasAcceptedTerms: false 
      });
    }
    
    return appUser;
  } catch (error) {
    console.error("Firebase Auth Error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

// --- REALTIME DATABASE FUNCTIONS ---

export const saveProjectToCloud = async (userId: string, project: SavedProject) => {
  try {
    const projectRef = ref(db, `users/${userId}/projects/${project.id}`);
    await set(projectRef, {
        ...project,
        cloudId: project.id,
        lastSynced: Date.now()
    });
  } catch (e) {
    console.error("Error saving project to cloud:", e);
  }
};

export const subscribeToProjects = (userId: string, callback: (projects: SavedProject[]) => void) => {
    const projectsRef = query(ref(db, `users/${userId}/projects`), orderByChild('lastModified'));

    return onValue(projectsRef, (snapshot) => {
        const projects: SavedProject[] = [];
        snapshot.forEach((childSnapshot) => {
            projects.push(childSnapshot.val() as SavedProject);
        });
        // Realtime DB sorts ascending, we usually want descending (newest first)
        callback(projects.reverse());
    }, (error) => {
        console.error("Error syncing projects:", error);
    });
};

export const saveUserPreferencesToCloud = async (userId: string, userData: Partial<User>) => {
    try {
        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const currentData = snapshot.val();
            await set(userRef, { ...currentData, ...userData });
        } else {
            // Should exist if logged in, but just in case
            await set(userRef, userData);
        }
    } catch (e) {
        console.error("Error saving user data:", e);
    }
};
