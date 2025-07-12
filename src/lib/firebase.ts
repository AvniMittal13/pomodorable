
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Log environment variables for debugging
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
console.log("Attempting to read NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfigFromEnv = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
//   measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
// };
// console.log("Firebase config from ENV (if used):", firebaseConfigFromEnv);

// This is the currently active configuration block
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
console.log("Firebase config from ENV:", firebaseConfig);


// Initialize Firebase
let app;
let auth;
let db;

try {
  console.log("Attempting to initialize Firebase app...");
  app = initializeApp(firebaseConfig);
  console.log("Firebase App initialized:", app ? 'Success' : 'Failed. App object:', app);
  
  console.log("Attempting to initialize Firebase Auth...");
  auth = getAuth(app);
  console.log("Firebase Auth initialized:", auth ? 'Success' : 'Failed. Auth object:', auth);
  
  console.log("Attempting to initialize Firestore DB...");
  db = getFirestore(app);
  console.log("Firestore DB initialized:", db ? 'Success' : 'Failed. DB object:', db);

  if(db && db.app && db.app.options) {
    console.log("Firestore SDK believes it's connected to project ID:", db.app.options.projectId);
  } else if (db) {
    console.warn("Firestore DB object exists, but app options or projectId might be missing.");
  }

} catch (error) {
  console.error("Firebase initialization error during app, auth, or db setup:", error);
  // It's crucial to not re-export auth and db if initialization fails,
  // or at least provide a way for the app to gracefully handle this.
  // For now, we'll let them be undefined, and consuming code should check.
}

// Export auth and db instances
export { auth, db };
// It's generally not recommended to export 'app' directly unless specifically needed.
// export { app, auth, db };
