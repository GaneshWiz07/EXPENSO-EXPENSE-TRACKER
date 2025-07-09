import Expense from '../models/Expense.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Utility function to format Indian Rupee
const formatIndianRupee = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Get expenses with advanced filtering
const getExpenses = async (req, res) => {
  try {
    const { 
      category, 
      minAmount, 
      maxAmount, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 100 
    } = req.query;

    // Build filter object
    const filter = {};

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Amount range filter
    if (minAmount && maxAmount) {
      filter.amount = { 
        $gte: parseFloat(minAmount), 
        $lte: parseFloat(maxAmount) 
      };
    } else if (minAmount) {
      filter.amount = { $gte: parseFloat(minAmount) };
    } else if (maxAmount) {
      filter.amount = { $lte: parseFloat(maxAmount) };
    }

    // Date range filter
    if (startDate && endDate) {
      filter.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    // Pagination
    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: { date: -1 } // Sort by most recent first
    };

    // Fetch expenses
    const expenses = await Expense.find(filter, null, options);
    const totalExpenses = await Expense.countDocuments(filter);

    // Send response
    res.status(200).json({
      success: true,
      count: expenses.length,
      total: totalExpenses,
      page: parseInt(page),
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message 
    });
  }
};

// Generate monthly report with filtering
const generateMonthlyReport = async (req, res, skipFetch = false) => {
  try {
    const { 
      category, 
      subcategory, 
      paymentMethod, 
      minAmount, 
      maxAmount 
    } = req.query;

    // Build filter object dynamically
    const filter = {};
    
    // Category filter
    if (category) filter.category = category;
    
    // Subcategory filter
    if (subcategory) filter.subcategory = subcategory;
    
    // Payment method filter
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    
    // Amount range filter with precise handling
    if (minAmount && maxAmount) {
      // Both min and max specified
      filter.amount = { 
        $gte: parseFloat(minAmount), 
        $lte: parseFloat(maxAmount) 
      };
    } else if (minAmount) {
      // Only minimum amount specified
      filter.amount = { $gte: parseFloat(minAmount) };
    } else if (maxAmount) {
      // Only maximum amount specified
      filter.amount = { $lte: parseFloat(maxAmount) };
    }

    // Fetch expenses with applied filters
    const expenses = skipFetch ? await Expense.find(filter) : await Expense.find(filter);

    // Calculate total expenses and category breakdown
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    // Prepare top categories
    const topCategories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name, 
        amount, 
        percentage: ((amount / totalExpenses) * 100).toFixed(2)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Fallback AI insights generation
    const healthAssessment = generateHealthAssessment(topCategories, totalExpenses);
    const recommendations = generateRecommendations(topCategories);

    return {
      healthAssessment,
      topCategories: topCategories.map(c => ({
        name: c.name,
        percentage: c.percentage
      })),
      recommendations
    };
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ message: 'Failed to generate monthly report', error: error.message });
  }
};

// Fallback health assessment generator
const generateHealthAssessment = (topCategories, totalExpenses) => {
  if (topCategories.length === 0) {
    return " No expenses recorded this month. Consider tracking your spending more closely.";
  }

  const topCategory = topCategories[0];
  const concentrationRisk = topCategory.percentage > 50 
    ? " High concentration of expenses in a single category!" 
    : " Expenses are relatively balanced across categories.";

  const totalExpensesAssessment = totalExpenses < 30000 
    ? " Low monthly spending" 
    : totalExpenses > 150000 
      ? " High monthly spending" 
      : " Moderate monthly spending";

  return `${concentrationRisk} ${totalExpensesAssessment} at ${formatIndianRupee(totalExpenses)}.  The top category (${topCategory.name}) accounts for ${topCategory.percentage}% of your total expenses.`;
};

// Fallback recommendations generator
const generateRecommendations = (topCategories) => {
  if (topCategories.length === 0) {
    return [
      " Start tracking your expenses systematically",
      " Create a basic budget to understand your spending patterns",
      " Consider using budgeting apps or spreadsheets"
    ];
  }

  const topCategory = topCategories[0];
  const recommendations = [
    ` Review your ${topCategory.name} expenses in detail`,
    " Create a budget that allocates funds across different categories",
    " Look for ways to reduce spending in your top expense category",
    " Build an emergency fund to provide financial security",
    " Track your expenses consistently to gain better financial insights"
  ];

  return recommendations;
};

