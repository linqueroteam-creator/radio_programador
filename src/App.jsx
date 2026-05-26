import React from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';

export default function App() {
  const store = useStore();

  if (!store.isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-anotata-bg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-anotata-accent mb-2">ANOTATA</h1>
          <p className="text-anotata-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-anotata-bg">
      <Sidebar store={store} />
      <NoteList store={store} />
      <Editor store={store} />
    </div>
  );
}
