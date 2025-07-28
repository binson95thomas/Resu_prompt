#!/bin/bash

echo "🚀 Setting up ResuPrompt..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 11+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."

# Root dependencies
npm install

# Frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo "✅ Dependencies installed successfully"

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "⚠️  Please update .env with your Gemini API key"
fi

# Create upload directories
echo "📁 Creating upload directories..."
mkdir -p backend/uploads
mkdir -p frontend/public

echo "✅ Setup completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env with your Gemini API key"
echo "2. Run 'npm run dev' to start all services"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "📚 For more information, see README.md" 