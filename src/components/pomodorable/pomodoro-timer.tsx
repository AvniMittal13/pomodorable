
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, RotateCcw, Coffee, Briefcase } from 'lucide-react';

interface PomodoroTimerProps {
  initialDurationSeconds: number;
  onTimerComplete: () => void;
  isSessionActive: boolean; // To control if timer should run
  sessionStatus: 'active' | 'completed' | 'pending';
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ 
  initialDurationSeconds, 
  onTimerComplete,
  isSessionActive,
  sessionStatus
}) => {
  const BREAK_DURATION_MINUTES = 5; // Default break, can be made configurable

  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true); // True for main Pomodoro, false for break
  const [cycles, setCycles] = useState(0); // Tracks completed work cycles

  const { toast } = useToast();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Effect for timer logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning && timeRemaining > 0 && sessionStatus === 'active') {
      intervalId = setInterval(() => {
        setTimeRemaining(prevTime => prevTime - 1);
      }, 1000);
    } else if (isRunning && timeRemaining === 0 && sessionStatus === 'active') {
      setIsRunning(false); // Stop timer
      if (isWorkSession) {
        onTimerComplete(); // Signal main session completion
        toast({
          title: "Pomodoro Complete!",
          description: "Great focus! Time for a short break.",
          action: <Coffee className="h-5 w-5 text-primary" />,
        });
        // Transition to break
        setIsWorkSession(false);
        setTimeRemaining(BREAK_DURATION_MINUTES * 60);
        setCycles(prev => prev + 1);
      } else {
        // Break finished
        toast({
          title: "Break's Over!",
          description: "Ready for another Pomodoro?",
          action: <Briefcase className="h-5 w-5 text-primary" />,
        });
        // For this iteration, completing one work session completes the "Pomodoro Session"
        // So we don't automatically restart work. The parent page handles this.
        // To implement multiple cycles, you'd reset to work duration here:
        // setIsWorkSession(true);
        // setTimeRemaining(initialDurationSeconds);
      }
    }

    return () => clearInterval(intervalId);
  }, [isRunning, timeRemaining, isWorkSession, onTimerComplete, initialDurationSeconds, toast, sessionStatus]);
  
  // Effect to initialize or reset timer based on props
  useEffect(() => {
    // if session is active, and it's a work session, use initialDuration
    // if session is active and it's a break session, use break duration
    // if session is completed, display its original duration but don't run
    if (sessionStatus === 'completed') {
      setTimeRemaining(0); // Or show initialDurationSeconds if you prefer to show the target
      setIsRunning(false);
      setIsWorkSession(true); // Reset to work session view for completed
    } else if (isSessionActive) { // 'active' or 'pending' treated as active for timer setup
       if(isWorkSession){
         setTimeRemaining(initialDurationSeconds);
       } else {
         setTimeRemaining(BREAK_DURATION_MINUTES * 60);
       }
       // Only auto-start if it's a work session and isSessionActive is true
       // setIsRunning(isWorkSession && isSessionActive); // Potentially auto-start if new session
    } else {
      setTimeRemaining(initialDurationSeconds);
      setIsRunning(false);
    }

  }, [initialDurationSeconds, isSessionActive, sessionStatus, isWorkSession]);


  const toggleTimer = () => {
    if (sessionStatus === 'completed') {
      toast({ title: "Session Ended", description: "This Pomodoro session is already complete."});
      return;
    }
    if (!isSessionActive && !isRunning) { // trying to start a non-active session timer
        toast({ title: "Cannot Start Timer", description: "This session is not active.", variant: "destructive"});
        return;
    }
    setIsRunning(prev => !prev);
  };

  const resetTimerToCurrentStage = () => { // Renamed from resetTimer
    if (sessionStatus === 'completed') {
       toast({ title: "Session Ended", description: "This Pomodoro session is already complete."});
      return;
    }
    setIsRunning(false);
    if (isWorkSession) {
      setTimeRemaining(initialDurationSeconds);
    } else {
      setTimeRemaining(BREAK_DURATION_MINUTES * 60);
    }
    toast({ title: "Timer Stage Reset", description: `Timer reset to current ${isWorkSession ? 'work' : 'break'} stage.` });
  };

  const currentDuration = isWorkSession ? initialDurationSeconds : BREAK_DURATION_MINUTES * 60;
  const progressPercentage = currentDuration > 0 
    ? ((currentDuration - timeRemaining) / currentDuration) * 100 
    : 0;

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isWorkSession ? 'Focus Session' : 'Break Time'}</span>
          {isWorkSession ? <Briefcase className="h-6 w-6 text-primary" /> : <Coffee className="h-6 w-6 text-primary" />}
        </CardTitle>
         {sessionStatus === 'completed' && (
           <p className="text-sm text-green-600 font-medium">Session Completed!</p>
         )}
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-6xl font-mono font-bold mb-4" role="timer" aria-live="assertive">
          {formatTime(timeRemaining)}
        </div>
        <Progress value={sessionStatus === 'completed' ? 100 : progressPercentage} className="mb-4 h-3" />
        <p className="text-sm text-muted-foreground">
          Pomodoros this session: {cycles}
        </p>
      </CardContent>
      <CardFooter className="flex justify-center space-x-3">
        <Button 
            onClick={toggleTimer} 
            variant={isRunning ? "destructive" : "default"} 
            size="lg"
            disabled={sessionStatus === 'completed' || (!isSessionActive && !isRunning)}
        >
          {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button 
            onClick={resetTimerToCurrentStage} 
            variant="outline" 
            size="lg"
            disabled={sessionStatus === 'completed'}
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Reset Stage
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PomodoroTimer;

    