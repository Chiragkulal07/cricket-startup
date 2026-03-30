import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CricketGame from './components/gameplay/CricketGame';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import Multiplayer from './pages/Multiplayer';
import Room from './pages/Room';
import Auction from './pages/Auction';
import League from './pages/League';
import PlaceholderPage from './pages/PlaceholderPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/game" element={<CricketGame />} />
        <Route path="/ai-battle" element={<CricketGame />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/multiplayer" element={<Multiplayer />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/auction" element={<Auction />} />
        <Route path="/league" element={<League />} />
      </Routes>
    </div>
  );
}

export default App;