// Helper function to parse AI insights into structured format
const parseAIInsights = (aiText) => {
  const healthAssessmentMatch = aiText.match(/Financial Health Assessment:(.*?)(?=Top Spending Categories:|\n\n|$)/s);
  const topCategoriesMatch = aiText.match(/Top Spending Categories:(.*?)(?=Budgeting Recommendations:|\n\n|$)/s);
  const recommendationsMatch = aiText.match(/Budgeting Recommendations:(.*)/s);

  return {
    healthAssessment: healthAssessmentMatch 
      ? healthAssessmentMatch[1].trim() 
      : 'Unable to generate financial health assessment.',
    recommendations: recommendationsMatch 
      ? recommendationsMatch[1].trim().split('\n').map(rec => rec.replace(/^[*-]\s*/, '').trim()).filter(rec => rec)
      : ['No specific recommendations available.']
  };
};

// Create expense with AI insights
const createExpense = async (req, res) => {
  try {
    console.log('Create Expense Request Body:', req.body);
    console.log('Request Headers:', req.headers);
    
    const { description, amount, category, tags, subcategory, paymentMethod } = req.body;

    // Validate required fields
    if (!description || !amount || !category || !paymentMethod) {
      console.error('Missing required fields:', { description, amount, category, paymentMethod });
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide description, amount, category, and payment method.' 
      });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({ 
        message: 'Invalid amount. Amount must be a positive number.' 
      });
    }

    // Create new expense
    const newExpense = new Expense({
      description,
      amount,
      category,
      subcategory: subcategory || 'General',
      tags: tags || [],
      paymentMethod
    });

    // Generate AI insights
    try {
      const aiInsights = await generateAIInsights(description, amount, category);
      newExpense.aiInsights = aiInsights;
    } catch (aiError) {
      console.warn('AI insights generation failed:', aiError);
      // Continue saving expense even if AI insights fail
    }

    // Save expense
    try {
      await newExpense.save();
      console.log('Expense saved successfully:', newExpense);

      res.status(201).json({
        message: 'Expense added successfully',
        expense: newExpense,
        aiInsights: newExpense.aiInsights
      });
    } catch (saveError) {
      console.error('Error saving expense:', saveError);
      res.status(500).json({ 
        message: 'Failed to save expense',
        error: saveError.message 
      });
    }
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ 
      message: 'Failed to create expense',
      error: error.message 
    });
  }
};

// Get all expenses
const getAllExpenses = async (req, res) => {
  try {
    console.log('Fetching all expenses');
    const expenses = await Expense.find();
    console.log(`Found ${expenses.length} expenses`);
    res.json(expenses);
  } catch (error) {
    console.error('Get Expenses Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: 'Expense ID is required' 
      });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid expense ID format' 
      });
    }

    // Find and delete the expense
    const deletedExpense = await Expense.findByIdAndDelete(id);

    if (!deletedExpense) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found',
      });
    }

    // Recalculate monthly report after deletion
    const monthlyReport = await generateMonthlyReport(req, res, true);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
      deletedExpense,
      monthlyReport
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete expense',
      error: error.message 
    });
  }
};

