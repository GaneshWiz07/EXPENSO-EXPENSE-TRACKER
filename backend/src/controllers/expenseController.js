import Expense from "../models/Expense.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Utility function to format Indian Rupee
const formatIndianRupee = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Get expenses with advanced filtering (USER-SPECIFIC)
const getExpenses = async (req, res) => {
  try {
    const {
      category,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      page = 1,
      limit = 100,
    } = req.query;

    // Build filter object - ALWAYS include userId
    const filter = {
      userId: req.user.uid, // Filter by authenticated user
    };

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Amount range filter
    if (minAmount && maxAmount) {
      filter.amount = {
        $gte: parseFloat(minAmount),
        $lte: parseFloat(maxAmount),
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
        $lte: new Date(endDate),
      };
    }

    // Pagination
    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: { date: -1 }, // Sort by most recent first
    };

    // Fetch expenses for the authenticated user only
    const expenses = await Expense.find(filter, null, options);
    const totalExpenses = await Expense.countDocuments(filter);

    // Send response
    res.status(200).json({
      success: true,
      count: expenses.length,
      total: totalExpenses,
      page: parseInt(page),
      data: expenses,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

// Generate monthly report with filtering (USER-SPECIFIC)
const generateMonthlyReport = async (req, res, skipFetch = false) => {
  try {
    const { category, subcategory, paymentMethod, minAmount, maxAmount } =
      req.query;

    // Build filter object dynamically - ALWAYS include userId
    const filter = {
      userId: req.user.uid, // Filter by authenticated user
    };

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
        $lte: parseFloat(maxAmount),
      };
    } else if (minAmount) {
      // Only minimum amount specified
      filter.amount = { $gte: parseFloat(minAmount) };
    } else if (maxAmount) {
      // Only maximum amount specified
      filter.amount = { $lte: parseFloat(maxAmount) };
    }

    // Fetch expenses with applied filters for the authenticated user only
    const expenses = skipFetch
      ? await Expense.find(filter)
      : await Expense.find(filter);

    // Calculate total expenses and category breakdown
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    // Prepare top categories
    const topCategories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: ((amount / totalExpenses) * 100).toFixed(2),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Fallback AI insights generation
    const healthAssessment = generateHealthAssessment(
      topCategories,
      totalExpenses
    );
    const recommendations = generateRecommendations(topCategories);

    return {
      healthAssessment,
      topCategories: topCategories.map((c) => ({
        name: c.name,
        percentage: c.percentage,
      })),
      recommendations,
    };
  } catch (error) {
    console.error("Error generating monthly report:", error);
    res.status(500).json({
      message: "Failed to generate monthly report",
      error: error.message,
    });
  }
};

// Fallback health assessment generator
const generateHealthAssessment = (topCategories, totalExpenses) => {
  if (topCategories.length === 0) {
    return " No expenses recorded this month. Consider tracking your spending more closely.";
  }

  const topCategory = topCategories[0];
  const concentrationRisk =
    topCategory.percentage > 50
      ? " High concentration of expenses in a single category!"
      : " Expenses are relatively balanced across categories.";

  const totalExpensesAssessment =
    totalExpenses < 30000
      ? " Low monthly spending"
      : totalExpenses > 150000
      ? " High monthly spending"
      : " Moderate monthly spending";

  return `${concentrationRisk} ${totalExpensesAssessment} at ${formatIndianRupee(
    totalExpenses
  )}.  The top category (${topCategory.name}) accounts for ${
    topCategory.percentage
  }% of your total expenses.`;
};

// Fallback recommendations generator
const generateRecommendations = (topCategories) => {
  if (topCategories.length === 0) {
    return [
      " Start tracking your expenses systematically",
      " Create a basic budget to understand your spending patterns",
      " Consider using budgeting apps or spreadsheets",
    ];
  }

  const topCategory = topCategories[0];
  const recommendations = [
    ` Review your ${topCategory.name} expenses in detail`,
    " Create a budget that allocates funds across different categories",
    " Look for ways to reduce spending in your top expense category",
    " Build an emergency fund to provide financial security",
    " Track your expenses consistently to gain better financial insights",
  ];

  return recommendations;
};

// Helper function to parse AI insights into structured format
const parseAIInsights = (aiText) => {
  const healthAssessmentMatch = aiText.match(
    /Financial Health Assessment:(.*?)(?=Top Spending Categories:|\n\n|$)/s
  );
  const topCategoriesMatch = aiText.match(
    /Top Spending Categories:(.*?)(?=Budgeting Recommendations:|\n\n|$)/s
  );
  const recommendationsMatch = aiText.match(/Budgeting Recommendations:(.*)/s);

  return {
    healthAssessment: healthAssessmentMatch
      ? healthAssessmentMatch[1].trim()
      : "Unable to generate financial health assessment.",
    recommendations: recommendationsMatch
      ? recommendationsMatch[1]
          .trim()
          .split("\n")
          .map((rec) => rec.replace(/^[*-]\s*/, "").trim())
          .filter((rec) => rec)
      : ["No specific recommendations available."],
  };
};

// Create expense with AI insights (USER-SPECIFIC)
const createExpense = async (req, res) => {
  try {
    console.log("Create Expense Request Body:", req.body);
    console.log("Request Headers:", req.headers);

    const { description, amount, category, tags, subcategory, paymentMethod } =
      req.body;

    // Validate required fields
    if (!description || !amount || !category || !paymentMethod) {
      console.error("Missing required fields:", {
        description,
        amount,
        category,
        paymentMethod,
      });
      return res.status(400).json({
        message:
          "Missing required fields. Please provide description, amount, category, and payment method.",
      });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      console.error("Invalid amount:", amount);
      return res.status(400).json({
        message: "Invalid amount. Amount must be a positive number.",
      });
    }

    // Create new expense with userId
    const newExpense = new Expense({
      description,
      amount,
      category,
      subcategory: subcategory || "General",
      tags: tags || [],
      paymentMethod,
      userId: req.user.uid, // Associate with authenticated user
    });

    // Generate AI insights
    try {
      const aiInsights = await generateAIInsights(
        description,
        amount,
        category
      );
      newExpense.aiInsights = aiInsights;
    } catch (aiError) {
      console.warn("AI insights generation failed:", aiError);
      // Continue saving expense even if AI insights fail
    }

    // Save expense
    try {
      await newExpense.save();
      console.log("Expense saved successfully:", newExpense);

      res.status(201).json({
        message: "Expense added successfully",
        expense: newExpense,
        aiInsights: newExpense.aiInsights,
      });
    } catch (saveError) {
      console.error("Error saving expense:", saveError);
      res.status(500).json({
        message: "Failed to save expense",
        error: saveError.message,
      });
    }
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({
      message: "Failed to create expense",
      error: error.message,
    });
  }
};

// Get all expenses for the authenticated user (USER-SPECIFIC)
const getAllExpenses = async (req, res) => {
  try {
    console.log("Fetching all expenses for user:", req.user.uid);
    const expenses = await Expense.find({ userId: req.user.uid });
    console.log(`Found ${expenses.length} expenses for user`);
    res.json(expenses);
  } catch (error) {
    console.error("Get Expenses Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete an expense (USER-SPECIFIC)
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Expense ID is required",
      });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID format",
      });
    }

    // Find and delete the expense (only if it belongs to the user)
    const deletedExpense = await Expense.findOneAndDelete({
      _id: id,
      userId: req.user.uid,
    });

    if (!deletedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Recalculate monthly report after deletion
    const monthlyReport = await generateMonthlyReport(req, res, true);

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
      deletedExpense,
      monthlyReport,
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete expense",
      error: error.message,
    });
  }
};

