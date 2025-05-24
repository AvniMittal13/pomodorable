
import PomodoroTimer from '@/components/pomodorable/pomodoro-timer';
import TodoList from '@/components/pomodorable/todo-list';
import MoodTracker from '@/components/pomodorable/mood-tracker';
import PlantTracker from '@/components/pomodorable/plant-tracker';
import MusicPlayer from '@/components/pomodorable/music-player';
import StickyNote from '@/components/pomodorable/sticky-note';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 selection:bg-primary/20">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary">
          Pomodorable
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Your cute and customizable productivity partner!
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="md:col-span-2 xl:col-span-1">
           <PomodoroTimer />
        </div>
        <div className="md:row-span-2 xl:row-span-1">
          <TodoList />
        </div>
        <div>
          <MoodTracker />
        </div>
        <div>
          <PlantTracker />
        </div>
        <div>
          <MusicPlayer />
        </div>
         <div className="md:col-span-2 xl:col-span-1 xl:row-start-2">
          <StickyNote />
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground py-6 border-t">
        <p>&copy; {new Date().getFullYear()} Pomodorable. Stay focused and flourish!</p>
      </footer>
    </main>
  );
}
