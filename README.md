# 💸 EXPENSO - Smart Expense Tracker

Expenso is a modern expense tracking web application with a beautiful glassmorphism UI design, built using the MERN stack (MongoDB, Express, React, Node.js). It helps users track and manage their expenses with smart insights and analytics.

**LIVE SITE** : [https://expenso-9g2i.onrender.com](https://expenso-9g2i.onrender.com)

## ✨ Features

- **User Authentication**: Secure login via Google Authentication
- **Expense Management**: Add, edit, and delete expenses with detailed information
- **Expense Filtering**: Filter expenses by category, payment method, and amount range
- **Smart Insights**: Get personalized financial insights based on spending patterns
- **Visual Analytics**: View spending distribution with interactive charts
- **Financial Guide**: Receive tailored suggestions to improve spending habits
- **Responsive Design**: Beautiful glassmorphic UI that works on desktop and mobile

## 📋 Tech Stack

### Frontend

- React.js
- React Router for navigation
- Context API for state management
- Chart.js for visualizations
- CSS with glassmorphism design elements
- Firebase Authentication

### Backend

- Node.js with Express
- MongoDB for database
- Firebase Admin for authentication validation
- RESTful API architecture

## 🚀 Getting Started

### Prerequisites

- Node.js (v14.x or higher)
- MongoDB (local or Atlas connection)
- Firebase project (for authentication)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/expenso-expense-tracker.git
   cd expenso-expense-tracker
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   ```
3. **Create a `.env` file in the backend folder with the following variables:**

   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   NODE_ENV=development
   ```

4. **Set up Firebase Admin credentials:**

   - Create a `firebaseAdminConfig.js` file in `backend/src/config/` with your Firebase Admin SDK credentials

5. **Set up the frontend**

   ```bash
   cd ../frontend
   npm install
   ```

6. **Create a `.env` file in the frontend folder with the following variables:**
   ```
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
   ```

### Running the Application

1. **Start the backend server:**

   ```bash
   cd backend
   npm start
   ```

   The server will run on http://localhost:5000

2. **Start the frontend development server:**
   ```bash
   cd frontend
   npm start
   ```
   The application will open in your browser at http://localhost:3000

## 📱 Usage

1. **Authentication**

   - Sign in with your Google account
   - The app will redirect to the dashboard

2. **Dashboard**

   - View summary of expenses, including total and monthly spending
   - See category breakdown and spending trends
   - Check recent expenses at a glance

3. **Managing Expenses**

   - Add a new expense with details (amount, category, payment method, date)
   - Edit existing expenses by clicking the edit (✏️) icon
   - Delete expenses with the delete (🗑️) icon
   - Filter expenses by various criteria

4. **Financial Insights**
   - Review personalized spending insights
   - Check financial health assessment based on spending patterns
   - Get recommendations to improve financial habits

## 💻 Project Structure

```
expenso-expense-tracker/
├── backend/
│   ├── index.js                   # Entry point for the server
│   ├── package.json               # Backend dependencies
│   └── src/
│       ├── config/                # Configuration files
│       ├── controllers/           # Request handlers
│       ├── middleware/            # Custom middleware
│       ├── models/                # Database models
│       └── routes/                # API routes
│
└── frontend/
    ├── public/                    # Static files
    ├── package.json               # Frontend dependencies
    └── src/
        ├── components/            # React components
        ├── contexts/              # Context providers
        ├── styles/                # CSS styles
        ├── utils/                 # Utility functions
        ├── App.js                 # Main app component
        └── index.js               # Entry point
```

## 📝 Future Enhancements

- Budget planning and tracking
- Recurring expense management
- Expense categorization using machine learning
- Multiple currency support
- Dark/Light theme toggle
- Export reports as PDF/CSV
- Mobile app versions

## 🔒 Security

This application implements several security best practices:

- Firebase Authentication for secure user authentication
- JWT for API authorization
- User-specific data isolation
- Input validation and sanitization
- Environment variable protection for sensitive credentials

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Created with ❤️ by Ganesh E

## 🙏 Acknowledgments

- Firebase for authentication services
- Chart.js for beautiful visualizations
- MongoDB Atlas for database hosting
