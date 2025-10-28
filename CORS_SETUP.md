# CORS Configuration Guide

## 🔧 Backend CORS Setup

The backend is now configured to handle CORS properly for both local development and production deployments.

### ✅ What Was Fixed:

1. **Dynamic Origin Handling**: Backend now accepts requests from multiple origins
2. **Credentials Support**: Cookies and authorization headers are properly handled
3. **Preflight Requests**: OPTIONS requests are handled correctly
4. **Environment Variables**: Uses `FRONTEND_URL` for flexible configuration

### 🌐 Allowed Origins:

The backend allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative React dev server)
- `http://localhost:5000` (Backend local)
- `process.env.FRONTEND_URL` (Environment variable)
- Your production Vercel frontend URL (add to server.js)

### 📝 Configuration Steps:

#### **Step 1: Update Local Environment (.env)**

```env
FRONTEND_URL="http://localhost:5173"
```

#### **Step 2: Add Vercel Environment Variables**

Go to your Vercel backend project dashboard:
1. Settings → Environment Variables
2. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | All |
| `JWT_SECRET` | `your_secret_key` | All |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Production |
| `FRONTEND_URL` | `http://localhost:5173` | Development |

#### **Step 3: Update Frontend URL in server.js**

Replace this line in `server.js`:
```javascript
'https://farmconnect-frontend.vercel.app', // Replace with your actual frontend domain
```

With your actual Vercel frontend URL (check your Vercel frontend dashboard for the URL).

### 🚀 Testing:

#### Local Testing:
```bash
# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev
```

#### Test CORS:
```bash
# Test backend health
curl https://farmconnect-backend-fwscpwk5i-231fa04331s-projects.vercel.app/api/test

# Test with origin header
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://farmconnect-backend-fwscpwk5i-231fa04331s-projects.vercel.app/api/auth/login
```

### 🔍 Troubleshooting:

#### Issue: "Not allowed by CORS"
**Solution**: Check that your frontend URL is in the `allowedOrigins` array and set in Vercel environment variables.

#### Issue: Credentials not working
**Solution**: Ensure `credentials: true` in both backend CORS config and frontend axios/fetch requests:
```javascript
// Frontend example
axios.post('https://backend.vercel.app/api/auth/login', data, {
  withCredentials: true
});
```

#### Issue: OPTIONS preflight failing
**Solution**: The backend now handles OPTIONS requests automatically. Make sure Vercel deployment is complete.

### 📦 Files Modified:

1. ✅ `backend/server.js` - Updated CORS configuration
2. ✅ `backend/vercel.json` - Added CORS headers and methods
3. ✅ `backend/.env` - Added FRONTEND_URL variable
4. ✅ `backend/.env.example` - Template for environment variables

### 🎯 CORS Headers Set:

- `Access-Control-Allow-Origin`: Dynamic based on request origin
- `Access-Control-Allow-Credentials`: true
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, PATCH, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization, X-Requested-With
- `Access-Control-Max-Age`: 86400 (24 hours)

### ⚠️ Important Notes:

1. **Always set `FRONTEND_URL` in Vercel environment variables** for production
2. **Redeploy backend after updating environment variables** in Vercel
3. **Update the hardcoded frontend URL** in `server.js` with your actual domain
4. **Never commit `.env`** file to git (already in .gitignore)

### 🔐 Security Best Practices:

- ✅ Only allow trusted origins
- ✅ Use strong JWT secrets
- ✅ Enable credentials only when needed
- ✅ Use HTTPS in production
- ✅ Keep environment variables secure

---

## 🎉 Your CORS is now properly configured!

Both local development and production deployments will work correctly.
