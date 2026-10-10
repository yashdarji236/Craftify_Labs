# Project Ownership & Authorization Architecture Plan

## 1. Current Authenticated Identity Extraction

The backend already contains an authentication middleware capable of verifying identity and attaching the authenticated user model to incoming HTTP requests.

- **File Path**: `Backend/middleware/authMiddleware.js`
- **Function Name**: `protect`
- **Implementation Mechanism**:
  ```javascript
  // Backend/middleware/authMiddleware.js
  export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // ... validation ...
    const secret = process.env.JWT || process.env.JWT_SECRET || 'craftify_fallback_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
    }
    next();
  };
  ```

### Identity Stability & Uniqueness
1. **Uniqueness**: `req.user._id` is a MongoDB `ObjectId` generated during account creation (`User.create`). It is globally unique across the database.
2. **Stability**: The user's `_id` is immutable once inserted into the MongoDB `users` collection.
3. **Availability**: In every route wrapped with `protect`, `req.user` is guaranteed to be present and populated before the controller handler executes. `req.user._id` (or `req.user._id.toString()`) represents the trusted server-verified identity.

---

## 2. Future `Project` Entity Ownership Schema

When creating the `Project` model in Phase 1, each project document MUST link to `ownerId`:

```javascript
// Planned Project Schema Reference (DO NOT CREATE YET)
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project must belong to a user'],
      index: true, // Indexed for fast owner-scoped queries
    },
    document: {
      type: Object, // Structured AST / JSON document tree for no-code builder
      default: {},
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index to guarantee unique project names per owner
projectSchema.index({ ownerId: 1, name: 1 });
```

---

## 3. Enforcement Strategy on Every Operation

Under no circumstances should the backend trust an `ownerId` or `userId` supplied in the request body, URL query parameters, or route headers. The trusted identity MUST ALWAYS come strictly from `req.user._id`.

### Read Operations (List & Detail)
- **List All Projects (`GET /api/projects`)**:
  ```javascript
  // ALWAYS scope search query by ownerId
  const projects = await Project.find({ ownerId: req.user._id }).sort({ updatedAt: -1 });
  ```
- **Get Single Project (`GET /api/projects/:id`)**:
  ```javascript
  const project = await Project.findOne({
    _id: req.params.id,
    ownerId: req.user._id, // Prevents viewing projects owned by other users
  });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  ```
  *(Returning 404 rather than 403 prevents leaking the existence of other users' projects).*

### Write Operations (Create, Update, Delete)
- **Create Project (`POST /api/projects`)**:
  ```javascript
  const newProject = await Project.create({
    ...req.body,
    ownerId: req.user._id, // Enforced by server; ignores any ownerId in req.body
  });
  ```
- **Update Project (`PUT /api/projects/:id` / `PATCH /api/projects/:id`)**:
  ```javascript
  const updatedProject = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id }, // Atomic owner-scoped filter
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updatedProject) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  ```
- **Delete Project (`DELETE /api/projects/:id`)**:
  ```javascript
  const deleted = await Project.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user._id,
  });
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  ```

---

## 4. Local-Only / Offline Fallback (IndexedDB)

While Craftify Labs features a dedicated Express + MongoDB backend, any future offline-first or demo mode where a user builds without an active internet connection should use an **IndexedDB** local store (e.g., via Dexie or idb).

### Browser / Device-Bound Limitations:
- Local projects stored in IndexedDB reside solely within the specific browser instance on that device.
- Clearing browser storage, using Incognito/Private Browsing, or switching devices will not sync local projects.
- Projects created while logged out should prompt an explicit sync/migration endpoint (`POST /api/projects/sync`) upon user authentication.
