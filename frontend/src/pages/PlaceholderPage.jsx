import React from 'react';
import { useNavigate } from 'react-router-dom';

const PlaceholderPage = ({ title }) => {
  const navigate = useNavigate();

  const containerStyle = {
    background: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('/theme.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif"
  };

  const contentStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '24px',
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  };

  const buttonStyle = {
    marginTop: '20px',
    padding: '12px 30px',
    borderRadius: '30px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>{title}</h1>
        <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>Coming Soon 🚧</p>
        <button 
          style={buttonStyle}
          onClick={() => navigate('/')}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PlaceholderPage;
