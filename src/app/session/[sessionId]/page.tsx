
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

import PomodoroTimer from '@/components/pomodorable/pomodoro-timer';
import TodoList from '@/components/pomodorable/todo-list';
import MoodTracker from '@/components/pomodorable/mood-tracker';
import PlantTracker from '@/components/pomodorable/plant-tracker';
import MusicPlayer from '@/components/pomodorable/music-player';
import StickyNote from '@/components/pomodorable/sticky-note';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Edit2, CheckSquare, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface PomodoroSessionData {
  id: string;
  sessionName: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  date: string; // YYYY-MM-DD string
  status: 'active' | 'completed' | 'pending';
  durationMinutes: number;
  userId: string;
  todos?: any[]; 
  mood?: string | null;
  dailyGoals?: string;
}


export default function ActiveSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<PomodoroSessionData | null>(null);
  const [sessionNameInput, setSessionNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSessionCompleting, setIsSessionCompleting] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        toast({ title: "Authentication Required", description: "Please sign in.", variant: "destructive" });
        router.push('/landing');
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  useEffect(() => {
    if (!user || !sessionId) {
      if (!sessionId && !user && !auth.currentUser) setLoading(false);
      return;
    }
    if (!db) {
      console.error("Firestore 'db' instance is not available in ActiveSessionPage.");
      toast({ title: "Database Error", description: "Cannot connect to Firestore.", variant: "destructive" });
      setLoading(false);
      router.push('/');
      return;
    }
    
    setLoading(true);
    const sessionDocRef = doc(db, 'pomodoroSessions', sessionId);
    
    console.log(`Setting up snapshot listener for session: ${sessionId}`);
    const unsubscribeSession = onSnapshot(sessionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as PomodoroSessionData;
        console.log("Session data received from snapshot:", data);
        if (data.userId !== user.uid) {
          toast({ title: "Access Denied", description: "You do not have permission to view this session.", variant: "destructive" });
          router.push('/');
          return;
        }
        setSessionData(data);
        if (!isEditingName) {
            setSessionNameInput(data.sessionName);
        }
      } else {
        toast({ title: "Session Not Found", description: "The requested session does not exist or was deleted.", variant: "destructive" });
        router.push('/');
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching session ${sessionId} via snapshot:`, error);
      toast({ title: "Error Loading Session", description: `Could not load session data: ${error.message}`, variant: "destructive" });
      router.push('/');
      setLoading(false);
    });

    return () => {
      console.log(`Cleaning up snapshot listener for session: ${sessionId}`);
      unsubscribeSession();
    };
  }, [user, sessionId, router, toast, isEditingName]);

  const handleSaveName = async () => {
    if (!sessionData || !sessionNameInput.trim() || sessionNameInput.trim() === sessionData.sessionName) {
      setIsEditingName(false);
      if (sessionData) setSessionNameInput(sessionData.sessionName);
      return;
    }
    if (!db) {
      console.error("Firestore 'db' instance is not available in handleSaveName.");
      toast({ title: "Database Error", description: "Cannot save name. No DB connection.", variant: "destructive" });
      return;
    }

    const sessionDocRef = doc(db, 'pomodoroSessions', sessionId);
    try {
      console.log(`Attempting to update session name for ${sessionId} to: ${sessionNameInput.trim()}`);
      await updateDoc(sessionDocRef, { sessionName: sessionNameInput.trim() });
      toast({ title: "Session Renamed", description: `Session name updated successfully.` });
      setIsEditingName(false);
      // setSessionData will be updated by the onSnapshot listener
    } catch (error: any) {
      console.error(`Error updating session name for ${sessionId}:`, error);
      toast({ title: "Error Renaming Session", description: `Failed to update session name: ${error.message}`, variant: "destructive" });
      if (sessionData) setSessionNameInput(sessionData.sessionName); // Revert on error
    }
  };
  
  const handleSessionComplete = useCallback(async () => {
    if (!sessionId || !sessionData || sessionData.status === 'completed' || isSessionCompleting) return;
    if (!db) {
      console.error("Firestore 'db' instance is not available in handleSessionComplete.");
      toast({ title: "Database Error", description: "Cannot complete session. No DB connection.", variant: "destructive" });
      return;
    }

    setIsSessionCompleting(true);
    const sessionDocRef = doc(db, 'pomodoroSessions', sessionId);
    
    try {
      console.log(`Attempting to complete session ${sessionId}`);
      await updateDoc(sessionDocRef, {
        status: 'completed',
        endTime: serverTimestamp(),
      });
      // sessionData will be updated by the onSnapshot listener
      toast({ 
        title: "Session Saved!", 
        description: "Your Pomodoro session and all its data have been successfully saved.",
        action: <CheckSquare className="h-5 w-5 text-green-500" />
      });
      console.log(`Session ${sessionId} marked as completed.`);
    } catch (error: any) {
      console.error(`Error completing session ${sessionId}:`, error);
      toast({ title: "Error Completing Session", description: `Failed to save session completion: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSessionCompleting(false);
    }
  }, [sessionId, sessionData, toast, isSessionCompleting]);


  if (loading || !user) { // Keep loading if user is not yet set or sessionData is not yet loaded
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <span className="ml-4 text-lg text-primary">Loading Session...</span>
        </div>
    );
  }

  if (!sessionData) {
    // This state should ideally be brief or covered by redirects.
    // It means user is set, not loading, but sessionData is null (e.g. after a not found redirect is pending)
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <p>Session data not available. You might be redirected shortly.</p>
        </div>
    );
  }
  
  const isSessionActive = sessionData.status === 'active';
  const isSessionCompleted = sessionData.status === 'completed';

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8 selection:bg-primary/20">
      <header className="container mx-auto max-w-6xl mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input 
                value={sessionNameInput} 
                onChange={(e) => setSessionNameInput(e.target.value)}
                className="text-3xl font-bold h-auto p-1"
                onBlur={handleSaveName}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
                disabled={!db}
              />
              <Button onClick={handleSaveName} size="icon" variant="ghost" disabled={!db}><Save className="h-5 w-5 text-primary"/></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-4xl font-extrabold tracking-tight text-primary break-all">
                {sessionData.sessionName}
              </h1>
              {!isSessionCompleted && (
                <Button onClick={() => setIsEditingName(true)} size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" disabled={!db}>
                  <Edit2 className="h-5 w-5"/>
                </Button>
              )}
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-1 sm:mt-0 text-right">
            <p>Status: <span className={`font-semibold ${isSessionCompleted ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>{sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1)}</span></p>
            <p>Date: {new Date(sessionData.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Target Duration: {sessionData.durationMinutes} minutes</p>
          </div>
        </div>
      </header>
      
      {isSessionCompleted && (
        <Alert variant="default" className="container mx-auto max-w-6xl mb-6 bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <AlertTitle className="font-semibold text-green-800 dark:text-green-200">Session Completed</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            This Pomodoro session has been completed. You can review your tracked data below.
          </AlertDescription>
        </Alert>
      )}


      <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="md:col-span-2 xl:col-span-1">
          <PomodoroTimer 
            key={`${sessionId}-${sessionData.status}`}
            initialDurationSeconds={sessionData.durationMinutes * 60}
            onTimerComplete={handleSessionComplete}
            isSessionActive={isSessionActive}
            sessionStatus={sessionData.status}
          />
        </div>
        <div className="md:row-span-2 xl:row-span-1">
           <TodoList 
            db={db!} // Pass db instance; ensure it's non-null or handle gracefully
            sessionId={sessionId}
            isReadOnly={isSessionCompleted}
          />
        </div>
        <div>
          <MoodTracker 
            db={db!} 
            userId={user.uid} 
            sessionId={sessionId}
            isReadOnly={isSessionCompleted}
          />
        </div>
        <div>
          <PlantTracker /> {/* Old PlantTracker, needs refactor */}
        </div>
        <div>
          <MusicPlayer />
        </div>
         <div className="md:col-span-2 xl:col-span-1 xl:row-start-2">
           <StickyNote 
            db={db!}
            sessionId={sessionId}
            isReadOnly={isSessionCompleted}
          />
        </div>
      </div>

      <footer className="container mx-auto max-w-6xl mt-12 text-center text-sm text-muted-foreground py-6 border-t border-border/50">
        <p>&copy; {new Date().getFullYear()} Pomodorable. Focus and flourish within your session!</p>
      </footer>
    </main>
  );
}

