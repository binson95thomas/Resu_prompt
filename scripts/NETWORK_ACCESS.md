# 🌐 Network Access Guide for ResuPrompt

This guide explains how to access ResuPrompt from other PCs on the same network.

## 🚀 Quick Setup

### 1. Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (usually starts with 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

### 2. Start All Services with Network Access

**Easy Method - Use the startup scripts:**

**Windows:**
```bash
start-network.bat
```
This will open each service in separate terminal tabs/windows.

**Linux/Mac:**
```bash
chmod +x start-network.sh
./start-network.sh
```
This will open each service in separate terminal tabs.

**Manual Method - Start each service separately:**

**Document Service (Java Spring Boot):**
```bash
cd doc-service
./gradlew bootRun
```
- Document Service will be available at: `http://[YOUR_IP]:8080`
- Example: `http://192.168.1.100:8080`

**Backend (Node.js):**
```bash
cd backend
npm start
```
- Backend will be available at: `http://[YOUR_IP]:3001`
- Example: `http://192.168.1.100:3001`

**Frontend (Vite):**
```bash
cd frontend
npm run dev
```
- Frontend will be available at: `http://[YOUR_IP]:5173`
- Example: `http://192.168.1.100:5173`

### 3. Access from Other PCs

**From any PC on the same network:**
- Open browser and go to: `http://[YOUR_IP]:5173`
- Example: `http://192.168.1.100:5173`

## 🔧 Configuration Details

### Frontend Configuration (vite.config.ts)
```typescript
server: {
  port: 5173,
  host: '0.0.0.0',  // Makes it accessible on network
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

### Backend Configuration (index.js)
```javascript
app.listen(PORT, '0.0.0.0', () => {
  // Listens on all network interfaces
})
```

### Document Service Configuration (application.yml)
```yaml
server:
  port: 8080
  address: 0.0.0.0  # Listens on all network interfaces
```

## 🖥️ Terminal Tab Support

The startup scripts create a single window with multiple tabs:

**Windows:**
- **Windows Terminal** (recommended): Single window with 3 colored tabs
- **Command Prompt**: Falls back to separate windows

**Linux:**
- **GNOME Terminal**: Single window with 3 tabs
- **KDE Konsole**: Single window with 3 tabs
- **XFCE Terminal**: Single window with 3 tabs
- **Fallback**: Uses background processes

**macOS:**
- **Terminal.app**: Uses separate windows (macOS Terminal doesn't support command-line tabs)
- **iTerm2**: Can be configured for tabs

**Tab Configuration:**
- **Document Service**: Blue tab, title "Document Service"
- **Backend**: Green tab, title "Backend"
- **Frontend**: Orange tab, title "Frontend"

**Features:**
- Single window with multiple tabs for easy management
- Color-coded tabs for quick visual identification
- Proper working directory for each service
- Health check URLs displayed after startup
- Window title: "ResuPrompt Services"

## 🔍 Troubleshooting

### 1. Can't Access from Other PC

**Check Firewall:**
- Windows: Allow Node.js, npm, and Java through firewall
- Mac: System Preferences → Security & Privacy → Firewall
- Linux: `sudo ufw allow 5173`, `sudo ufw allow 3001`, and `sudo ufw allow 8080`

**Check Antivirus:**
- Some antivirus software blocks network access
- Add exceptions for Node.js and your project folder

### 2. API Calls Not Working

**Check Backend Health:**
- Visit: `http://[YOUR_IP]:3001/api/health`
- Should return: `{"status":"OK","service":"ResuPrompt Backend"}`

**Check Document Service Health:**
- Visit: `http://[YOUR_IP]:8080/health`
- Should return: `{"status":"OK","service":"ResuPrompt Document Service"}`

**Check Network Connectivity:**
```bash
# From other PC, test if ports are reachable
telnet [YOUR_IP] 5173
telnet [YOUR_IP] 3001
telnet [YOUR_IP] 8080
```

### 3. CORS Issues

The backend is configured to accept requests from any origin in development:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
```

## 🌍 Production Deployment

For production, you might want to:

1. **Use a reverse proxy** (nginx, Apache)
2. **Set up proper CORS** for your domain
3. **Use HTTPS** for security
4. **Configure environment variables** for different environments

## 📱 Mobile Access

The app is also accessible from mobile devices on the same network:
- Open browser on phone
- Go to: `http://[YOUR_IP]:5173`
- The responsive design will work on mobile

## 🔒 Security Notes

- This setup is for **local network access only**
- Don't expose these ports to the internet without proper security
- Use VPN if accessing over the internet
- Consider using HTTPS in production

## 🛠️ Development Tips

### Auto-restart on Network Changes
```bash
# Install nodemon for backend auto-restart
npm install -g nodemon
cd backend
nodemon src/index.js
```

### Check Network Status
```bash
# Check if ports are listening
netstat -an | grep :5173
netstat -an | grep :3001
netstat -an | grep :8080
```

### Debug Network Issues
```bash
# Test API endpoints
curl http://[YOUR_IP]:3001/api/health
curl http://[YOUR_IP]:8080/health
curl http://[YOUR_IP]:5173
```

## 📞 Support

If you're still having issues:

1. **Check console logs** in both frontend and backend
2. **Verify IP address** is correct
3. **Test with different browsers**
4. **Check network connectivity** between devices
5. **Restart both servers** after configuration changes

---

**Happy networking! 🌐✨** 