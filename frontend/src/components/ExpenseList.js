import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../utils/formatCurrency";
import { useAuth } from "../contexts/AuthContext";
import { expenseApi } from "../utils/api";
import FinancialGuide from "./FinancialGuide";
import "./ExpenseList.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const ExpenseList = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    paymentMethod: "",
    minAmount: "",
    maxAmount: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { state: { from: "/expenses" } });
      return;
    }
  }, [currentUser, navigate]);

  const categories = [
    "Food",
    "Transportation",
    "Entertainment",
    "Utilities",
    "Housing",
    "Healthcare",
    "Education",
    "Personal",
    "Shopping",
    "Miscellaneous",
  ];

  const paymentMethods = [
    "Cash",
    "Credit Card",
    "Debit Card",
    "Bank Transfer",
    "Digital Wallet",
    "Other",
  ];

  const subcategories = {
    Food: ["Groceries", "Restaurants", "Cafes", "Takeout"],
    Transportation: [
      "Public Transit",
      "Fuel",
      "Taxi/Ride-share",
      "Maintenance",
    ],
    Housing: ["Rent", "Mortgage", "Repairs", "Maintenance"],
    Utilities: ["Electricity", "Water", "Internet", "Phone"],
    Healthcare: ["Medicines", "Doctor Visits", "Insurance", "Wellness"],
    Entertainment: ["Movies", "Concerts", "Streaming", "Hobbies"],
    Shopping: ["Clothing", "Electronics", "Gifts", "Personal Care"],
    Miscellaneous: ["Unexpected", "Donations", "Education", "Other"],
  };

  const formatRupee = (amount) => {
    return formatCurrency(amount, "INR");
  };

  const fetchExpenses = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await expenseApi.getExpenses({
        ...appliedFilters,
        page: 1,
        limit: 100,
      });

      console.log("Expenses response:", response.data);
      let expensesData = response.data.data || response.data;

      // Apply client-side filtering for more precise control
      if (expensesData && expensesData.length > 0) {
        expensesData = expensesData.filter((expense) => {
          let matchesFilter = true;

          // Category filter
          if (
            appliedFilters.category &&
            expense.category !== appliedFilters.category
          ) {
            matchesFilter = false;
          }

          // Subcategory filter
          if (
            appliedFilters.subcategory &&
            expense.subcategory !== appliedFilters.subcategory
          ) {
            matchesFilter = false;
          }

          // Payment method filter
          if (
            appliedFilters.paymentMethod &&
            expense.paymentMethod !== appliedFilters.paymentMethod
          ) {
            matchesFilter = false;
          }

          // Amount range filter
          const amount = parseFloat(expense.amount);
          if (appliedFilters.minAmount && amount < appliedFilters.minAmount) {
            matchesFilter = false;
          }
          if (appliedFilters.maxAmount && amount > appliedFilters.maxAmount) {
            matchesFilter = false;
          }

          return matchesFilter;
        });
      }

      setExpenses(expensesData);
    } catch (err) {
      console.error("Fetch expenses error:", err);
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: "/expenses" } });
      } else {
        setErrorMessage("Failed to fetch expenses. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, appliedFilters, navigate]);

  const fetchMonthlyReport = useCallback(async () => {
    if (!currentUser) return;

    try {
      const response = await expenseApi.getMonthlyReport(appliedFilters);
      setMonthlyReport(response.data);
    } catch (error) {
      console.error("Error fetching monthly report:", error);
    }
  }, [currentUser, appliedFilters]);

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
      fetchMonthlyReport();
    }
  }, [currentUser, fetchExpenses, fetchMonthlyReport]);

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
    }
  }, [currentUser, appliedFilters, fetchExpenses]);

  const pieChartData = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [],
            hoverBackgroundColor: [],
          },
        ],
      };
    }

    // Calculate category totals
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    // Prepare data for pie chart
    return {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FF6384",
            "#C9CBCF",
          ],
          hoverBackgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FF6384",
            "#C9CBCF",
          ],
        },
      ],
    };
  }, [expenses]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        [name]: value,
      };

      // Reset subcategory when category changes
      if (name === "category" && value !== prev.category) {
        newFilters.subcategory = "";
      }

      return newFilters;
    });
  };

  const applyFilters = () => {
    const validFilters = {};

    // Validate and format amount filters
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount) && minAmount >= 0) {
        validFilters.minAmount = minAmount;
      }
    }

    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount) && maxAmount >= 0) {
        validFilters.maxAmount = maxAmount;
      }
    }

    // Validate amount range
    if (validFilters.minAmount && validFilters.maxAmount) {
      if (validFilters.minAmount > validFilters.maxAmount) {
        setErrorMessage("Minimum amount cannot be greater than maximum amount");
        return;
      }
    }

    // Add other filters if they have values
    if (filters.category && filters.category.trim()) {
      validFilters.category = filters.category.trim();
    }
    if (filters.subcategory && filters.subcategory.trim()) {
      validFilters.subcategory = filters.subcategory.trim();
    }
    if (filters.paymentMethod && filters.paymentMethod.trim()) {
      validFilters.paymentMethod = filters.paymentMethod.trim();
    }

    console.log("Applying filters:", validFilters);
    setErrorMessage("");
    setAppliedFilters(validFilters);
  };

  const resetFilters = () => {
    setFilters({
      category: "",
      subcategory: "",
      paymentMethod: "",
      minAmount: "",
      maxAmount: "",
    });
    setAppliedFilters({});
    setErrorMessage("");
  };

  const renderExpenseList = () => {
    if (loading && !expenses.length) {
      return <div className="loading">Loading expenses...</div>;
    }

    if (errorMessage) {
      return <div className="error">{errorMessage}</div>;
    }

    if (!expenses.length) {
      return (
        <div className="no-expenses">
          {Object.keys(appliedFilters).length > 0
            ? "No expenses match the selected filters."
            : "No expenses found."}
        </div>
      );
    }

    return (
      <div className="expense-list">
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        <table className="expense-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Payment Method</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense._id || expense.id}>
                <td>{expense.description}</td>
                <td>{formatRupee(expense.amount)}</td>
                <td>{expense.category}</td>
                <td>{expense.paymentMethod}</td>
                <td>{new Date(expense.date).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleEdit(expense)}
                    className="edit-btn"
                    disabled={loading}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(expense._id || expense.id)}
                    className="delete-btn"
                    disabled={loading}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFinancialReport = () => {
    if (!monthlyReport) return null;

    return (
      <div className="ai-insights-section">
        <div className="ai-insights-header">
          <h3>Financial Insights</h3>
        </div>

        <div className="ai-insights-card">
          <div className="ai-insights-content">
            {monthlyReport.insights.map((insight, index) => (
              <div
                key={index}
                className="ai-tip"
                data-type={insight.type}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="ai-tip-icon">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="ai-tip-content">
                  <div className="ai-tip-title">
                    {insight.title}
                    {insight.type === "achievement" && "🎉"}
                    {insight.type === "warning" && "⚠️"}
                  </div>
                  <div className="ai-tip-description">
                    {insight.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {monthlyReport.summary && (
          <div className="ai-insights-card">
            <div className="ai-tip">
              <div className="ai-tip-icon">📊</div>
              <div className="ai-tip-content">
                <div className="ai-tip-title">Monthly Summary</div>
                <div className="ai-tip-description">
                  {monthlyReport.summary}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getInsightIcon = (type) => {
    const icons = {
      saving: "💰",
      warning: "⚠️",
      trend: "📈",
      suggestion: "💡",
      achievement: "🎯",
      budget: "📊",
      spending: "💳",
      income: "💵",
      default: "📋",
    };
    return icons[type] || icons.default;
  };

  const renderFilters = () => (
    <div className="expense-filters-container">
      <div className="filter-container">
        <div className="filter-inputs">
          <div className="filter-group">
            <label>Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {filters.category && subcategories[filters.category] && (
            <div className="filter-group">
              <label>Subcategory</label>
              <select
                name="subcategory"
                value={filters.subcategory}
                onChange={handleFilterChange}
              >
                <option value="">All Subcategories</option>
                {subcategories[filters.category].map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Payment Method</label>
            <select
              name="paymentMethod"
              value={filters.paymentMethod}
              onChange={handleFilterChange}
            >
              <option value="">All Methods</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Min Amount</label>
            <input
              type="number"
              name="minAmount"
              value={filters.minAmount}
              onChange={handleFilterChange}
              placeholder="Min Amount"
              min="0"
            />
          </div>

          <div className="filter-group">
            <label>Max Amount</label>
            <input
              type="number"
              name="maxAmount"
              value={filters.maxAmount}
              onChange={handleFilterChange}
              placeholder="Max Amount"
              min="0"
            />
          </div>
        </div>

        <div className="filter-actions">
          <button
            className="apply-filters-btn"
            onClick={applyFilters}
            disabled={loading}
          >
            Apply Filters
          </button>
          <button
            className="reset-filters-btn"
            onClick={resetFilters}
            disabled={loading}
          >
            Reset Filters
          </button>
        </div>
      </div>
      {errorMessage && <div className="filter-error">{errorMessage}</div>}
    </div>
  );

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your expenses...</p>
      </div>
    );
  }

  const handleEdit = (expense) => {
    setCurrentExpense(expense);
    setEditMode(true);

    // Scroll to the edit form
    setTimeout(() => {
      document
        .getElementById("editFormContainer")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!currentExpense) return;

    // Clear any existing success message timeouts
    if (window.successMessageTimeout) {
      clearTimeout(window.successMessageTimeout);
    }

    try {
      setLoading(true);
      setErrorMessage("");

      // Make API call to update the expense
      await expenseApi.updateExpense(currentExpense._id || currentExpense.id, {
        description: currentExpense.description,
        amount: parseFloat(currentExpense.amount),
        category: currentExpense.category,
        paymentMethod: currentExpense.paymentMethod,
        date: currentExpense.date,
      });

      // Update the expenses list
      await fetchExpenses();

      // Show success message
      setSuccessMessage("Expense updated successfully!");

      // Close the edit form
      setEditMode(false);
      setCurrentExpense(null);

      // Update monthly report after successful update
      await fetchMonthlyReport();

      // Clear success message after 3 seconds
      window.successMessageTimeout = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      // Force clear the message after 3.5 seconds as a backup
      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);
    } catch (err) {
      console.error("Update expense error:", err);
      setErrorMessage("Failed to update expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    // Clear any existing success message timeouts
    if (window.successMessageTimeout) {
      clearTimeout(window.successMessageTimeout);
    }

    try {
      setLoading(true);
      setErrorMessage("");

      // First update the UI optimistically
      setExpenses((prevExpenses) =>
        prevExpenses.filter(
          (expense) => String(expense._id || expense.id) !== String(expenseId)
        )
      );

      // Then make the API call
      await expenseApi.deleteExpense(expenseId);

      // Show success message
      setSuccessMessage("Expense deleted successfully!");

      // Update monthly report after successful deletion
      await fetchMonthlyReport();

      // Clear success message after 3 seconds
      window.successMessageTimeout = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      // Force clear the message after 3.5 seconds as a backup
      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);
    } catch (err) {
      console.error("Delete expense error:", err);
      // If deletion fails, revert the optimistic update
      await fetchExpenses();
      setErrorMessage("Failed to delete expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="expense-list-container">
      <div className="expenses-header">
        <h2>💸 Expense List</h2>
        <button
          className="add-expense-btn"
          onClick={() => navigate("/add-expense")}
        >
          ➕ Add New Expense
        </button>
      </div>

      {renderFilters()}

      {editMode && currentExpense && (
        <div id="editFormContainer" className="edit-expense-form-container">
          <h3>Edit Expense</h3>
          <form onSubmit={handleUpdate} className="edit-expense-form">
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <input
                type="text"
                id="description"
                value={currentExpense.description}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    description: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                type="number"
                id="amount"
                value={currentExpense.amount}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    amount: e.target.value,
                  })
                }
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={currentExpense.category}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    category: e.target.value,
                  })
                }
                required
              >
                <option value="">Select Category</option>
                <option value="Food">Food</option>
                <option value="Rent">Rent</option>
                <option value="Transportation">Transportation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Shopping">Shopping</option>
                <option value="Education">Education</option>
                <option value="Travel">Travel</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="paymentMethod">Payment Method</label>
              <select
                id="paymentMethod"
                value={currentExpense.paymentMethod}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    paymentMethod: e.target.value,
                  })
                }
                required
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Digital Wallet">Digital Wallet</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                value={
                  currentExpense.date
                    ? new Date(currentExpense.date).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setCurrentExpense({ ...currentExpense, date: e.target.value })
                }
                required
              />
            </div>
            <div className="form-action-buttons">
              <button type="submit" className="update-btn" disabled={loading}>
                {loading ? "Updating..." : "Update Expense"}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setEditMode(false);
                  setCurrentExpense(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="expense-table-container">
        {expenses.length === 0 ? (
          <div className="no-expenses">
            <p>No expenses found matching the current filters.</p>
            <button
              className="add-expense-btn"
              onClick={() => navigate("/add-expense")}
            >
              ➕ Add Expense
            </button>
          </div>
        ) : (
          <div className="expense-table-scrollable">{renderExpenseList()}</div>
        )}
      </div>

      <div className="monthly-report">
        {/* Pie Chart */}
        <div className="chart-container">
          {pieChartData && (
            <Pie
              data={pieChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: 10,
                },
                plugins: {
                  title: {
                    display: true,
                    text: "Expense Distribution",
                    font: {
                      size: 18,
                      weight: "bold",
                    },
                  },
                  legend: {
                    position: "bottom",
                    labels: {
                      boxWidth: 20,
                      font: {
                        size: 12,
                      },
                    },
                  },
                  tooltip: {
                    backgroundColor: "#333",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: "#666",
                    borderWidth: 1,
                  },
                },
              }}
            />
          )}
          {!pieChartData && <div>No expense data available for chart</div>}
        </div>

        {/* Financial Guide */}
        {!loading && expenses.length > 0 && (
          <FinancialGuide expenses={expenses} monthlyReport={monthlyReport} />
        )}

        {/* Financial Report */}
        <div className="ai-financial-report">
          {monthlyReport && (
            <div>
              <h3>Financial Insights</h3>
              <p>{monthlyReport.healthAssessment}</p>

              <h4>Top Categories</h4>
              <ul>
                {monthlyReport.topCategories.map((category, index) => (
                  <li key={index}>
                    {category.name}: {formatRupee(category.total)}(
                    {category.percentage.toFixed(2)}%)
                  </li>
                ))}
              </ul>

              <h4>Recommendations</h4>
              <ul>
                {monthlyReport.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Financial Tips */}
        {renderFinancialReport()}
      </div>
    </div>
  );
};

export default ExpenseList;
