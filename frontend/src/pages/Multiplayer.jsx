import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const Multiplayer = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [isCreateHovered, setIsCreateHovered] = useState(false);
  const [isJoinHovered, setIsJoinHovered] = useState(false);
  
  const socketRef = useRef(null);
  const playerNameRef = useRef(playerName);

  // Sync ref with state
  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('connect', () => {
      console.log('Successfully connected to socket server:', socketRef.current.id);
    });

    socketRef.current.on('roomJoined', (data) => {
      console.log('Received roomJoined event:', data);
      setStatus(`Joined room successfully: ${data.roomId}`);
      
      // Navigate to the room page after a short delay
      setTimeout(() => {
        // Use the ref to get the current name, avoiding stale closure from state
        navigate(`/room/${data.roomId}`, { 
          state: { playerName: playerNameRef.current, roomId: data.roomId } 
        });
      }, 1000);
    });


    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim() || !roomId.trim()) return;
    
    console.log('Emitting createRoom:', { roomId, playerName });
    socketRef.current.emit('createRoom', { roomId, playerName });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) return;

    console.log('Emitting joinRoom:', { roomId, playerName });
    socketRef.current.emit('joinRoom', { roomId, playerName });
  };

  const isButtonDisabled = !playerName.trim() || !roomId.trim();

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

  const titleStyle = {
    fontSize: '3.5rem',
    fontWeight: '800',
    textShadow: '0 10px 30px rgba(0,0,0,0.5)',
    letterSpacing: '-1px',
    margin: '0 0 40px 0',
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  };

  const inputStyle = {
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '15px',
    marginTop: '10px',
  };

  const buttonStyle = (isHovered) => ({
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: isButtonDisabled 
      ? 'rgba(255, 255, 255, 0.05)' 
      : (isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'),
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    transform: (!isButtonDisabled && isHovered) ? 'scale(1.05)' : 'scale(1)',
    opacity: isButtonDisabled ? 0.5 : 1,
    filter: (isHovered && !isButtonDisabled) ? 'brightness(1.2)' : 'brightness(1)',
  });

  const statusTextStyle = {
    fontSize: '0.85rem',
    color: 'rgba(200, 200, 200, 0.8)', // Light gray
    marginTop: '10px',
    height: '20px',
    textAlign: 'center',
    width: '100%',
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Play with Friends</h1>
      
      <div style={cardStyle}>
        <input 
          style={inputStyle} 
          type="text" 
          placeholder="Enter Player Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
        />
        <input 
          style={inputStyle} 
          type="text" 
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
        />
        
        <div style={buttonContainerStyle}>
          <button 
            style={buttonStyle(isCreateHovered)}
            onMouseEnter={() => setIsCreateHovered(true)}
            onMouseLeave={() => setIsCreateHovered(false)}
            disabled={isButtonDisabled}
            onClick={handleCreateRoom}
          >
            Create Room
          </button>
          <button 
            style={buttonStyle(isJoinHovered)}
            onMouseEnter={() => setIsJoinHovered(true)}
            onMouseLeave={() => setIsJoinHovered(false)}
            disabled={isButtonDisabled}
            onClick={handleJoinRoom}
          >
            Join Room
          </button>
        </div>
        
        <div style={statusTextStyle}>{status}</div>
      </div>
    </div>
  );
};

export default Multiplayer;