// Restore dashboard data function (USER-SPECIFIC)
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

    // Calculate total expenses for the authenticated user
    const totalExpenses = await Expense.aggregate([
      {
        $match: { userId: req.user.uid },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Calculate monthly expenses (current month) for the authenticated user
    const [monthlyExpenses, prevMonthExpenses] = await Promise.all([
      // Current month expenses
      Expense.aggregate([
        {
          $match: {
            userId: req.user.uid,
            $expr: {
              $and: [
                { $eq: [{ $month: "$date" }, currentMonth] },
                { $eq: [{ $year: "$date" }, currentYear] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      // Previous month expenses
      Expense.aggregate([
        {
          $match: {
            userId: req.user.uid,
            $expr: {
              $and: [
                { $eq: [{ $month: "$date" }, prevMonth] },
                { $eq: [{ $year: "$date" }, prevYear] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // Calculate monthly change percentage
    const currentMonthTotal = monthlyExpenses[0]?.total || 0;
    const prevMonthTotal = prevMonthExpenses[0]?.total || 0;
    let monthlyChange = 0;

    if (prevMonthTotal > 0) {
      monthlyChange =
        ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
    } else if (currentMonthTotal > 0) {
      monthlyChange = 100; // 100% increase if no previous month data
    }

    // Category Breakdown for the authenticated user
    const categoryBreakdown = await Expense.aggregate([
      {
        $match: { userId: req.user.uid },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Recent Expenses (last 5) for the authenticated user
    const recentExpenses = await Expense.find({ userId: req.user.uid })
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
        recentExpenses: recentExpenses,
      },
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard data",
      error: error.message,
    });
  }
};

// Generate AI insights for expense
async function generateAIInsights(description, amount, category) {
  try {
    console.log("Generating AI Insights");

    // For specific categories and small expenses, provide tailored insights without using AI
    if (category && description) {
      // Convert to lowercase for easier comparison
      const lowerCategory = category.toLowerCase();
      const lowerDescription = description.toLowerCase();

      // Check for common shopping categories
      if (
        (lowerCategory.includes("shopping") ||
          lowerCategory.includes("clothing") ||
          lowerCategory.includes("footwear")) &&
        amount <= 5000
      ) {
        // Check for shoe-related purchases
        if (
          lowerDescription.includes("shoe") ||
          lowerDescription.includes("sneaker") ||
          lowerDescription.includes("footwear")
        ) {
          return {
            sentiment: "neutral",
            recommendation: `Your ${description} purchase of ₹${amount} is reasonable for footwear. Consider evaluating if this was a necessary purchase and how long these shoes will last to determine the value.`,
          };
        }

        // Check for clothing
        if (
          lowerDescription.includes("shirt") ||
          lowerDescription.includes("pant") ||
          lowerDescription.includes("cloth") ||
          lowerDescription.includes("dress")
        ) {
          return {
            sentiment: "neutral",
            recommendation: `Your clothing purchase of ₹${amount} for ${description} fits within a reasonable budget. Try building a versatile wardrobe with fewer, quality items rather than many cheaper ones.`,
          };
        }
      }

      // Check for food or groceries
      if (lowerCategory.includes("food") || lowerCategory.includes("grocery")) {
        if (amount <= 1000) {
          return {
            sentiment: "positive",
            recommendation: `Your ${description} expense of ₹${amount} is reasonable. Consider meal planning to optimize your food budget and reduce wastage.`,
          };
        } else {
          return {
            sentiment: "neutral",
            recommendation: `Your ${description} expense of ₹${amount} is on the higher side. Try buying in bulk, using discounts, or opting for seasonal items to save on grocery expenses.`,
          };
        }
      }
    }

    // If no specific insight was generated, use the AI model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze this expense: 
    Description: ${description}
    Amount: ₹${amount}
    Category: ${category}
    
    Provide:
    1. A sentiment analysis (positive/neutral/negative)
    2. A specific, actionable financial recommendation related to this expense
    3. Make sure the recommendation is personalized to the expense type and amount

    Format your response as:
    Sentiment: [sentiment]
    Recommendation: [recommendation]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response
    const lines = text.split("\n");
    return {
      sentiment: lines[0].replace("Sentiment: ", "").trim(),
      recommendation: lines[1].replace("Recommendation: ", "").trim(),
    };
  } catch (error) {
    console.error("AI Insights Generation Error:", error);

    // Provide more specific fallback insights based on category
    if (category) {
      const lowerCategory = category.toLowerCase();

      if (
        lowerCategory.includes("shopping") ||
        lowerCategory.includes("clothing")
      ) {
        return {
          sentiment: "neutral",
          recommendation: `For your ${description} purchase, consider if this was a need or a want. Create a dedicated budget for shopping expenses to avoid impulse purchases.`,
        };
      } else if (lowerCategory.includes("food")) {
        return {
          sentiment: "neutral",
          recommendation: `For food expenses like ${description}, try meal planning and batch cooking to reduce overall costs while maintaining nutrition.`,
        };
      } else if (lowerCategory.includes("transport")) {
        return {
          sentiment: "neutral",
          recommendation: `Consider using public transportation or carpooling to reduce transport expenses when possible.`,
        };
      }
    }

    // Generic fallback
    return {
      sentiment: "neutral",
      recommendation: `I've analyzed your ${description} expense of ₹${amount}. Consider tracking similar expenses in this category to identify spending patterns and potential savings.`,
    };
  }
}

// Generate insights without using external AI APIs
function generateLocalAIInsights(description, amount, category) {
  console.log("Generating Local AI Insights");

  // Convert to lowercase for easier comparison
  const lowerCategory = category ? category.toLowerCase() : "";
  const lowerDescription = description ? description.toLowerCase() : "";

  // Specific insights based on category and expense
  // Shopping/Clothing
  if (
    lowerCategory.includes("shopping") ||
    lowerCategory.includes("clothing") ||
    lowerCategory.includes("footwear")
  ) {
    // Shoes
    if (
      lowerDescription.includes("shoe") ||
      lowerDescription.includes("sneaker") ||
      lowerDescription.includes("footwear")
    ) {
      if (amount <= 2000) {
        return {
          sentiment: "positive",
          recommendation: `Your ${description} purchase of ₹${amount} is quite economical. Quality footwear at this price point can be a good value, but make sure they'll last long enough to justify the cost.`,
        };
      } else if (amount <= 5000) {
        return {
          sentiment: "neutral",
          recommendation: `Your ${description} purchase of ₹${amount} is reasonable for quality footwear. Consider this an investment in your comfort and health, as good shoes can prevent foot problems.`,
        };
      } else {
        return {
          sentiment: "neutral",
          recommendation: `Your ${description} purchase of ₹${amount} is in the premium range. For high-end footwear, consider the cost-per-wear - how frequently you'll use them and how long they'll last.`,
        };
      }
    }

    // Bags
    if (
      lowerDescription.includes("bag") ||
      lowerDescription.includes("purse") ||
      lowerDescription.includes("backpack")
    ) {
      if (amount <= 3000) {
        return {
          sentiment: "positive",
          recommendation: `Your ${description} purchase of ₹${amount} is reasonable. Practical bags can last for years, making this a good long-term investment.`,
        };
      } else if (amount <= 10000) {
        return {
          sentiment: "neutral",
          recommendation: `Your ${description} purchase of ₹${amount} is significant. For premium bags, consider if this fits within your discretionary spending budget and if the quality justifies the higher price.`,
        };
      } else {
        return {
          sentiment: "negative",
          recommendation: `Your ${description} purchase of ₹${amount} is in the luxury category. While quality accessories can last for years, consider whether this expense aligns with your overall financial goals.`,
        };
      }
    }

    // Other clothing
    if (
      lowerDescription.includes("shirt") ||
      lowerDescription.includes("pant") ||
      lowerDescription.includes("cloth") ||
      lowerDescription.includes("dress")
    ) {
      return {
        sentiment: "neutral",
        recommendation: `Your clothing purchase of ₹${amount} for ${description} can be part of a thoughtful wardrobe strategy. Consider building a versatile collection with fewer, quality items rather than many cheaper ones.`,
      };
    }
  }

  // Food/Groceries
  else if (
    lowerCategory.includes("food") ||
    lowerCategory.includes("grocery")
  ) {
    if (amount <= 1000) {
      return {
        sentiment: "positive",
        recommendation: `Your ${description} expense of ₹${amount} is reasonable. For regular food expenses, meal planning can help optimize your budget further while reducing waste.`,
      };
    } else if (amount <= 3000) {
      return {
        sentiment: "neutral",
        recommendation: `Your ${description} expense of ₹${amount} is moderate. Consider buying staples in bulk and preparing more meals at home to manage your food budget effectively.`,
      };
    } else {
      return {
        sentiment: "negative",
        recommendation: `Your ${description} expense of ₹${amount} is relatively high. Try buying in bulk, using discounts, or opting for seasonal items to save on food expenses without sacrificing nutrition.`,
      };
    }
  }

  // Healthcare
  else if (
    lowerCategory.includes("health") ||
    lowerCategory.includes("medical")
  ) {
    return {
      sentiment: "neutral",
      recommendation: `Your healthcare expense of ₹${amount} for ${description} is an important investment in your wellbeing. Consider if you're maximizing insurance benefits and preventative care to minimize long-term costs.`,
    };
  }

  // Utilities
  else if (
    lowerCategory.includes("utility") ||
    lowerCategory.includes("bill")
  ) {
    return {
      sentiment: "neutral",
      recommendation: `Your ${description} expense of ₹${amount} is a necessity. To optimize utility costs, review your usage patterns and consider energy-efficient alternatives where possible.`,
    };
  }

  // Entertainment
  else if (lowerCategory.includes("entertainment")) {
    return {
      sentiment: "neutral",
      recommendation: `For entertainment expenses like ${description}, consider setting a monthly budget of 5-10% of your income. Look for free or low-cost alternatives occasionally to balance enjoyment with savings.`,
    };
  }

  // Default response if no specific category matches
  return {
    sentiment: "neutral",
    recommendation: `I've analyzed your ${description} expense of ₹${amount}. For better financial insights, categorize your expenses consistently and review them monthly to identify patterns and savings opportunities.`,
  };
}

// Update an existing expense (USER-SPECIFIC)
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate input
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Expense ID is required",
      });
    }

    // Optional: Add validation for update data
    const allowedFields = [
      "description",
      "amount",
      "category",
      "date",
      "paymentMethod",
      "notes",
      "tags",
    ];

    const validUpdateData = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        validUpdateData[key] = updateData[key];
      }
    });

    // Perform update (only if expense belongs to the user)
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, userId: req.user.uid },
      validUpdateData,
      {
        new: true, // Return the updated document
        runValidators: true, // Run model validation on update
      }
    );

    // Check if expense was found and updated
    if (!updatedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
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
      message: "Expense updated successfully",
      data: updatedExpense,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update expense",
      error: error.message,
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
        $lte: new Date(endDate),
      };
    }

    // Get expenses for the user
    const expenses = await Expense.find({ userId, ...dateFilter }).sort({
      date: -1,
    });

    if (expenses.length === 0) {
      return res.status(200).json({
        success: true,
        data: [
          {
            type: "info",
            title: "No Expenses Found",
            description:
              "Start adding expenses to get personalized financial insights.",
          },
        ],
      });
    }

    // Generate AI insights for the most recent expense
    const recentExpense = expenses[0]; // Get the most recent expense
    let aiInsights = [];

    try {
      // Only try to generate AI insights if we have a valid Gemini API key
      if (
        process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== "your_actual_gemini_api_key_here"
      ) {
        console.log("Using Gemini API for insights");
        const insights = await generateAIInsights(
          recentExpense.description,
          recentExpense.amount,
          recentExpense.category
        );

        if (insights && insights.recommendation) {
          aiInsights = [
            {
              type: "ai",
              title: "Spending Analysis",
              description: insights.recommendation,
              sentiment: insights.sentiment || "neutral",
            },
          ];
        }
      } else {
        // Log that we're using the local implementation
        console.log(
          "No valid Gemini API key found. Using local implementation for insights."
        );

        // If no API key, use our enhanced local implementation with a clear label
        const insights = generateLocalAIInsights(
          recentExpense.description,
          recentExpense.amount,
          recentExpense.category
        );

        aiInsights = [
          {
            type: "ai",
            title: "Spending Analysis",
            description: insights.recommendation,
            sentiment: insights.sentiment || "neutral",
          },
        ];
      }
    } catch (aiError) {
      console.error("Error generating AI insights:", aiError);
      // Continue to fallback insights if AI fails
    }

    // Always generate fallback insights
    const fallbackInsights = generateFallbackInsights(expenses);

    // Combine AI and fallback insights, removing any duplicates
    const allInsights = [
      ...aiInsights,
      ...fallbackInsights.filter(
        (insight) => !aiInsights.some((ai) => ai.title === insight.title)
      ),
    ];

    // If we still have no insights or only have generic ones, add more specific insights
    if (
      allInsights.length === 0 ||
      (allInsights.length === 1 && allInsights[0].title === "Spending Analysis")
    ) {
      // Check if we have an expense to analyze
      if (expenses.length > 0) {
        const recentExpense = expenses[0];

        // Add specific insight based on the expense category
        if (recentExpense.category) {
          const category = recentExpense.category.toLowerCase();

          if (category.includes("shopping") || category.includes("clothing")) {
            allInsights.push({
              type: "suggestion",
              title: "Shopping Budget Tip",
              description: `Consider setting a monthly budget for ${recentExpense.category} expenses. Aim to allocate no more than 5-10% of your income to discretionary purchases.`,
            });
          } else if (
            category.includes("food") ||
            category.includes("grocery")
          ) {
            allInsights.push({
              type: "saving",
              title: "Food Expense Strategy",
              description:
                "Try meal planning and buying in bulk to reduce your food expenses. This can save you 20-30% on your monthly grocery bill.",
            });
          } else if (category.includes("transport")) {
            allInsights.push({
              type: "suggestion",
              title: "Transportation Savings",
              description:
                "Consider carpooling, using public transport, or combining errands to save on fuel and transportation costs.",
            });
          } else {
            allInsights.push({
              type: "info",
              title: `${recentExpense.category} Spending`,
              description: `Track your ${recentExpense.category} expenses over time to identify patterns and opportunities for saving.`,
            });
          }
        } else {
          // Generic tip if no category
          allInsights.push({
            type: "info",
            title: "Financial Tips",
            description:
              "Track your expenses regularly and categorize them to get more personalized financial insights.",
          });
        }
      } else {
        // No expenses
        allInsights.push({
          type: "info",
          title: "Financial Tips",
          description:
            "Start tracking your expenses regularly to get personalized financial insights.",
        });
      }
    }

    // Send the response with all insights
    res.status(200).json({
      success: true,
      data: allInsights,
    });
  } catch (error) {
    console.error("Error generating financial insights:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate financial insights",
      error: error.message,
    });
  }
};

// Helper function to generate fallback insights
const generateFallbackInsights = (expenses) => {
  const insights = [];
  if (!expenses || expenses.length === 0) return insights;

  // Special case for very few expenses (1-3)
  if (expenses.length <= 3) {
    // Focus on providing helpful tips rather than analytics
    const recentExpense = expenses[0]; // Most recent expense

    // Provide category-specific advice
    if (recentExpense.category) {
      const category = recentExpense.category.toLowerCase();

      // Shopping/clothing specific tips
      if (
        category.includes("shopping") ||
        category.includes("clothing") ||
        category.includes("footwear")
      ) {
        insights.push({
          type: "suggestion",
          title: "Shopping Smart",
          description: `For purchases like ${recentExpense.description}, consider using the 24-hour rule: wait 24 hours before buying non-essential items to avoid impulse spending.`,
          priority: 1,
        });
      }

      // Food/grocery specific tips
      else if (category.includes("food") || category.includes("grocery")) {
        insights.push({
          type: "saving",
          title: "Food Budget Tips",
          description:
            "Create a weekly meal plan before grocery shopping. This can reduce food waste and prevent impulse purchases.",
          priority: 1,
        });
      }

      // Transportation specific tips
      else if (category.includes("transport") || category.includes("fuel")) {
        insights.push({
          type: "saving",
          title: "Transportation Savings",
          description:
            "Consider using public transport or carpooling options when possible to reduce your transportation expenses.",
          priority: 1,
        });
      }

      // Bills/utilities specific tips
      else if (category.includes("bill") || category.includes("utility")) {
        insights.push({
          type: "suggestion",
          title: "Utility Savings",
          description:
            "Review your utility providers annually and compare rates to ensure you are getting the best deal.",
          priority: 1,
        });
      }

      // Entertainment specific tips
      else if (category.includes("entertainment")) {
        insights.push({
          type: "suggestion",
          title: "Entertainment Budget",
          description:
            "Look for free or low-cost entertainment options in your area, like community events, parks, or libraries.",
          priority: 1,
        });
      }

      // General tip based on the amount
      if (recentExpense.amount > 3000) {
        insights.push({
          type: "warning",
          title: "High-Value Purchase",
          description: `For expenses like your ₹${recentExpense.amount} ${recentExpense.description}, consider researching alternatives and comparing prices before making large purchases.`,
          priority: 2,
        });
      }
    }

    return insights.length > 0
      ? insights
      : [
          {
            type: "info",
            title: "Getting Started",
            description:
              "Add more expenses to receive personalized spending insights and recommendations.",
            priority: 1,
          },
        ];
  }

  // Regular analysis for more expenses
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const categorySpending = {};
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Calculate category-wise spending and recent expenses
  let recentExpensesCount = 0;
  expenses.forEach((expense) => {
    // Categorize spending
    categorySpending[expense.category] =
      (categorySpending[expense.category] || 0) + expense.amount;

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
  categories.forEach((category) => {
    const amount = categorySpending[category];
    const percentage = (amount / total) * 100;

    if (percentage > 30) {
      insights.push({
        type: "warning",
        title: `High ${category} Spending`,
        description: `Your ${category} expenses account for ${percentage.toFixed(
          1
        )}% of your total spending. Consider setting a budget for this category.`,
        priority: 1,
      });
    }
  });

  // 2. Spending frequency insights
  if (recentExpensesCount > 20) {
    insights.push({
      type: "info",
      title: "Frequent Transactions",
      description: `You've made ${recentExpensesCount} transactions in the last 30 days. Reviewing recurring expenses might help identify savings opportunities.`,
      priority: 2,
    });
  } else if (recentExpensesCount > 0) {
    // For smaller number of transactions
    insights.push({
      type: "info",
      title: "Transaction Summary",
      description: `You've recorded ${recentExpensesCount} expense(s) in the last 30 days. Regular tracking helps build better spending habits.`,
      priority: 3,
    });
  }

  // 3. High-value transaction insights
  if (avgExpenseAmount > 5000) {
    insights.push({
      type: "saving",
      title: "High-Value Transactions",
      description: `Your average transaction amount is ₹${avgExpenseAmount.toFixed(
        2
      )}. Consider if all these expenses are necessary.`,
      priority: 2,
    });
  }

  // 4. Category diversity insight
  if (totalCategories < 3) {
    insights.push({
      type: "suggestion",
      title: "Diversify Your Spending",
      description: `Your expenses are concentrated in only ${totalCategories} categories. Consider tracking more categories for better insights.`,
      priority: 3,
    });
  }

  // 5. General financial tips (always include at least one)
  const generalTips = [
    {
      type: "suggestion",
      title: "Budgeting Strategy",
      description:
        "Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment.",
      priority: 3,
    },
    {
      type: "suggestion",
      title: "Emergency Fund",
      description:
        "Aim to save 3-6 months worth of living expenses in an emergency fund for financial security.",
      priority: 3,
    },
    {
      type: "suggestion",
      title: "Review Subscriptions",
      description:
        "Regularly review and cancel unused subscriptions to save money.",
      priority: 3,
    },
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
  generateLocalAIInsights,
  getDashboardData,
  updateExpense,
  getFinancialInsights,
};
