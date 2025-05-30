
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, LogOut, History, Activity, CalendarDays, CheckCircle, BarChart3 } from 'lucide-react';
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
        console.log("Auth state changed: User is set", currentUser);
      } else {
        console.log("Auth state changed: User is null, redirecting to /landing");
        router.push('/landing');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (user && user.uid) {
      setLoading(true);
      const sessionsCol = collection(db, 'pomodoroSessions');
      const q = query(
        sessionsCol,
        where('userId', '==', user.uid),
        orderBy('startTime', 'desc')
      );

      console.log(`Dashboard: Fetching sessions for user: ${user.uid}`);
      const unsubscribeSessions = onSnapshot(q, (snapshot) => {
        const fetchedSessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as PomodoroSession));
        setSessions(fetchedSessions);
        console.log(`Dashboard: Fetched ${fetchedSessions.length} sessions.`);
        setLoading(false);
      }, (error) => {
        console.error("Dashboard: Error fetching sessions:", error);
        if (error.code === 'failed-precondition' || (error.message && error.message.toLowerCase().includes("index"))) {
            const projectId = db?.app?.options?.projectId;
            let indexCreationLink = "#";
            if (projectId) {
              // This link is specific to the (userId ==, startTime desc) index.
              // A more generic link would be: `https://console.firebase.google.com/project/${projectId}/firestore/indexes`
              indexCreationLink = `https://console.firebase.google.com/v1/r/project/${projectId}/firestore/indexes?create_composite=ClJwcm9qZWN0cy9${projectId}/ZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3BvbW9kb3JvU2Vzc2lvbnMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAENGg0KCXN0YXJ0VGltZRACGgwKCF9fbmFtZV9fEAI`;
            }
            toast({
                title: "Query Requires an Index",
                description: (
                    <span>
                        Firestore needs an index for this query. Please create it using this link:
                        {projectId ? (
                          <a
                              href={indexCreationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-500 hover:text-blue-700 ml-1"
                          >
                              Create Index
                          </a>
                        ) : (
                          " Please check the Firebase console to create the required index."
                        )}
                        <br />
                        The error was: {error.message}
                    </span>
                ),
                variant: "destructive",
                duration: 9000000, 
            });
        } else {
            toast({
              title: "Error Fetching Sessions",
              description: `Could not load your session history: ${error.message}`,
              variant: "destructive",
            });
        }
        setLoading(false);
      });

      return () => unsubscribeSessions();
    } else {
      if (!auth.currentUser) { // Ensure loading is false if user is confirmed null and not just initially
        setLoading(false);
      }
    }
  }, [user, toast]);

  const handleStartNewSession = async () => {
    if (!user) {
      toast({ title: "User not authenticated", description: "Please sign in to start a session.", variant: "destructive" });
      console.error("handleStartNewSession: User not authenticated.");
      return;
    }
    if (!user.uid) {
        toast({ title: "User ID missing", description: "Cannot start session without a user ID. Please re-authenticate.", variant: "destructive" });
        console.error("handleStartNewSession: User authenticated, but UID is missing.", user);
        return;
    }
    if (!db) {
      toast({ title: "Database not available", description: "Cannot connect to Firestore. Please check console.", variant: "destructive" });
      console.error("Firestore 'db' instance is not available in handleStartNewSession.");
      return;
    }

    setIsCreatingSession(true);
    console.log(`Dashboard: Preparing to create new session for user.uid: ${user.uid}. Current user object:`, user);

    const sessionPayload = {
      userId: user.uid,
      sessionName: `Pomodoro - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      startTime: serverTimestamp(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      status: 'active' as 'active' | 'completed' | 'pending',
      durationMinutes: 25, // Default duration
      todos: [],
      mood: null,
      dailyGoals: '',
    };

    try {
      console.log("Dashboard: Attempting to create new session with payload:", sessionPayload);
      const newSessionRef = await addDoc(collection(db, 'pomodoroSessions'), sessionPayload);
      console.log("Dashboard: New session created successfully with ID:", newSessionRef.id);
      toast({
        title: "Session Started!",
        description: "Your new Pomodoro session is ready.",
        action: <CheckCircle className="text-green-500" />
      });
      router.push(`/session/${newSessionRef.id}`);
    } catch (error: any) {
      console.error("Dashboard: Error starting new session in Firestore:", error);
      toast({
        title: "Failed to Start Session",
        description: `Could not create your session in the database: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      // onAuthStateChanged will handle redirect to /landing
    } catch (error: any) {
      console.error('Dashboard: Error signing out: ', error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
    }
  };
  
  const formatDate = (timestamp: Timestamp | undefined, includeTime: boolean = true) => {
    if (!timestamp) return 'N/A';
    try {
      const dateObj = timestamp.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp as any));
      if (isNaN(dateObj.getTime())) return "Invalid Date";
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'short', day: 'numeric'
      };
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      return dateObj.toLocaleDateString(undefined, options);
    } catch (e) {
        console.error("Dashboard: Error formatting date:", e, "Timestamp was:", timestamp);
        return "Invalid Date";
    }
  };

  if (loading) {
     return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-primary animate-pulse text-lg">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8 selection:bg-primary/20">
      <header className="container mx-auto max-w-5xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">
            Pomodoro Dashboard
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Welcome back, {user?.displayName || 'User'}! Review your sessions or start a new one.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/progress')} variant="outline" size="sm">
            <BarChart3 className="mr-2 h-4 w-4" /> Check Progress & History
          </Button>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
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
              disabled={isCreatingSession || !db || !user }
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
              Recent Session History
            </CardTitle>
            <CardDescription>
              Review your most recent Pomodoro sessions. Click on a session to view its details. For full history, check "Progress & History".
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 && !loading && (
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
                        <CardHeader className="p-4 pb-2">
                           <div className="flex justify-between items-start">
                            <CardTitle className="text-lg break-all">
                              {session.sessionName}
                            </CardTitle>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                                session.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 
                                session.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                              }`}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </span>
                           </div>
                           <CardDescription className="text-xs text-muted-foreground flex items-center mt-1.5">
                              <CalendarDays className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                              <span>Started: {formatDate(session.startTime, true)}</span>
                           </CardDescription>
                           {session.endTime && (
                             <CardDescription className="text-xs text-muted-foreground flex items-center mt-1">
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-green-500" />
                                <span>Completed: {formatDate(session.endTime, true)}</span>
                             </CardDescription>
                           )}
                        </CardHeader>
                         <CardFooter className="p-4 pt-2 text-sm text-muted-foreground">
                           Target Duration: {session.durationMinutes} minutes
                        </CardFooter>
                      </Card>
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
    
