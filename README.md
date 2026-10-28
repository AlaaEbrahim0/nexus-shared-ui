# @nexus/shared-ui

Shared UI library for the **Nexus (Mental Mediator)** platform. Contains design tokens, primitive components, community components, and utilities consumed by both the doctor and patient portals.

---

## What's in here

| Path | Contents |
|------|----------|
| `tailwind.config.js` | Canonical design tokens — palette, DaisyUI theme (`nexus`), typography, spacing, shadows |
| `index.css` | Global CSS variables, font import, base resets |
| `src/components/ui/` | Primitives (`Button`, `Card`, `Input`, `Modal`, …), community components (`Post`, `Comment`, `Reply`, …) |
| `src/components/profile/` | `ProfileView`, `CertificateModal`, `QualificationModal`, `profileUtils` |
| `src/hooks/` | `useChatHub` |
| `src/context/` | `NotificationsProvider`, `UserProfileProvider` |
| `src/auth/` | `AuthProvider`, session helpers (`getToken`, `saveSession`, …) |
| `src/api/` | Axios client with JWT interceptor and error helpers |
| `src/utils/` | `convertUtcToRelativeTime` |

---

## How portals install this package

Both portals install this package directly from GitHub — no private registry required, and Vercel builds work without any extra credentials.

```bash
npm install github:AlaaEbrahim0/nexus-shared-ui
```

This adds the following to `package.json`:

```json
"@nexus/shared-ui": "github:AlaaEbrahim0/nexus-shared-ui"
```

---

## How portals consume it

### Design tokens (Tailwind)

The `tailwind.config.js` in each portal **must remain the canonical copy**. To keep tokens in sync, copy `tailwind.config.js` and `index.css` from this repo into the portal whenever they change.

### Components

```jsx
// Primitives
import { Button, Card, Input, Modal, Spinner } from "@nexus/shared-ui/components/ui";

// Community
import { Post, Comment, Reply } from "@nexus/shared-ui/components/ui";

// Profile
import { ProfileView } from "@nexus/shared-ui/components/profile";

// Hooks
import { useChatHub } from "@nexus/shared-ui/hooks";
```

Or import from the root entry (slightly heavier bundle):

```jsx
import { Button, Post, useChatHub } from "@nexus/shared-ui";
```

---

## How to update

### Making a change

1. Edit the source files in this repo.
2. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `chore:`).
3. Push to `master`.

### Consuming the update in a portal

```bash
# In doctor-ui or patient-ui:
npm install github:AlaaEbrahim0/nexus-shared-ui
# Or pin to a specific commit:
npm install github:AlaaEbrahim0/nexus-shared-ui#<commit-sha>
```

Then rebuild and redeploy the portal.

---

## Architecture

```
nexus-shared-ui (this repo)
       │
       ├── consumed by doctor-ui  (github: dependency)
       └── consumed by patient-ui (github: dependency)

Design token changes → update tailwind.config.js here
                     → copy to each portal's tailwind.config.js
                     → redeploy both portals

Component changes → edit here → bump package in portals → redeploy
```

---

## Peer dependencies

This package requires the following packages to be installed in the consuming application (they are **not** bundled here):

```json
{
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0",
  "react-router-dom": ">=6.0.0",
  "react-icons": ">=5.0.0",
  "react-hot-toast": ">=2.0.0",
  "framer-motion": ">=11.0.0",
  "react-markdown": ">=9.0.0"
}
```

---

## Related repositories

| Repository | Purpose |
|-----------|---------|
| [mental-mediator-api-graduation-project](https://github.com/AlaaEbrahim0/mental-mediator-api-graduation-project) | ASP.NET Core 8 backend API |
| [mental_mediator_doctor_ui_graduation_project](https://github.com/AlaaEbrahim0/mental_mediator_doctor_ui_graduation_project) | Doctor portal (React) |
| [mental_mediator_patient_ui_graduation_project-](https://github.com/AlaaEbrahim0/mental_mediator_patient_ui_graduation_project-) | Patient portal (React) |
