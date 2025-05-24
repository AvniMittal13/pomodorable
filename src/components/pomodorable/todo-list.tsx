
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PlusSquare, Trash2, ListChecks } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const TodoList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const storedTasks = localStorage.getItem('pomodorable-tasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('pomodorable-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (newTaskText.trim() === '') return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  };
  
  const clearCompletedTasks = () => {
    setTasks(prevTasks => prevTasks.filter(task => !task.completed));
  };

  const completedTasksCount = tasks.filter(task => task.completed).length;
  const totalTasksCount = tasks.length;

  return (
    <Card className="shadow-lg w-full flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ListChecks className="mr-2 h-6 w-6 text-primary" />
          To-Do List
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
        <div className="p-6">
          <div className="flex space-x-2 mb-4">
            <Input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task..."
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              aria-label="New task input"
            />
            <Button onClick={addTask} aria-label="Add task">
              <PlusSquare className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-grow px-6">
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No tasks yet. Add some!</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map(task => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-background/50 rounded-md shadow-sm hover:bg-accent/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      aria-labelledby={`task-label-${task.id}`}
                    />
                    <label
                      htmlFor={`task-${task.id}`}
                      id={`task-label-${task.id}`}
                      className={`text-sm cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {task.text}
                    </label>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} aria-label={`Delete task ${task.text}`}>
                    <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
      {totalTasksCount > 0 && (
        <>
          <Separator className="my-0" />
          <CardFooter className="p-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>{completedTasksCount} / {totalTasksCount} completed</span>
            {completedTasksCount > 0 && (
               <Button variant="link" onClick={clearCompletedTasks} className="text-xs p-0 h-auto">
                 Clear completed
               </Button>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default TodoList;
