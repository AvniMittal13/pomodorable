
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, LogOut, History, Activity, CalendarDays } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";


interface PomodoroSession {
  id: string;
  sessionName: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  date: string;
  status: 'active' | 'completed' | 'pending';
  durationMinutes: number;
  userId: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/landing');
      }
      // Keep loading true until user is set and initial sessions are fetched or determined to be none
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      setLoading(true); // Start loading when user is available
      const sessionsCol = collection(db, 'pomodoroSessions');
      const q = query(
        sessionsCol,
        where('userId', '==', user.uid),
        orderBy('startTime', 'desc')
      );

      console.log(`Fetching sessions for user: ${user.uid}`);
      const unsubscribeSessions = onSnapshot(q, (snapshot) => {
        const fetchedSessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as PomodoroSession));
        setSessions(fetchedSessions);
        console.log(`Fetched ${fetchedSessions.length} sessions.`);
        setLoading(false); // Stop loading once sessions are fetched
      }, (error) => {
        console.error("Error fetching sessions:", error);
        toast({
          title: "Error Fetching Sessions",
          description: `Could not load your session history: ${error.message}`,
          variant: "destructive",
        });
        setLoading(false); // Stop loading on error
      });

      return () => unsubscribeSessions();
    } else {
      // If there's no user, we are not loading sessions, so set loading to false.
      // Auth listener will redirect if user becomes null.
      if (!auth.currentUser) { // Check if auth is truly null and not just in transition
        setLoading(false);
      }
    }
  }, [user, toast]);

  const handleStartNewSession = async () => {
    if (!user) {
      toast({ title: "User not authenticated", description: "Please sign in to start a session.", variant: "destructive" });
      return;
    }
    if (!db) {
      toast({ title: "Database not available", description: "Cannot connect to Firestore. Please check console.", variant: "destructive" });
      console.error("Firestore 'db' instance is not available in handleStartNewSession.");
      return;
    }

    setIsCreatingSession(true);
    const sessionPayload = {
      userId: user.uid,
      sessionName: `Pomodoro Session - ${new Date().toLocaleTimeString()}`,
      startTime: serverTimestamp(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      status: 'active' as 'active' | 'completed' | 'pending',
      durationMinutes: 25, // Default duration
      todos: [],
      mood: null,
      dailyGoals: '',
    };

    try {
      console.log("Attempting to create new session with payload:", sessionPayload);
      const newSessionRef = await addDoc(collection(db, 'pomodoroSessions'), sessionPayload);
      console.log("New session created successfully with ID:", newSessionRef.id);
      toast({
        title: "Session Started!",
        description: "Your new Pomodoro session is ready.",
      });
      router.push(`/session/${newSessionRef.id}`);
    } catch (error: any) {
      console.error("Error starting new session in Firestore:", error);
      toast({
        title: "Failed to Start Session",
        description: `Could not create your session in the database: ${error.message}`,
        variant: "destructive",
      });
      setIsCreatingSession(false);
    }
    // setIsCreatingSession(false) will be handled by redirect or error case.
    // If successful, page navigation occurs, so no need to set it back here.
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/landing');
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
    } catch (error: any) {
      console.error('Error signing out: ', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
    }
  };
  
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    // Check if toDate method exists, indicating it's a Firestore Timestamp
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }
    // If it's already a Date object (e.g., from serverTimestamp() optimistic update before sync)
    if (timestamp instanceof Date) {
         return timestamp.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
    return 'Invalid Date';
  };

  if (loading) { // Show loading indicator if auth is still resolving or sessions are fetching
     return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-primary animate-pulse text-lg">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8 selection:bg-primary/20">
      <header className="container mx-auto max-w-5xl mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">
            Pomodoro Dashboard
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Welcome back, {user?.displayName || 'User'}! Review your sessions or start a new one.
          </p>
        </div>
        <Button onClick={handleSignOut} variant="outline" size="sm">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </header>

      <div className="container mx-auto max-w-5xl space-y-8">
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <PlusCircle className="mr-3 h-7 w-7 text-primary" />
              Start a New Session
            </CardTitle>
            <CardDescription>
              Begin a new focused work interval. Your todos, mood, and goals will be tracked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Click the button below to kickstart your productivity. A default 25-minute session will be created.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleStartNewSession} 
              disabled={isCreatingSession || !db} // Disable if db is not available
              size="lg"
              className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow"
            >
              {isCreatingSession ? 'Starting...' : 'Start New Pomodoro Session'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <History className="mr-3 h-7 w-7 text-primary" />
              Session History
            </CardTitle>
            <CardDescription>
              Review your past Pomodoro sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 && ( // No loading check here as it's handled above
               <Alert variant="default" className="bg-secondary/30">
                <Activity className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold">No Sessions Yet!</AlertTitle>
                <AlertDescription>
                  You haven't completed any Pomodoro sessions. Click "Start New Pomodoro Session" above to begin your productivity journey!
                </AlertDescription>
              </Alert>
            )}
            {sessions.length > 0 && (
              <ScrollArea className="h-[400px] pr-4">
                <ul className="space-y-4">
                  {sessions.map(session => (
                    <li key={session.id}>
                      <Card 
                        className="hover:shadow-md transition-shadow cursor-pointer border-border/70 hover:border-primary/50"
                        onClick={() => router.push(`/session/${session.id}`)}
                      >
                        <CardHeader className="p-4">
                           <CardTitle className="text-lg flex justify-between items-center">
                            <span>{session.sessionName}</span>
                             <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                               session.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 
                               session.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                               'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                             }`}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </span>
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground flex items-center mt-1">
                            <CalendarDays className="h-3 w-3 mr-1.5" />
                            Started: {formatDate(session.startTime)}
                            {session.endTime && <span className="ml-2"> | Ended: {formatDate(session.endTime)}</span>}
                          </CardDescription>
                        </CardHeader>
                         <CardFooter className="p-4 pt-0 text-sm text-muted-foreground">
                           Duration: {session.durationMinutes} minutes
                        </CardFooter>
                      </Card>
                       <Separator className="my-3 last:hidden" />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground py-6 border-t">
        <p>&copy; {new Date().getFullYear()} Pomodorable. Stay focused and flourish!</p>
      </footer>
    </main>
  );
}
    
