
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, setDoc, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

import PomodoroTimer from '@/components/pomodorable/pomodoro-timer';
import TodoList from '@/components/pomodorable/todo-list'; // Needs refactor
import MoodTracker from '@/components/pomodorable/mood-tracker';
import PlantTracker from '@/components/pomodorable/plant-tracker'; // Needs refactor / session integration
import MusicPlayer from '@/components/pomodorable/music-player';
import StickyNote from '@/components/pomodorable/sticky-note'; // Needs refactor

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Edit2, CheckSquare, Coffee, Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';


interface PomodoroSessionData {
  id: string;
  sessionName: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  date: string;
  status: 'active' | 'completed' | 'pending';
  durationMinutes: number;
  userId: string;
  // fields for other widgets will be added here:
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


  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/landing');
      }
      // setLoading handled by session fetch
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch session data
  useEffect(() => {
    if (!user || !sessionId) {
      if (!sessionId) setLoading(false); // if no sessionId, nothing to load
      return;
    }
    
    setLoading(true);
    const sessionDocRef = doc(db, 'pomodoroSessions', sessionId);
    
    const fetchSession = async () => {
      try {
        const docSnap = await getDoc(sessionDocRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as PomodoroSessionData;
          if (data.userId !== user.uid) {
            toast({ title: "Access Denied", description: "You do not have permission to view this session.", variant: "destructive" });
            router.push('/');
            return;
          }
          setSessionData(data);
          setSessionNameInput(data.sessionName);
        } else {
          toast({ title: "Session Not Found", description: "The requested session does not exist.", variant: "destructive" });
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        toast({ title: "Error", description: "Could not load session data.", variant: "destructive" });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [user, sessionId, router, toast]);

  const handleSaveName = async () => {
    if (!sessionData || !sessionNameInput.trim() || sessionNameInput.trim() === sessionData.sessionName) {
      setIsEditingName(false);
      return;
    }
    const sessionDocRef = doc(db, 'pomodoroSessions', sessionId);
    try {
      await updateDoc(sessionDocRef, { sessionName: sessionNameInput.trim() });
      setSessionData(prev => prev ? { ...prev, sessionName: sessionNameInput.trim() } : null);
      toast({ title: "Session Renamed", description: `Session name updated to "${sessionNameInput.trim()}".` });
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating session name:", error);
      toast({ title: "Error", description: "Failed to update session name.", variant: "destructive" });
    }
  };
  
  const handleSessionComplete = useCallback(async () => {
    if (!sessionId || !sessionData || sessionData.status === 'completed' || isSessionCompleting) return;

    setIsSessionCompleting(true);
    toast({ title: "Session Over!", description: "Great work! Finalizing your session data...", duration: 5000 });
    
    const sessionDocRef = doc(db, 'pomodoroSessions', sessionId);
    
    // Fetch the latest data from sub-components (mood, todos, goals) if they don't auto-save or to ensure final state
    // For MoodTracker, it saves on change. For others (once refactored), they might also.
    // This is a good place to ensure all data is captured.
    // For now, we assume MoodTracker is handling its own saves.
    // TodoList and StickyNote data would be gathered here once refactored.

    try {
      await updateDoc(sessionDocRef, {
        status: 'completed',
        endTime: serverTimestamp(),
        // todos: latestTodos, (from refactored TodoList)
        // dailyGoals: latestGoals (from refactored StickyNote)
      });
      
      setSessionData(prev => prev ? { ...prev, status: 'completed', endTime: Timestamp.now() } : null);
      
      toast({ 
        title: "Session Saved!", 
        description: "Your Pomodoro session and all its data have been successfully saved.",
        action: <CheckSquare className="h-5 w-5 text-green-500" />
      });

      // Optional: Navigate back to dashboard after a delay or offer a button
      // setTimeout(() => router.push('/'), 3000);

    } catch (error) {
      console.error("Error completing session:", error);
      toast({ title: "Error", description: "Failed to save session completion. Please try again.", variant: "destructive" });
    } finally {
      setIsSessionCompleting(false);
    }
  }, [sessionId, sessionData, toast, isSessionCompleting]);


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-primary animate-pulse text-lg">Loading Session...</div></div>;
  }

  if (!sessionData) {
    // This case should be handled by the redirect in useEffect if session not found/access denied
    return <div className="min-h-screen flex items-center justify-center bg-background"><p>Session not found or access denied.</p></div>;
  }
  
  const isSessionActive = sessionData.status === 'active';


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
              />
              <Button onClick={handleSaveName} size="icon" variant="ghost"><Save className="h-5 w-5 text-primary"/></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-4xl font-extrabold tracking-tight text-primary break-all">
                {sessionData.sessionName}
              </h1>
              {sessionData.status !== 'completed' && (
                <Button onClick={() => setIsEditingName(true)} size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="h-5 w-5"/>
                </Button>
              )}
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-1 sm:mt-0">
            <p>Status: <span className={`font-semibold ${sessionData.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>{sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1)}</span></p>
            <p>Date: {new Date(sessionData.date).toLocaleDateString()}</p>
            <p>Duration: {sessionData.durationMinutes} minutes</p>
          </div>
        </div>
      </header>
      
      {sessionData.status === 'completed' && (
        <Alert variant="default" className="container mx-auto max-w-6xl mb-6 bg-green-50 border-green-300 text-green-700">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="font-semibold text-green-800">Session Completed</AlertTitle>
          <AlertDescription className="text-green-700">
            This Pomodoro session has been completed. You can review your tracked data below.
          </AlertDescription>
        </Alert>
      )}


      <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="md:col-span-2 xl:col-span-1">
          <PomodoroTimer 
            key={sessionId} // Re-mount timer if session changes, or if status changes from active to completed
            initialDurationSeconds={sessionData.durationMinutes * 60}
            onTimerComplete={handleSessionComplete}
            isSessionActive={isSessionActive} // Pass this to control timer activity
            sessionStatus={sessionData.status}
          />
        </div>
        <div className="md:row-span-2 xl:row-span-1">
          <Card className="shadow-lg h-full"> {/* Placeholder for TodoList */}
            <CardHeader><CardTitle>Todo List (Coming Soon)</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">This feature will be integrated with session tracking shortly.</p>
            <TodoList /> {/* Old TodoList, will need refactoring */}
            </CardContent>
          </Card>
        </div>
        <div>
          <MoodTracker 
            db={db} 
            userId={user?.uid} 
            sessionId={sessionId}
            isReadOnly={sessionData.status === 'completed'}
          />
        </div>
        <div>
          <PlantTracker /> {/* Old PlantTracker, needs refactor */}
        </div>
        <div>
          <MusicPlayer />
        </div>
         <div className="md:col-span-2 xl:col-span-1 xl:row-start-2">
            <Card className="shadow-lg h-full"> {/* Placeholder for StickyNote */}
              <CardHeader><CardTitle>Daily Goals (Coming Soon)</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">This feature will be integrated with session tracking shortly.</p>
              <StickyNote /> {/* Old StickyNote, needs refactor */}
              </CardContent>
            </Card>
        </div>
      </div>

      <footer className="container mx-auto max-w-6xl mt-12 text-center text-sm text-muted-foreground py-6 border-t">
        <p>&copy; {new Date().getFullYear()} Pomodorable. Focus and flourish within your session!</p>
      </footer>
    </main>
  );
}

    