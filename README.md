# ResuPrompt - AI-Powered CV Optimization Tool

A comprehensive CV optimization application that uses AI to analyze job descriptions and optimize CVs for better ATS (Applicant Tracking System) compatibility.

## 🚀 Features

### Core Functionality
- **CV Upload & Analysis**: Upload DOCX files and extract text for analysis
- **Job Description Analysis**: AI-powered analysis of job descriptions to extract keywords and requirements
- **CV Optimization**: AI-driven CV optimization with specific suggestions for improvement
- **Manual Optimization**: Copy prompts and paste AI responses for manual optimization
- **Cover Letter Generation**: Generate personalized cover letters based on CV and job description
- **Document Generation**: Generate optimized DOCX files with applied changes
- **Settings Persistence**: User settings are automatically saved and restored

### Advanced Features
- **Network Access**: Access the application from other devices on the same network
- **Modern UI**: Beautiful, responsive interface with ocean blue theme
- **Real-time Progress**: Progress indicators for optimization and generation processes
- **File Management**: Automatic file organization with company-based folders
- **Health Monitoring**: Service health checks and status monitoring
- **Background Processing**: Run services in background with easy control

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **React Dropzone** for file uploads

### Backend
- **Node.js** with Express.js
- **Multer** for file uploads
- **Axios** for HTTP requests
- **Google Gemini API** for AI processing

### Document Service
- **Java Spring Boot**
- **Apache POI** for DOCX manipulation
- **PDFBox** for PDF generation

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Java** (JDK 11 or higher)
- **Gradle** (for Java service)
- **Google Gemini API Key**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ats-resume-optimizer
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the backend directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
RESUME_FOLDER=C:\path\to\resume\folder
```

### 4. Start All Services

#### Option A: Background Services (Recommended)
```bash
# Windows
start-background.bat

# Linux/Mac
./start-background.sh
```

#### Option B: Network Access
```bash
# Windows
start-network.bat

# Linux/Mac
./start-network.sh
```

#### Option C: Manual Start
```bash
# Terminal 1: Document Service
cd doc-service
gradle bootRun

# Terminal 2: Backend
cd backend
npm start

# Terminal 3: Frontend
cd frontend
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Document Service**: http://localhost:8080

## 📁 Project Structure

```
ats-resume-optimizer/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   └── main.tsx        # Entry point
│   └── package.json
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   └── package.json
├── doc-service/             # Java document service
│   └── src/main/java/
├── prompts/                 # AI prompt templates
├── scripts/                 # Utility scripts
└── start-*.bat             # Startup scripts
```

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini API key
- `RESUME_FOLDER`: Default folder for saving generated files
- `DOC_SERVICE_URL`: Document service URL (default: http://localhost:8080)

### Settings
The application automatically saves user settings including:
- User name
- Resume folder path
- API hit limits and usage
- UI preferences

## 🎯 Usage

### 1. Upload CV
- Go to the "Master Data" tab
- Upload your CV in DOCX format
- Optionally upload a cover letter template

### 2. Add Job Description
- Go to the "Job Description" tab
- Paste or type the job description
- Click "Analyze" to extract key information

### 3. Optimize CV
- Go to the "Generate CV" tab
- Click "Optimize with AI" for automatic optimization
- Or use "Manual Optimization" to copy prompts and paste responses
- Review and accept/reject suggested changes

### 4. Generate Cover Letter (Optional)
- Expand the "Generate Cover Letter" section
- Choose style and tone
- Click "Auto Generate" or "Manual Generate"
- Edit the generated cover letter if needed

### 5. Generate Files
- Click "Generate Optimized CV" to create the final files
- Files are automatically saved to organized folders

## 🔍 API Endpoints

### Backend Routes
- `POST /api/optimize/optimize-cv` - Optimize CV
- `POST /api/optimize/analyze-jd` - Analyze job description
- `POST /api/optimize/generate-cover-letter` - Generate cover letter
- `POST /api/document/generate-docx` - Generate optimized DOCX
- `POST /api/document/generate-cover-letter-docx` - Generate cover letter DOCX

### Document Service Routes
- `POST /api/document/process` - Process document with edits
- `POST /api/document/export` - Export to PDF
- `GET /api/document/health` - Health check

## 🎨 UI Features

### Modern Design
- Ocean blue gradient theme
- Responsive design for all devices
- Smooth animations and transitions
- Professional typography

### User Experience
- Real-time progress indicators
- Toast notifications for feedback
- Collapsible sections
- File preview and management
- Settings persistence

## 🔧 Development

### Running in Development Mode
```bash
# Frontend (with hot reload)
cd frontend
npm run dev

# Backend (with nodemon)
cd backend
npm run dev

# Document Service
cd doc-service
gradle bootRun
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## 🚀 Deployment

### Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Build the frontend: `cd frontend && npm run build`
2. Set up environment variables
3. Start the backend: `cd backend && npm start`
4. Start the document service: `cd doc-service && gradle bootRun`

## 📊 Monitoring

### Health Checks
- Frontend: http://localhost:5173
- Backend: http://localhost:3001/api/health
- Document Service: http://localhost:8080/health

### Logs
- Frontend logs: Check browser console
- Backend logs: Check terminal or log files
- Document service logs: Check application logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in the `scripts/` folder
- Review the network access guide in `scripts/NETWORK_ACCESS.md`
- Open an issue on GitHub

## 🔄 Updates

The application automatically:
- Saves user settings
- Persists chat history
- Maintains optimization results
- Remembers file paths and preferences

---

**ResuPrompt** - Making CV optimization smarter and more efficient with AI! 🚀 