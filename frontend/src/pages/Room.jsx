import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const Room = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { playerName } = location.state || { playerName: 'Guest' };
  
  const [players, setPlayers] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [matchStatus, setMatchStatus] = useState("waiting"); // waiting, ready, starting, started
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('connect', () => {
      console.log('Room page connected to socket:', socketRef.current.id);
      console.log('Room page - Emitting joinRoom:', { roomId, playerName });
      // Re-join the room with the new socket connection
      socketRef.current.emit('joinRoom', { roomId, playerName });
      // Fetch initial player list
      socketRef.current.emit('getRoomPlayers', roomId);
    });

    socketRef.current.on('roomPlayersUpdate', (updatedPlayers) => {
      console.log('DEBUG - Received roomPlayersUpdate:', updatedPlayers);
      setPlayers(updatedPlayers);
      
      // Update local "isReady" state if the server says we are ready
      const me = updatedPlayers.find(p => p.name === playerName);
      if (me && me.ready) {
        setIsReady(true);
      }
    });

    socketRef.current.on('startMatch', (data) => {
      console.log('Match Starting signal received from server:', data);
      setMatchStatus("ready");
      // Short delay before starting countdown
      setTimeout(() => {
        setMatchStatus("starting");
        setCountdown(3);
      }, 1000);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Room page disconnected from socket');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, playerName]);

  // Match Start Navigation
  useEffect(() => {
    if (matchStatus === "started") {
      console.log('Match Started! Navigating to /game...');
      // Small delay for the "Match Started" UI to be visible
      const timer = setTimeout(() => {
        navigate('/game', { 
          state: { roomId, playerName } 
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [matchStatus, navigate, roomId, playerName]);

  useEffect(() => {
    if (matchStatus === "starting" && countdown !== null) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setMatchStatus("started");
        setCountdown(null);
      }
    }
  }, [countdown, matchStatus]);

  const handleReadyToggle = () => {
    if (!isReady) {
      console.log('Emitting playerReady:', { roomId, playerName });
      socketRef.current.emit('playerReady', { roomId, playerName });
      // Local update for immediate feedback
      setIsReady(true);
    }
  };

  const containerStyle = {
    background: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.9)), url('/theme.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
    position: 'fixed',
    top: 0,
    left: 0,
    overflow: 'hidden'
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '24px',
    padding: '40px', // Reduced padding for better fit
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    maxWidth: '500px',
    width: '90%'
  };

  const titleStyle = {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: 0,
    textShadow: '0 4px 10px rgba(0,0,0,0.3)'
  };

  const sectionTitleStyle = {
    fontSize: '1.4rem',
    fontWeight: '600',
    marginTop: '20px',
    marginBottom: '10px',
    opacity: 0.9,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%',
    paddingBottom: '10px'
  };

  const playerListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    maxHeight: '200px',
    overflowY: 'auto'
  };

  const playerItemStyle = {
    padding: '12px 20px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.1rem'
  };

  const statusStyle = {
    fontSize: '1rem',
    padding: '8px 20px',
    borderRadius: '30px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    opacity: 0.7
  };


  const backButtonStyle = {
    marginTop: '30px',
    padding: '10px 25px',
    borderRadius: '30px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Room ID: {roomId}</h1>
        
        <h2 style={sectionTitleStyle}>Players in Room</h2>
        
        <div style={playerListStyle}>
          {players.length > 0 ? (
            players.map((player, index) => {
              // Now handling objects: { name, ready }
              const displayName = player.name || "Unknown";
              const isMe = displayName === playerName;
              const playerReady = player.ready || false;

              return (
                <div key={index} style={playerItemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: playerReady ? '#4CAF50' : '#888'
                    }}></span>
                    {displayName} {isMe ? "(You)" : ""}
                  </div>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '600',
                    color: playerReady ? '#4CAF50' : 'rgba(255, 255, 255, 0.4)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: playerReady ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                    border: playerReady ? '1px solid rgba(76, 175, 80, 0.3)' : 'none'
                  }}>
                    {playerReady ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              );
            })
          ) : (
            <p style={{ opacity: 0.5 }}>No players connected</p>
          )}
        </div>

        <button 
          style={{
            ...backButtonStyle,
            marginTop: '10px',
            background: isReady ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            borderColor: isReady ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 255, 255, 0.3)',
            color: isReady ? '#4CAF50' : 'white',
            width: '100%',
            maxWidth: '200px',
            opacity: (matchStatus !== "waiting" || isReady) ? 0.6 : 1,
            cursor: (matchStatus !== "waiting" || isReady) ? 'not-allowed' : 'pointer'
          }}
          disabled={isReady || matchStatus !== "waiting"} 
          onClick={handleReadyToggle}
          onMouseEnter={(e) => {
            if (!isReady && matchStatus === "waiting") {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isReady && matchStatus === "waiting") {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          {isReady ? 'Ready ✔' : 'Ready'}
        </button>

        <div style={statusStyle}>
          <span style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: (matchStatus === "started" || matchStatus === "starting") ? '#4CAF50' : '#FFC107',
            display: 'inline-block',
            boxShadow: `0 0 10px ${(matchStatus === "started" || matchStatus === "starting") ? '#4CAF50' : '#FFC107'}`
          }}></span>
          {matchStatus === "waiting" && "Waiting for players..."}
          {matchStatus === "ready" && "All players ready!"}
          {matchStatus === "starting" && "Match Starting..."}
          {matchStatus === "started" && "Match Started!"}
        </div>

        <button 
          style={{
            ...backButtonStyle,
            opacity: matchStatus !== "waiting" ? 0.5 : 1,
            cursor: matchStatus !== "waiting" ? 'not-allowed' : 'pointer'
          }}
          onClick={() => matchStatus === "waiting" && navigate('/multiplayer')}
          disabled={matchStatus !== "waiting"}
          onMouseEnter={(e) => {
            if (matchStatus === "waiting") e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            if (matchStatus === "waiting") e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          Leave Room
        </button>
      </div>

      {/* Countdown Overlay */}
      {matchStatus === "starting" && countdown !== null && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          <h1 style={{
            fontSize: '12rem',
            fontWeight: '900',
            color: 'white',
            textShadow: '0 0 50px rgba(0,0,0,0.8)',
            animation: 'pulse 1s infinite'
          }}>
            {countdown > 0 ? countdown : "GO!"}
          </h1>
        </div>
      )}

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};


export default Room;
