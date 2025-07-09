import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Navigation links
  const navLinks = [
    { to: '/dashboard', label: '🏠 Dashboard' },
    { to: '/expenses', label: '💸 Expenses' },
    { to: '/add-expense', label: '➕ Add Expense' }
  ];

  // Scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  const isGoogleUser = currentUser.providerData[0]?.providerId === 'google.com';
  const displayName = currentUser.displayName || currentUser.email.split('@')[0];

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-content">
        <div className="navbar-logo">
          <img src="/logo.svg" alt="EXPENSO" className="logo-icon" />
          <span>EXPENSO</span>
        </div>
        <div className="navbar-links">
          {navLinks.map((link) => (
            <NavLink 
              key={link.to}
              to={link.to} 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="user-info">
          <span className="user-email">
            {isGoogleUser && (
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="google-icon" 
              />
            )}
            <span>
              {displayName}
              <small style={{ display: 'block', fontSize: '0.8em', opacity: 0.7 }}>
                {currentUser.email}
              </small>
            </span>
          </span>
          <button 
            onClick={handleLogout} 
            className="logout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
