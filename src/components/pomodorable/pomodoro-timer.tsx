
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, RotateCcw, Coffee, Briefcase } from 'lucide-react';

const PomodoroTimer: React.FC = () => {
  const WORK_DURATION_MINUTES = 25;
  const BREAK_DURATION_MINUTES = 5;

  const [workDuration, setWorkDuration] = useState(WORK_DURATION_MINUTES * 60);
  const [breakDuration, setBreakDuration] = useState(BREAK_DURATION_MINUTES * 60);
  
  const [timeRemaining, setTimeRemaining] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);

  const { toast } = useToast();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSessionEnd = useCallback(() => {
    setIsRunning(false);
    if (isWorkSession) {
      toast({
        title: "Work session complete!",
        description: "Time for a break.",
        action: <Coffee className="h-5 w-5 text-primary" />,
      });
      setIsWorkSession(false);
      setTimeRemaining(breakDuration);
      setSessionCount(prev => prev + 1);
    } else {
      toast({
        title: "Break's over!",
        description: "Back to work.",
        action: <Briefcase className="h-5 w-5 text-primary" />,
      });
      setIsWorkSession(true);
      setTimeRemaining(workDuration);
    }
  }, [isWorkSession, workDuration, breakDuration, toast]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining(prevTime => prevTime - 1);
      }, 1000);
    } else if (isRunning && timeRemaining === 0) {
      handleSessionEnd();
    }

    return () => clearInterval(intervalId);
  }, [isRunning, timeRemaining, handleSessionEnd]);
  
  useEffect(() => {
    setTimeRemaining(isWorkSession ? workDuration : breakDuration);
  }, [workDuration, breakDuration, isWorkSession]);


  const toggleTimer = () => {
    setIsRunning(prev => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsWorkSession(true);
    setTimeRemaining(workDuration);
    setSessionCount(0);
    toast({ title: "Timer Reset", description: "Ready for a new work session." });
  };

  const progressPercentage = isWorkSession
    ? ((workDuration - timeRemaining) / workDuration) * 100
    : ((breakDuration - timeRemaining) / breakDuration) * 100;

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isWorkSession ? 'Work Session' : 'Break Time'}</span>
          {isWorkSession ? <Briefcase className="h-6 w-6 text-primary" /> : <Coffee className="h-6 w-6 text-primary" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-6xl font-mono font-bold mb-4" role="timer" aria-live="assertive">
          {formatTime(timeRemaining)}
        </div>
        <Progress value={progressPercentage} className="mb-4 h-3" />
        <p className="text-sm text-muted-foreground">
          Completed sessions: {Math.floor(sessionCount / (isWorkSession ? 1: 2) )}
        </p>
      </CardContent>
      <CardFooter className="flex justify-center space-x-3">
        <Button onClick={toggleTimer} variant={isRunning ? "destructive" : "default"} size="lg">
          {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button onClick={resetTimer} variant="outline" size="lg">
          <RotateCcw className="mr-2 h-5 w-5" />
          Reset
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PomodoroTimer;