// Restore dashboard data function
const getDashboardData = async (req, res) => {
  try {
    // Get current and previous month/year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }

    // Calculate total expenses
    const totalExpenses = await Expense.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate monthly expenses (current month)
    const [monthlyExpenses, prevMonthExpenses] = await Promise.all([
      // Current month expenses
      Expense.aggregate([
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $month: '$date' }, currentMonth] },
                { $eq: [{ $year: '$date' }, currentYear] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      // Previous month expenses
      Expense.aggregate([
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $month: '$date' }, prevMonth] },
                { $eq: [{ $year: '$date' }, prevYear] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Calculate monthly change percentage
    const currentMonthTotal = monthlyExpenses[0]?.total || 0;
    const prevMonthTotal = prevMonthExpenses[0]?.total || 0;
    let monthlyChange = 0;
    
    if (prevMonthTotal > 0) {
      monthlyChange = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
    } else if (currentMonthTotal > 0) {
      monthlyChange = 100; // 100% increase if no previous month data
    }

    // Category Breakdown
    const categoryBreakdown = await Expense.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Recent Expenses (last 5)
    const recentExpenses = await Expense.find()
      .sort({ date: -1 })
      .limit(5);

    // Prepare response
    res.status(200).json({
      success: true,
      data: {
        totalExpenses: totalExpenses[0]?.total || 0,
        monthlyExpenses: currentMonthTotal,
        monthlyChange: parseFloat(monthlyChange.toFixed(2)), // Round to 2 decimal places
        categoryBreakdown: categoryBreakdown.reduce((acc, category) => {
          acc[category._id] = category.total;
          return acc;
        }, {}),
        recentExpenses: recentExpenses
      }
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve dashboard data',
      error: error.message 
    });
  }
};

// Generate AI insights for expense
async function generateAIInsights(description, amount, category) {
  try {
    console.log('Generating AI Insights');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analyze this expense: 
    Description: ${description}
    Amount: $${amount}
    Category: ${category}
    
    Provide:
    1. A sentiment analysis (positive/neutral/negative)
    2. A brief financial recommendation

    Format your response as:
    Sentiment: [sentiment]
    Recommendation: [recommendation]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response
    const lines = text.split('\n');
    return {
      sentiment: lines[0].replace('Sentiment: ', '').trim(),
      recommendation: lines[1].replace('Recommendation: ', '').trim()
    };
  } catch (error) {
    console.error('AI Insights Generation Error:', error);
    return {
      sentiment: 'neutral',
      recommendation: 'No specific insights available.'
    };
  }
}

// Update an existing expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate input
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expense ID is required' 
      });
    }

    // Optional: Add validation for update data
    const allowedFields = [
      'description', 
      'amount', 
      'category', 
      'date', 
      'paymentMethod', 
      'notes', 
      'tags'
    ];

    const validUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        validUpdateData[key] = updateData[key];
      }
    });

    // Perform update
    const updatedExpense = await Expense.findByIdAndUpdate(
      id, 
      validUpdateData, 
      { 
        new: true,  // Return the updated document
        runValidators: true  // Run model validation on update
      }
    );

    // Check if expense was found and updated
    if (!updatedExpense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    // Generate AI insights for the updated expense
    const aiInsights = await generateAIInsights(
      updatedExpense.description, 
      updatedExpense.amount, 
      updatedExpense.category
    );

    // Attach AI insights to the response
    updatedExpense.aiInsights = aiInsights;

    // Send successful response
    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update expense',
      error: error.message 
    });
  }
};

// Generate financial insights
const getFinancialInsights = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.uid;
    
    // Build date filter if provided
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    // Get expenses for the user
    const expenses = await Expense.find({ userId, ...dateFilter }).sort({ date: -1 });
    
    if (expenses.length === 0) {
      return res.status(200).json({
        success: true,
        data: [
          {
            type: 'info',
            title: 'No Expenses Found',
            description: 'Start adding expenses to get personalized financial insights.'
          }
        ]
      });
    }

    // Generate AI insights for the most recent expense
    const recentExpense = expenses[0]; // Get the most recent expense
    let aiInsights = [];
    
    try {
      // Only try to generate AI insights if we have a valid Gemini API key
      if (process.env.GEMINI_API_KEY) {
        const insights = await generateAIInsights(
          recentExpense.description,
          recentExpense.amount,
          recentExpense.category
        );
        
        if (insights && insights.recommendation) {
          aiInsights = [
            {
              type: 'ai',
              title: 'AI Spending Analysis',
              description: insights.recommendation,
              sentiment: insights.sentiment || 'neutral'
            }
          ];
        }
      }
    } catch (aiError) {
      console.error('Error generating AI insights:', aiError);
      // Continue to fallback insights if AI fails
    }

    // Always generate fallback insights
    const fallbackInsights = generateFallbackInsights(expenses);
    
    // Combine AI and fallback insights, removing any duplicates
    const allInsights = [
      ...aiInsights,
      ...fallbackInsights.filter(
        insight => !aiInsights.some(ai => ai.title === insight.title)
      )
    ];

    // If we still have no insights, add a default message
    if (allInsights.length === 0) {
      allInsights.push({
        type: 'info',
        title: 'Financial Tips',
        description: 'Track your expenses regularly to get personalized financial insights.'
      });
    }
    
    // Send the response with all insights
    res.status(200).json({
      success: true,
      data: allInsights
    });
  } catch (error) {
    console.error('Error generating financial insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate financial insights',
      error: error.message
    });
  }
};

