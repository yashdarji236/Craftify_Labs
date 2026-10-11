# Craftify Labs - No-Code Website Builder

A modern, high-performance visual website builder where users design responsive websites, configure fluid animations and smooth scrolling, preview across screen sizes, and export runnable React + Vite project archives.

---

## Documentation

Comprehensive architecture, testing, and multi-tenant security plans:
- [Architecture & Tech Stack Documentation](file:///d:/Ai-web-builder/docs/ARCHITECTURE.md)
- [Document Model Specification](file:///d:/Ai-web-builder/docs/DOCUMENT_MODEL.md)
- [Visual Editor Architecture (Phase 2)](file:///d:/Ai-web-builder/docs/EDITOR.md)
- [Authentication Smoke Test Matrix](file:///d:/Ai-web-builder/docs/AUTH_SMOKE_TEST.md)
- [Project Ownership & Authorization Plan](file:///d:/Ai-web-builder/docs/OWNERSHIP_PLAN.md)

---

## Prerequisites

- **Node.js**: `v20.x` or higher (tested with `v24.11.1`)
- **npm**: `v10.x` or higher (tested with `v11.6.2`)
- **MongoDB**: MongoDB Atlas cluster URI or local MongoDB instance (`v6.0+`)

---

## Repository Structure

```
d:/Ai-web-builder/
├── Backend/      # Node.js + Express 5 + MongoDB / Mongoose REST API
├── Frontend/     # React 19 + Vite 7 + Tailwind CSS v4 Single Page App
└── docs/         # System architecture, test matrix, and ownership plans
```

---

## Environment Setup

### 1. Backend Configuration
Copy the template configuration in `Backend/`:
```bash
cp Backend/.env.example Backend/.env
```

Configure your environment variables in `Backend/.env`:
```env
PORT=3000
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/craftify_db?retryWrites=true&w=majority
JWT=your_secure_random_64_character_hex_secret
```

### 2. Frontend Configuration
Copy the template configuration in `Frontend/`:
```bash
cp Frontend/.env.example Frontend/.env
```

Configure `Frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

---

## Installation

Install dependencies separately in both `Backend` and `Frontend` directories:

```bash
# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../Frontend
npm install
```

---

## Running in Development

Run both the Backend and Frontend development servers in separate terminal sessions:

### Terminal 1: Backend API
```bash
cd Backend
npm run dev
```
*Backend runs on `http://localhost:3000` with native ESM hot reload (`node --watch server.js`).*

### Terminal 2: Frontend Client
```bash
cd Frontend
npm run dev
```
*Frontend runs on `http://localhost:5173` via Vite.*

---

## Building for Production

### Frontend Production Build
```bash
cd Frontend
npm run build
```
Build output is generated in `Frontend/dist/`. To preview the production bundle:
```bash
npm run preview
```

### Backend Production Execution
```bash
cd Backend
npm start
```

---

## Testing & Verification

### Unit & Integration Test Suite
Run the full builder and editor command test suite:
```bash
cd Frontend
npm test
```
*Executes all 21 unit tests covering model validation, tree operations, commands, URL sanitization, and undo/redo stacks.*

### Authentication Smoke Tests
Execute the authentication smoke test suite against running backend:
```bash
node -e "
async function test() {
  const res = await fetch('http://localhost:3000/api/health');
  console.log('API Health:', await res.json());
}
test();
"
```
For the complete step-by-step smoke test matrix and manual test instructions, refer to [`docs/AUTH_SMOKE_TEST.md`](file:///d:/Ai-web-builder/docs/AUTH_SMOKE_TEST.md).
