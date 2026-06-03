# Frontend Architecture Layout

## src/
- **app/**: App Router routes and layouts.
- **components/**: Presentation components.
  - **ui/**: Basic UI elements (shadcn/ui).
  - **forms/**: Form components (Zod + React Hook Form).
  - **layout/**: Layout components (Navbar, Sidebar).
  - **shared/**: Other shared components.
- **features/**: Business modules (auth, chat, etc.).
- **domain/**: Business logic layer (Framework agnostic).
  - **entities/**: Domain models.
  - **repositories/**: Interface definitions for data access.
  - **use-cases/**: Application logic flows.
  - **dto/**: Data Transfer Objects.
- **infrastructure/**: Implementation of external interfaces.
  - **api/**: API clients (Axios/Fetch).
  - **auth/**: Auth implementation.
  - **storage/**: Persistence logic.
  - **adapters/**: Data transformation logic.
- **hooks/**: Custom React hooks.
- **lib/**: External library wrappers/config.
- **providers/**: Context providers.
- **styles/**: Global styles and Tailwind config.
- **types/**: TypeScript definitions.
- **utils/**: Pure utility functions.