// Helper function to generate fallback insights
const generateFallbackInsights = (expenses) => {
  const insights = [];
  if (!expenses || expenses.length === 0) return insights;
  
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const categorySpending = {};
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  // Calculate category-wise spending and recent expenses
  let recentExpensesCount = 0;
  expenses.forEach(expense => {
    // Categorize spending
    categorySpending[expense.category] = (categorySpending[expense.category] || 0) + expense.amount;
    
    // Count recent expenses
    const expenseDate = new Date(expense.date);
    if (expenseDate >= thirtyDaysAgo) {
      recentExpensesCount++;
    }
  });

  // Generate insights based on spending patterns
  const categories = Object.keys(categorySpending);
  const totalCategories = categories.length;
  const avgExpenseAmount = total / expenses.length;
  
  // 1. Category-based insights
  categories.forEach(category => {
    const amount = categorySpending[category];
    const percentage = (amount / total) * 100;
    
    if (percentage > 30) {
      insights.push({
        type: 'warning',
        title: `High ${category} Spending`,
        description: `Your ${category} expenses account for ${percentage.toFixed(1)}% of your total spending. Consider setting a budget for this category.`,
        priority: 1
      });
    }
  });

  // 2. Spending frequency insights
  if (recentExpensesCount > 20) {
    insights.push({
      type: 'info',
      title: 'Frequent Transactions',
      description: `You've made ${recentExpensesCount} transactions in the last 30 days. Reviewing recurring expenses might help identify savings opportunities.`,
      priority: 2
    });
  }

  // 3. High-value transaction insights
  if (avgExpenseAmount > 5000) {
    insights.push({
      type: 'saving',
      title: 'High-Value Transactions',
      description: `Your average transaction amount is ₹${avgExpenseAmount.toFixed(2)}. Consider if all these expenses are necessary.`,
      priority: 2
    });
  }

  // 4. Category diversity insight
  if (totalCategories < 3) {
    insights.push({
      type: 'suggestion',
      title: 'Diversify Your Spending',
      description: `Your expenses are concentrated in only ${totalCategories} categories. Consider tracking more categories for better insights.`,
      priority: 3
    });
  }

  // 5. General financial tips (always include at least one)
  const generalTips = [
    {
      type: 'suggestion',
      title: 'Budgeting Strategy',
      description: 'Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment.',
      priority: 3
    },
    {
      type: 'suggestion',
      title: 'Emergency Fund',
      description: 'Aim to save 3-6 months worth of living expenses in an emergency fund for financial security.',
      priority: 3
    },
    {
      type: 'suggestion',
      title: 'Review Subscriptions',
      description: 'Regularly review and cancel unused subscriptions to save money.',
      priority: 3
    }
  ];
  
  // Add at least one general tip if no other insights
  if (insights.length === 0) {
    insights.push(generalTips[0]);
  } else {
    // Add a random general tip
    insights.push(generalTips[Math.floor(Math.random() * generalTips.length)]);
  }

  // Sort insights by priority (lower number = higher priority)
  insights.sort((a, b) => (a.priority || 3) - (b.priority || 3));
  
  // Limit to 3 most relevant insights
  return insights.slice(0, 3);
};

// Export all functions as a single object
export default {
  createExpense,
  getExpenses,
  getAllExpenses,
  deleteExpense,
  generateMonthlyReport,
  generateAIInsights,
  getDashboardData,
  updateExpense,
  getFinancialInsights
};
