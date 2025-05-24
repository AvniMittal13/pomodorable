
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Clock, SparklesIcon, NotebookText, TrendingUp, PlayCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        router.push('/'); // Redirect to dashboard if user is signed in
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the redirect
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      // Handle errors (e.g., display a message to the user)
    }
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-primary animate-pulse">Loading Pomodorable...</div>
      </div>
    );
  }

  if (user) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
            <div className="text-primary">Redirecting to your dashboard...</div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-primary/20">
      <main className="container mx-auto max-w-4xl flex flex-col items-center">
        <Card className="w-full max-w-2xl shadow-2xl rounded-xl overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5 p-8 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-primary">
              Pomodorable
            </h1>
            <CardDescription className="mt-3 text-xl text-muted-foreground">
              Your cute and customizable productivity partner!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="text-center">
              <p className="text-lg text-foreground leading-relaxed">
                Enhance your productivity and well-being with Pomodorable. Manage tasks, track your mood, and cultivate focus, all in one adorable package.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FeatureItem icon={<Clock className="w-6 h-6 text-primary" />} title="Pomodoro Timer" description="Customizable focus and break intervals." />
              <FeatureItem icon={<ListChecks className="w-6 h-6 text-primary" />} title="Todo List" description="Organize your tasks for each session." />
              <FeatureItem icon={<SparklesIcon className="w-6 h-6 text-primary" />} title="Mood Tracker" description="Log your mood during sessions." />
              <FeatureItem icon={<NotebookText className="w-6 h-6 text-primary" />} title="Daily Goals" description="Set and track daily objectives." />
              <FeatureItem icon={<TrendingUp className="w-6 h-6 text-primary" />} title="Session History" description="Review past sessions and track progress." />
              <FeatureItem icon={<PlayCircle className="w-6 h-6 text-primary" />} title="Music Player" description="Focus with curated Lo-fi beats." />
            </div>
          </CardContent>
          <CardFooter className="p-8 bg-secondary/20 flex flex-col items-center gap-4">
            <Button
              onClick={handleGoogleSignIn}
              size="lg"
              className="w-full max-w-xs text-lg shadow-md hover:shadow-lg transition-shadow duration-300"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign in with Google'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Start your focused journey today!
            </p>
          </CardFooter>
        </Card>
      </main>
      <footer className="py-8 mt-12 text-center">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Pomodorable. Stay focused and flourish!</p>
      </footer>
    </div>
  );
};

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <div className="flex items-start space-x-3 p-4 bg-card/50 rounded-lg border border-border/50 shadow-sm">
    <div className="flex-shrink-0 mt-1">{icon}</div>
    <div>
      <h3 className="font-semibold text-md text-card-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default LandingPage;
    