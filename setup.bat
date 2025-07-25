@echo off
echo 🚀 Setting up ATS Resume Optimizer...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if Java is installed
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java is not installed. Please install Java 11+ first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install dependencies
echo 📦 Installing dependencies...

REM Root dependencies
call npm install

REM Frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

echo ✅ Dependencies installed successfully

REM Create environment file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating environment file...
    copy env.example .env
    echo ⚠️  Please update .env with your Gemini API key
)

REM Create upload directories
echo 📁 Creating upload directories...
if not exist "backend\uploads" mkdir backend\uploads
if not exist "frontend\public" mkdir frontend\public

echo ✅ Setup completed successfully!
echo.
echo 🎯 Next steps:
echo 1. Update .env with your Gemini API key
echo 2. Run 'npm run dev' to start all services
echo 3. Open http://localhost:5173 in your browser
echo.
echo 📚 For more information, see README.md
pause 