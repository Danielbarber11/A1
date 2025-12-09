
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signOut
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

// Declare window.google for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDu9xJlDhzA5TfBsakrQj21Ybupjcu7KDo",
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

// --- AUTHENTICATION (Direct Google Cloud OAuth) ---

export const signInWithGoogle = async (): Promise<User> => {
    // Client ID provided by user
    const CLIENT_ID = '1029411846084-2jidcvnmiumb0ajqdm3fcot1rvmaldr6.apps.googleusercontent.com';

    return new Promise((resolve, reject) => {
        // Ensure script is loaded
        if (!window.google || !window.google.accounts) {
            reject(new Error("Google Identity Services script not loaded. Please refresh the page."));
            return;
        }

        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: async (tokenResponse: any) => {
                if (tokenResponse.access_token) {
                    try {
                        // 1. Get User Info from Google
                        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        });
                        
                        if (!userInfoResponse.ok) {
                            throw new Error("Failed to fetch user info from Google");
                        }

                        const googleUser = await userInfoResponse.json();

                        // 2. Interact with Firebase Realtime Database
                        // We use the Google 'sub' ID as the User UID
                        const uid = googleUser.sub;
                        const dbRef = ref(db);
                        const userRef = child(dbRef, `users/${uid}`);
                        const snapshot = await get(userRef);

                        let appUser: User = {
                            email: googleUser.email,
                            name: googleUser.name,
                            picture: googleUser.picture,
                            uid: uid,
                            hasAcceptedTerms: false
                        };

                        if (snapshot.exists()) {
                            // Existing User
                            const data = snapshot.val();
                            appUser = { ...appUser, ...data, hasAcceptedTerms: data.hasAcceptedTerms === true };
                            
                            // Update login time
                             await set(ref(db, `users/${uid}`), {
                                ...data,
                                lastLogin: Date.now(),
                                email: googleUser.email,
                                picture: googleUser.picture
                            });
                        } else {
                            // New User
                             await set(ref(db, `users/${uid}`), {
                                ...appUser,
                                createdAt: Date.now(),
                                lastLogin: Date.now(),
                                hasAcceptedTerms: false
                            });
                        }
                        
                        // Save to local storage for persistence (Bypassing Firebase Auth Listener)
                        localStorage.setItem('aivan_user', JSON.stringify(appUser));
                        
                        resolve(appUser);

                    } catch (error) {
                        console.error("Error fetching user info or saving to DB:", error);
                        reject(error);
                    }
                } else {
                    reject(new Error("Failed to obtain access token from Google"));
                }
            },
            error_callback: (err: any) => {
                console.error('GIS Error:', err);
                reject(err);
            }
        });

        client.requestAccessToken();
    });
};

export const logoutUser = async () => {
  localStorage.removeItem('aivan_user');
  await signOut(auth); // Try to sign out of Firebase too just in case
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
            await set(userRef, userData);
        }
    } catch (e) {
        console.error("Error saving user data:", e);
    }
};
