import express from 'express';
import Expense from '../models/Expense.js';
import { authenticateFirebaseToken } from '../middleware/firebaseAuth.js';

const router = express.Router();

// Apply Firebase authentication middleware
router.use(authenticateFirebaseToken);

// Get dashboard data
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get current date and start of month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all expenses for the user
    const allExpenses = await Expense.find({ userId });

    // Calculate total expenses
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate monthly expenses
    const monthlyExpenses = allExpenses
      .filter(expense => new Date(expense.date) >= startOfMonth)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate category breakdown
    const categoryBreakdown = allExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    // Get recent expenses (last 5)
    const recentExpenses = await Expense.find({ userId })
      .sort({ date: -1 })
      .limit(5);

    // Calculate month-over-month comparison
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthExpenses = allExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= lastMonth && expenseDate < startOfMonth;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);

    const monthlyChange = ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

    res.json({
      totalExpenses,
      monthlyExpenses,
      categoryBreakdown,
      recentExpenses,
      monthlyChange: isFinite(monthlyChange) ? monthlyChange : 0,
      expenseCount: allExpenses.length
    });
  } catch (error) {
    console.error('Dashboard data retrieval error:', error);
    res.status(500).json({
      message: 'Failed to retrieve dashboard data',
      error: error.message
    });
  }
});

export default router;
