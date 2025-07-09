import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ExpenseForm.css';

const ExpenseForm = () => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Basic validation
    if (!description || !amount || !category || !date || !paymentMethod) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      // Get Firebase token for authentication
      const token = await currentUser.getIdToken();

      const expenseData = {
        description,
        amount: parseFloat(amount),
        category,
        subcategory: subcategory || 'General',
        date: new Date(date).toISOString(),
        paymentMethod,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        userId: currentUser.uid
      };

      console.log('Sending expense data:', expenseData);

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/expenses`, expenseData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Expense creation response:', response.data);

      // Reset form
      setDescription('');
      setAmount('');
      setCategory('');
      setSubcategory('');
      setDate('');
      setPaymentMethod('');
      setTags('');
      setSuccess('Expense added successfully!');

      // Trigger a refresh of the expenses list if needed
      // You might want to implement this using a callback or context
    } catch (err) {
      console.error('Expense submission error:', err);
      setError(err.response?.data?.message || 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Categories for dropdown
  const categories = [
    'Food', 'Transportation', 'Housing', 'Utilities', 
    'Insurance', 'Healthcare', 'Savings', 'Personal', 'Entertainment'
  ];

  const subcategories = {
    'Food': ['Groceries', 'Restaurants', 'Takeout', 'Snacks'],
    'Transportation': ['Public Transit', 'Fuel', 'Parking', 'Maintenance'],
    'Housing': ['Rent', 'Mortgage', 'Utilities', 'Maintenance'],
    'Utilities': ['Electricity', 'Water', 'Internet', 'Phone'],
    'Entertainment': ['Movies', 'Concerts', 'Streaming', 'Games']
  };

  const paymentMethods = [
    'Cash', 'Credit Card', 'Debit Card', 
    'Bank Transfer', 'Digital Wallet', 'Other'
  ];

  return (
    <div className="expense-form-container">
      <form onSubmit={handleSubmit} className="expense-form">
        <h2>Add New Expense</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter expense description"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (₹) *</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory(''); // Reset subcategory when category changes
            }}
            required
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {category && subcategories[category] && (
          <div className="form-group">
            <label htmlFor="subcategory">Subcategory</label>
            <select
              id="subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            >
              <option value="">Select Subcategory</option>
              {subcategories[category].map(subcat => (
                <option key={subcat} value={subcat}>{subcat}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="paymentMethod">Payment Method *</label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
          >
            <option value="">Select Payment Method</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Enter tags (e.g., groceries, weekly)"
          />
        </div>

        <button 
          type="submit" 
          className="btn-submit"
          disabled={loading}
        >
          {loading ? 'Adding Expense...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
