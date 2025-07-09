import express from 'express';
import cors from 'cors';
import Expense from '../models/Expense.js';
import { authenticateFirebaseToken } from '../middleware/firebaseAuth.js';
import expenseController from '../controllers/expenseController.js';

const router = express.Router();

// Enable CORS
router.use(cors());

// Apply Firebase authentication middleware to all routes
router.use(authenticateFirebaseToken);

// Get financial insights
router.get('/insights', expenseController.getFinancialInsights);

// Get dashboard data
router.get('/dashboard', expenseController.getDashboardData);

// Create a new expense
router.post('/', async (req, res) => {
  try {
    const { 
      description, 
      amount, 
      category, 
      date,
      subcategory = 'General', 
      paymentMethod = 'Other', 
      tags = [] 
    } = req.body;

    // Get userId from authenticated request
    const userId = req.user.uid;

    console.log('Creating expense with data:', {
      description,
      amount,
      category,
      date,
      subcategory,
      paymentMethod,
      tags,
      userId
    });

    // Validate input
    if (!description || !amount || !category || !date) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        requiredFields: ['description', 'amount', 'category', 'date'] 
      });
    }

    // Create new expense
    const newExpense = new Expense({
      description,
      amount,
      category,
      date,
      subcategory,
      paymentMethod,
      tags,
      userId
    });

    // Save expense
    const savedExpense = await newExpense.save();
    console.log('Saved expense:', savedExpense);

    res.status(201).json({
      message: 'Expense added successfully',
      expense: savedExpense
    });
  } catch (error) {
    console.error('Expense creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create expense', 
      error: error.message 
    });
  }
});

// Get all expenses for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid; // From Firebase authentication middleware
    console.log('Fetching expenses for user:', userId);

    const expenses = await Expense.find({ userId }).sort({ date: -1 });
    console.log('Found expenses:', expenses.length);

    res.json({
      message: 'Expenses retrieved successfully',
      data: expenses,
      count: expenses.length
    });
  } catch (error) {
    console.error('Expenses retrieval error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve expenses', 
      error: error.message 
    });
  }
});

// Update an expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, userId }, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Expense update error:', error);
    res.status(500).json({ 
      message: 'Failed to update expense', 
      error: error.message 
    });
  }
});

// Delete an expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const deletedExpense = await Expense.findOneAndDelete({ _id: id, userId });

    if (!deletedExpense) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    res.json({
      message: 'Expense deleted successfully',
      expense: deletedExpense
    });
  } catch (error) {
    console.error('Expense deletion error:', error);
    res.status(500).json({ 
      message: 'Failed to delete expense', 
      error: error.message 
    });
  }
});

export default router;
