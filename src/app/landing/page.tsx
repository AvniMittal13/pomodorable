'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

const LandingPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to the main app
        router.push('/');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
 // Redirection is handled by the onAuthStateChanged effect
    } catch (error) {
      console.error("Error signing in with Google:", error);
      // Handle errors (e.g., display a message to the user)
    }
  };

  // Placeholder for other login methods if needed later
  const handleLogin = () => {
    // For now, we can just trigger the Google Sign-In
    handleGoogleSignIn();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">Pomodorable</h1> {/* Title based on blueprint */}
      <p className="text-lg mb-8 text-gray-600 text-center max-w-md">
        Enhance your productivity and well-being with Pomodorable, the all-in-one Pomodoro timer, task manager, and mood tracker.
      </p>

      <div className="mb-8 max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Features:</h2>
        <ul className="list-disc list-inside text-gray-600">
          {/* Features listed based on blueprint */}
          <li>Customizable Pomodoro Timer with adjustable durations.</li>
          <li>Interactive Todo List to manage your tasks efficiently.</li>
          <li>Mood Tracker to monitor your emotional state throughout your sessions.</li>
          <li>Plant Tracker that grows with your focus sessions (Gamification).</li>
          <li>Music Player integration for a focused ambiance.</li>
          <li>Sticky Notes for quick ideas and reminders.</li>
          <li>Track your progress and view historical data (Coming Soon).</li> {/* New feature */}
        </ul>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleGoogleSignIn}
          className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Sign in with Google
        </button>
        <button
          onClick={handleLogin}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-md shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-50"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default LandingPage;