# 🔍 CodeLens — AI-Powered Code Explainer

> Paste any code, script, config, or query — get a deep, beginner-friendly explanation instantly.

![CodeLens](https://img.shields.io/badge/CodeLens-AI%20Code%20Explainer-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10+-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ What is CodeLens?

**CodeLens** is a full-stack AI-powered web app that explains any code from absolute beginner level. Just paste your code — JavaScript, Python, SQL, YAML, Dockerfile, config files, anything — and get a deep, structured explanation with:

- 📌 Line-by-line / block-by-block breakdown
- ⚙️ Deep internal working explained simply
- 🔁 Data flow & execution flow diagrams (ASCII)
- 📝 Revision notes for quick review
- 🕓 History of all your past explanations

---

## 🖥️ Live Demo

> 🔗 [codelens.vercel.app](https://codelens.vercel.app) *(replace with your actual URL)*

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, Uvicorn |
| AI Provider | Groq API (llama-3.3-70b-versatile) |
| Database | MongoDB Atlas |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## 🚀 Features

- ✅ Supports **any language** — JS, Python, SQL, YAML, Dockerfile, JSON, etc.
- ✅ **Deep explanations** — not just surface level definitions
- ✅ **ASCII diagrams** for execution flow & data flow
- ✅ **Revision notes** at the end of every explanation
- ✅ **History** — all past explanations saved and accessible
- ✅ **Copy** explanation to clipboard
- ✅ Works on **mobile & desktop**
- ✅ **Fast** — powered by Groq's ultra-fast inference

---

## 📁 Project Structure

```
codelens/
├── backend/                  # FastAPI Python backend
│   ├── server.py             # Main API server
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment variables (not committed)
│   └── .env.example          # Example env file
│
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   └── Explainer.jsx # Main explainer component
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   ├── .env                  # Frontend env variables
│   └── package.json
│
├── docker-compose.yml        # Local Docker setup
└── README.md
```

---

## ⚙️ Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/codelens.git
cd codelens
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
# AI Provider (Groq - Free)
LLM_PROVIDER="openai"
OPENAI_API_KEY="your_groq_api_key"
OPENAI_BASE_URL="https://api.groq.com/openai/v1"
LLM_MODEL="llama-3.3-70b-versatile"

# MongoDB (optional - for history)
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/"
DB_NAME="code_explainer"

# CORS
CORS_ORIGINS="http://localhost:3000,http://localhost:5000"
```

Start the backend:
```bash
uvicorn server:app --reload --port 8001
```

### 3. Frontend Setup
```bash
cd frontend
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Install and run:
```bash
npm install
npm start
```

App runs at `http://localhost:3000` ✅

---

## 🌐 Deployment

### Backend → Render
1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `backend/.env`

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect your GitHub repo
3. Set:
   - **Root Directory:** `frontend`
   - **Framework:** Create React App
4. Add environment variable:
   - `REACT_APP_BACKEND_URL` = your Render backend URL

---

## 🔑 Environment Variables

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| `LLM_PROVIDER` | AI provider (`openai` or `gemini`) | ✅ |
| `OPENAI_API_KEY` | Groq API key | ✅ |
| `OPENAI_BASE_URL` | Groq base URL | ✅ |
| `LLM_MODEL` | Model name | ✅ |
| `MONGO_URL` | MongoDB Atlas connection string | Optional |
| `DB_NAME` | MongoDB database name | Optional |
| `CORS_ORIGINS` | Allowed frontend origins | ✅ |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_BACKEND_URL` | Backend API URL | ✅ |

---

## 🆓 Free Services Used

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Groq](https://console.groq.com) | AI inference | 6000 req/day |
| [MongoDB Atlas](https://mongodb.com/atlas) | Database | 512MB forever |
| [Render](https://render.com) | Backend hosting | 750 hrs/month |
| [Vercel](https://vercel.com) | Frontend hosting | Unlimited |

**Total cost: $0** 🎉

---

## 📸 Screenshots

> *(Add your screenshots here)*

---

## 🤝 Contributing

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [yourprofile](https://linkedin.com/in/yourprofile)

---

> Built with ❤️ to make code understandable for everyone.