import React, { useState, useEffect } from 'react';
import { expenseApi } from '../utils/api';

const FinancialGuide = ({ expenses }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch financial insights from the backend
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await expenseApi.getFinancialInsights();
        
        if (response.data && response.data.success) {
          setInsights(response.data.data || []);
        } else {
          throw new Error(response.data?.message || 'Failed to load insights');
        }
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError(err.response?.data?.message || 'Error loading financial insights. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [expenses]); // Re-fetch when expenses change

  // Show loading state
  if (loading) {
    return (
      <div className="financial-guide-section">
        <div className="guide-header">
          <h3>Financial Guide</h3>
          <p className="guide-subtitle">Analyzing your spending patterns...</p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generating insights...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="financial-guide-section">
        <div className="guide-header">
          <h3>Financial Guide</h3>
          <p className="guide-subtitle">We couldn't load your insights</p>
        </div>
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no insights
  if (insights.length === 0) {
    return (
      <div className="financial-guide-section">
        <div className="guide-header">
          <h3>Financial Guide</h3>
          <p className="guide-subtitle">No insights available</p>
        </div>
        <p>Add some expenses to see personalized financial insights.</p>
      </div>
    );
  }

  return (
    <div className="financial-guide-section">
      <div className="guide-header">
        <h3>Financial Guide</h3>
        <p className="guide-subtitle">Personalized recommendations based on your spending patterns</p>
      </div>

      <div className="guide-cards">
        {insights.map((insight, index) => (
          <div 
            key={index} 
            className="guide-card"
            data-type={insight.type}
          >
            <div className="guide-card-icon">
              {insight.type === 'ai' && '🤖'}
              {insight.type === 'warning' && '⚠️'}
              {insight.type === 'saving' && '💰'}
              {insight.type === 'suggestion' && '💡'}
              {insight.type === 'budget' && '📊'}
              {insight.type === 'info' && 'ℹ️'}
            </div>
            <div className="guide-card-content">
              <h4>{insight.title}</h4>
              <p>{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancialGuide;
