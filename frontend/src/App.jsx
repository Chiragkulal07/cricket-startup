import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CricketGame from './components/gameplay/CricketGame';
import Dashboard from './pages/Dashboard';
import AIBattle from './pages/AIBattle';
import Friends from './pages/Friends';
import Auction from './pages/Auction';
import League from './pages/League';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/game" element={<CricketGame />} />
        <Route path="/ai-battle" element={<AIBattle />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/auction" element={<Auction />} />
        <Route path="/league" element={<League />} />
      </Routes>
    </div>
  );
}

export default App;
