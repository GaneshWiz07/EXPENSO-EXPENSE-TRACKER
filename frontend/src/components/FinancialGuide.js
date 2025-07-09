import React, { useState, useEffect } from "react";
import { expenseApi } from "../utils/api";

const FinancialGuide = ({ expenses }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyData, setMonthlyData] = useState({
    currentMonth: 0,
    previousMonth: 0,
    percentChange: 0,
    isIncrease: false,
  });

  // Calculate monthly spending data
  useEffect(() => {
    const calculateMonthlyData = async () => {
      try {
        // Get current date info
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Set up date ranges for current and previous month
        const currentMonthStart = new Date(currentYear, currentMonth, 1);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
        const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const prevMonthEnd = new Date(currentYear, currentMonth, 0);

        // Format dates for API
        const formatDate = (date) => date.toISOString().split("T")[0];

        // Get current month expenses
        const currentMonthResponse = await expenseApi.getExpenses({
          startDate: formatDate(currentMonthStart),
          endDate: formatDate(currentMonthEnd),
        });

        // Get previous month expenses
        const prevMonthResponse = await expenseApi.getExpenses({
          startDate: formatDate(prevMonthStart),
          endDate: formatDate(prevMonthEnd),
        });

        // Calculate totals
        const currentMonthTotal = currentMonthResponse.data.data.reduce(
          (sum, expense) => sum + expense.amount,
          0
        );

        const prevMonthTotal = prevMonthResponse.data.data.reduce(
          (sum, expense) => sum + expense.amount,
          0
        );

        // Calculate percentage change
        let percentChange = 0;
        let isIncrease = false;

        if (prevMonthTotal > 0) {
          percentChange =
            ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
          isIncrease = percentChange > 0;
          percentChange = Math.abs(percentChange); // Make it positive for display
        } else if (currentMonthTotal > 0) {
          percentChange = 100; // If previous month was 0, it's a 100% increase
          isIncrease = true;
        }

        setMonthlyData({
          currentMonth: currentMonthTotal,
          previousMonth: prevMonthTotal,
          percentChange: parseFloat(percentChange.toFixed(1)),
          isIncrease,
        });
      } catch (err) {
        console.error("Error calculating monthly data:", err);
        // Don't set an error state, just log it
      }
    };

    if (expenses && expenses.length > 0) {
      calculateMonthlyData();
    }
  }, [expenses]);

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
          throw new Error(response.data?.message || "Failed to load insights");
        }
      } catch (err) {
        console.error("Error fetching insights:", err);
        setError(
          err.response?.data?.message ||
            "Error loading financial insights. Please try again later."
        );
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
        <p className="guide-subtitle">
          {monthlyData.percentChange > 0 ? (
            <>
              <span
                className={monthlyData.isIncrease ? "increase" : "decrease"}
              >
                {monthlyData.isIncrease ? "↑" : "↓"}
                {monthlyData.percentChange}%
                {monthlyData.isIncrease ? " increase" : " decrease"}
              </span>{" "}
              from last month
            </>
          ) : (
            "Personalized recommendations based on your spending patterns"
          )}
        </p>
      </div>

      <div className="guide-cards">
        {/* Filter out the "suggestion" type insight if more than one card exists */}
        {insights
          .filter(
            (insight, index, array) =>
              // Remove "suggestion" type if there are 2 or more cards
              !(array.length > 1 && insight.type === "suggestion")
          )
          .map((insight, index) => (
            <div key={index} className="guide-card" data-type={insight.type}>
              <div className="guide-card-icon">
                {insight.type === "ai" && "🤖"}
                {insight.type === "warning" && "⚠️"}
                {insight.type === "saving" && "💰"}
                {insight.type === "suggestion" && "💡"}
                {insight.type === "budget" && "📊"}
                {insight.type === "info" && "ℹ️"}
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
