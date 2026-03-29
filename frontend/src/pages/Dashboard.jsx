import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRobot, FaUsers, FaGavel, FaTrophy, FaPlay, FaUserCircle } from 'react-icons/fa';

const Navbar = () => {
  const navbarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '70px',
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 40px',
    zIndex: 1000,
    color: 'white',
  };

  const logoStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '1px',
    background: 'linear-gradient(45deg, #fff, #aaa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const profileStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '30px',
    background: 'rgba(255, 255, 255, 0.1)',
    transition: 'background 0.3s ease',
  };

  return (
    <nav style={navbarStyle}>
      <div style={logoStyle}>CRICKET ARENA</div>
      <div style={profileStyle} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}>
        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Guest User</span>
        <FaUserCircle style={{ fontSize: '1.8rem' }} />
      </div>
    </nav>
  );
};

const Card = ({ title, icon: Icon, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle = {
    background: isHovered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '20px',
    padding: '40px 20px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered ? 'translateY(-10px) scale(1.05)' : 'translateY(0) scale(1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    minWidth: '220px',
    boxShadow: isHovered ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1)' : '0 4px 24px rgba(0, 0, 0, 0.2)',
  };

  const iconStyle = {
    fontSize: '3rem',
    color: isHovered ? '#fff' : 'rgba(255, 255, 255, 0.8)',
    transition: 'all 0.3s ease',
  };

  const titleStyle = {
    fontSize: '1.4rem',
    fontWeight: '600',
    margin: 0,
    color: '#fff',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  };

  return (
    <div 
      style={cardStyle} 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Icon style={iconStyle} />
      <h3 style={titleStyle}>{title}</h3>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();

  const containerStyle = {
    background: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('/theme.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    textAlign: 'center',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
  };

  const dashboardContentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '60px',
    padding: '40px',
    paddingTop: '100px', // Adjusted for fixed navbar
    maxWidth: '1200px',
    width: '100%',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '30px',
    width: '100%',
    maxWidth: '900px',
  };

  const menuItems = [
    { title: 'Play vs AI', icon: FaRobot, action: () => navigate('/ai-battle') },
    { title: 'Play with Friends', icon: FaUsers, action: () => navigate('/friends') },
    { title: 'Auction Mode', icon: FaGavel, action: () => navigate('/auction') },
    { title: 'Create League', icon: FaTrophy, action: () => navigate('/league') },
    { title: 'Quick Game', icon: FaPlay, action: () => navigate('/game') },
  ];

  return (
    <div style={containerStyle}>
      <Navbar />
      <div style={dashboardContentStyle}>
        <h1 style={{ 
          fontSize: '4.5rem', 
          marginBottom: '0', 
          fontWeight: '800', 
          textShadow: '0 10px 30px rgba(0,0,0,0.5)',
          letterSpacing: '-1px'
        }}>
          Cricket Arena
        </h1>
        <div style={gridStyle}>
          {menuItems.map((item, index) => (
            <Card 
              key={index} 
              title={item.title} 
              icon={item.icon}
              onClick={item.action}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
