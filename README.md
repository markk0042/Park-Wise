# Park Wise - Parking Management System

A full-stack parking management application built with React, Express.js, and Supabase. This system allows administrators to manage vehicle registrations, track parking logs, generate reports, and handle non-compliance complaints.

## 🏗️ Architecture

- **Frontend**: React + Vite (deployed on Vercel)
- **Backend**: Express.js API (deployed on Render)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (Magic Links)
- **Storage**: Supabase Storage (for complaint evidence)

## 🌐 Production URLs

- **Frontend**: https://park-wise-two.vercel.app
- **Backend API**: https://parkinglog-backend.onrender.com/api
- **Supabase Project**: https://fztysfsuvepkfhtanxhr.supabase.co
- **GitHub Repository**: https://github.com/markk0042/Park-Wise

## 📋 Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- Git

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/markk0042/Park-Wise.git
cd Park-Wise
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your local values:
```env
VITE_SUPABASE_URL=https://fztysfsuvepkfhtanxhr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:4000/api
```

```bash
# Start development server
npm run dev
```

Frontend will be available at: http://localhost:5173

### 3. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `server/.env`:
```env
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://fztysfsuvepkfhtanxhr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_STORAGE_BUCKET=complaint-evidence
CORS_ORIGIN=http://localhost:5173,https://park-wise-two.vercel.app
```

```bash
# Start development server
npm run dev
```

Backend will be available at: http://localhost:4000

### 4. Database Setup

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/fztysfsuvepkfhtanxhr
2. Navigate to **SQL Editor**
3. Open `server/migrations/001_init.sql`
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute

This creates the following tables:
- `profiles` - User profiles with roles and status
- `vehicles` - Vehicle registration database
- `parking_logs` - Daily parking observations
- `complaints` - Non-compliance reports

### 5. Storage Bucket Setup

1. In Supabase Dashboard, go to **Storage**
2. Click **Create bucket**
3. Name: `complaint-evidence`
4. Set to **Public** (or configure signed URLs if preferred)
5. Click **Create**

### 6. Authentication Configuration

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://park-wise-two.vercel.app`
3. Add **Redirect URLs**:
   - `https://park-wise-two.vercel.app`
   - `https://park-wise-two.vercel.app/**`
   - `http://localhost:5173/**` (for local development)
4. Go to **Authentication** → **Email Templates** → **Magic Link**
5. Update the template body to:
   ```html
   <h2>Magic Link</h2>
   <p>Follow this link to login:</p>
   <p><a href="https://fztysfsuvepkfhtanxhr.supabase.co/auth/v1/verify?token={{ .TokenHash }}&type=magiclink&redirect_to=https://park-wise-two.vercel.app">Log In</a></p>
   ```

## 🔐 Environment Variables

### Frontend (`.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://fztysfsuvepkfhtanxhr.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |
| `VITE_API_URL` | Backend API URL | `http://localhost:4000/api` (local) or `https://parkinglog-backend.onrender.com/api` (production) |

### Backend (`server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `4000` |
| `SUPABASE_URL` | Supabase project URL | `https://fztysfsuvepkfhtanxhr.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret!) | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name | `complaint-evidence` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:5173,https://park-wise-two.vercel.app` |

## 📦 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (production backend URL)
7. Click **Deploy**

### Backend (Render)

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Click **New** → **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Name**: `parkinglog-backend`
   - **Root Directory**: `.` (repo root)
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node
6. Add Environment Variables (from `server/.env`)
7. Click **Create Web Service**

## 🔑 Getting Supabase Credentials

1. Go to https://supabase.com/dashboard/project/fztysfsuvepkfhtanxhr
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (backend only, keep secret!)

## 👤 User Roles

- **User** (`role: 'user'`, `status: 'pending'`): Basic access, pending approval
- **User** (`role: 'user'`, `status: 'active'`): Can log parking entries
- **Admin** (`role: 'admin'`): Full access to all features

### Promoting to Admin

1. Sign in to the app
2. Navigate to the **Admin Setup** page
3. Update your profile to set `role: 'admin'`

## 📡 API Endpoints

All API endpoints are prefixed with `/api`:

### Authentication
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update own profile
- `GET /api/auth/users` - List all users (admin only)
- `PATCH /api/auth/users/:id` - Update user (admin only)

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Create vehicle (admin only)
- `PATCH /api/vehicles/:id` - Update vehicle (admin only)
- `DELETE /api/vehicles/:id` - Delete vehicle (admin only)
- `POST /api/vehicles/bulk` - Bulk upload vehicles (admin only)

### Parking Logs
- `GET /api/parking-logs` - List parking logs (with filters)
- `POST /api/parking-logs` - Create parking log entry
- `DELETE /api/parking-logs/:id` - Delete log entry

### Complaints
- `GET /api/complaints` - List complaints
- `POST /api/complaints` - Create complaint
- `PATCH /api/complaints/:id` - Update complaint
- `DELETE /api/complaints/:id` - Delete complaint

### Uploads
- `POST /api/uploads` - Upload file to Supabase Storage

### Reports
- `GET /api/reports/summary` - Get summary statistics

See `server/README.md` for detailed API documentation.

## 🛠️ Development Workflow

1. Start the backend:
   ```bash
   cd server
   npm run dev
   ```

2. Start the frontend (in a new terminal):
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

4. Sign in with your email (magic link will be sent)

5. Promote yourself to admin via the Admin Setup page

## 📝 Features

- ✅ User authentication with magic links
- ✅ Vehicle registration database
- ✅ Parking log entries with date/time tracking
- ✅ Bulk vehicle upload via CSV
- ✅ Non-compliance complaint system
- ✅ Photo evidence uploads
- ✅ Reports and analytics
- ✅ Admin user management
- ✅ Role-based access control

## 🐛 Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` in backend includes your frontend URL
- Check that both frontend and backend are running

### Authentication Issues
- Verify Supabase URL Configuration has correct redirect URLs
- Check that email template uses correct redirect URL
- Ensure environment variables are set correctly

### Database Connection Issues
- Verify Supabase credentials in `server/.env`
- Check that migrations have been run
- Ensure RLS policies are correctly configured

### Build Failures
- Check that all environment variables are set in deployment platform
- Verify Node.js version compatibility
- Check build logs for specific errors

## 📄 License

This project is private and proprietary.

## 👥 Support

For issues or questions, please contact the development team or create an issue in the GitHub repository.

---

**Last Updated**: 2024
**Version**: 1.0.0
