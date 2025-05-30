
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, Timestamp, FirestoreError } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarDays, CheckCircle, Activity, Loader2, ExternalLink as ExternalLinkIcon } from 'lucide-react'; 
import { format, isValid } from 'date-fns';

interface PomodoroSession {
  id: string;
  sessionName: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  date: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'pending';
  durationMinutes: number;
  userId: string;
}

export default function ProgressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/landing');
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user || !selectedDate || !db) {
      if (user && selectedDate && !db) {
        console.error("ProgressPage: Firestore 'db' instance is not available.");
        toast({ title: "Database Error", description: "Cannot connect to Firestore.", variant: "destructive" });
      }
      setSessions([]); 
      setLoadingSessions(false); 
      return;
    }

    setLoadingSessions(true);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const sessionsCol = collection(db, 'pomodoroSessions');
    const q = query(
      sessionsCol,
      where('userId', '==', user.uid),
      where('date', '==', formattedDate), 
      orderBy('startTime', 'desc')
    );

    console.log(`ProgressPage: Fetching sessions for user ${user.uid} on date ${formattedDate}`);
    const unsubscribeSessions = onSnapshot(q, (snapshot) => {
      const fetchedSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as PomodoroSession));
      setSessions(fetchedSessions);
      console.log(`ProgressPage: Fetched ${fetchedSessions.length} sessions for ${formattedDate}.`);
      setLoadingSessions(false);
    }, (error: FirestoreError) => {
      console.error(`ProgressPage: Error fetching sessions for date ${formattedDate}:`, error);
      if (error.code === 'failed-precondition' || (error.message && error.message.toLowerCase().includes("index"))) {
        const projectId = db?.app?.options?.projectId;
        let indexCreationLink = "#";
        if (projectId) {
            const encodedCollectionId = encodeURIComponent('pomodoroSessions');
            const fieldPath1 = encodeURIComponent('userId');
            const order1 = encodeURIComponent('ASCENDING');
            const fieldPath2 = encodeURIComponent('date');
            const order2 = encodeURIComponent('ASCENDING');
            const fieldPath3 = encodeURIComponent('startTime');
            const order3 = encodeURIComponent('DESCENDING');
            const queryString = `create_composite=projects/${projectId}/databases/(default)/collectionGroups/${encodedCollectionId}/indexes/-&fieldPath=${fieldPath1}&order=${order1}&fieldPath=${fieldPath2}&order=${order2}&fieldPath=${fieldPath3}&order=${order3}`;
            indexCreationLink = `https://console.firebase.google.com/project/${projectId}/firestore/indexes?${queryString}`;
        }
        
        toast({
            title: "Query Requires an Index",
            description: (
                <div className="flex flex-col gap-2">
                    <span>Firestore needs an index for this query (userId ASC, date ASC, startTime DESC).</span>
                    {projectId && indexCreationLink !== "#" ? (
                      <a
                          href={indexCreationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                      >
                          <ExternalLinkIcon className="mr-2 h-4 w-4" /> Create Index in Firebase Console
                      </a>
                    ) : (
                      <span>Please check the Firebase console to create the required index. The error was: {error.message}</span>
                    )}
                </div>
            ),
            variant: "destructive",
            duration: 9000000, 
        });
      } else {
        toast({
          title: "Error Fetching Sessions",
          description: `Could not load session history for the selected date: ${error.message}`,
          variant: "destructive",
        });
      }
      setSessions([]);
      setLoadingSessions(false);
    });

    return () => unsubscribeSessions();
  }, [user, selectedDate, toast]);

  const formatDateForDisplay = (timestamp: Timestamp | undefined | null, includeTime: boolean = true) => {
    if (!timestamp) return 'N/A';
    try {
      const dateObj = timestamp.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp as any));
      if (!isValid(dateObj)) return "Invalid Date";
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'short', day: 'numeric'
      };
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      return dateObj.toLocaleDateString(undefined, options);
    } catch (e) {
        console.error("ProgressPage: Error formatting date:", e, "Timestamp was:", timestamp);
        return "Invalid Date";
    }
  };

  if (authLoading) {
    return (
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
       <Loader2 className="h-12 w-12 text-primary animate-spin" />
       <span className="ml-4 text-lg text-primary">Loading User Data...</span>
     </div>
   );
 }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8 selection:bg-primary/20">
      <header className="container mx-auto max-w-5xl mb-8">
        <Button variant="outline" size="sm" onClick={() => router.push('/')} className="mb-4 transition-all hover:shadow-md">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">
          Progress & History
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">
          Select a date to view your Pomodoro sessions and analytics.
        </p>
      </header>

      <div className="container mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <CalendarDays className="mr-2 h-6 w-6 text-primary" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg border-primary/20 min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-xl">
                Sessions for {selectedDate ? format(selectedDate, 'PPP') : 'N/A'}
              </CardTitle>
              <CardDescription>
                All Pomodoro sessions started on this day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions && (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="ml-3 text-muted-foreground">Loading sessions...</span>
                </div>
              )}
              {!loadingSessions && sessions.length === 0 && (
                <Alert variant="default" className="bg-secondary/30">
                  <Activity className="h-5 w-5 text-primary" />
                  <AlertTitle className="font-semibold">No Sessions Found</AlertTitle>
                  <AlertDescription>
                    There are no Pomodoro sessions recorded for this date. Try selecting another date.
                  </AlertDescription>
                </Alert>
              )}
              {!loadingSessions && sessions.length > 0 && (
                <ScrollArea className="h-[450px] pr-3"> 
                  <ul className="space-y-4">
                    {sessions.map(session => (
                      <li key={session.id}>
                        <Card 
                          className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-in-out cursor-pointer border-border/70 hover:border-primary/50"
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
                                <span>Started: {formatDateForDisplay(session.startTime, true)}</span>
                             </CardDescription>
                             {session.endTime && (
                               <CardDescription className="text-xs text-muted-foreground flex items-center mt-1">
                                  <CheckCircle className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-green-500" />
                                  <span>Completed: {formatDateForDisplay(session.endTime, true)}</span>
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
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground py-6 border-t">
        <p>&copy; {new Date().getFullYear()} Pomodorable. Review your focus journey!</p>
      </footer>
    </main>
  );
}

// Helper component for external link icon if not already available
const ExternalLink: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
