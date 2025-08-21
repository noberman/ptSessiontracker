# PT Session Tracker

A web-based personal training session management system that replaces paper-based tracking with digital validation and automated commission calculations.

## Features

- 📝 Digital session logging and tracking
- ✅ Email-based client validation system
- 💰 Automated commission tier calculations
- 👥 Multi-role support (Trainers, Managers, Admins)
- 📊 Real-time reporting and analytics
- 📱 Mobile-responsive design
- 🔒 Secure authentication and audit logging

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **UI Components**: shadcn/ui
- **Email Service**: SendGrid (configured, integration pending)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- SendGrid account (for email validation)

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone [repository-url]
cd PTSessionSolution
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env.local
```

Update the following in `.env.local`:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `SENDGRID_API_KEY`: Your SendGrid API key (optional for development)

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev --name init

# (Optional) Seed the database with sample data
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                 # Next.js 14 App Router pages
│   ├── api/            # API routes
│   ├── (auth)/         # Authentication pages
│   └── (dashboard)/    # Protected dashboard pages
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   ├── forms/         # Form components
│   └── layout/        # Layout components
├── lib/               # Utility functions and configurations
│   ├── auth.ts        # NextAuth configuration
│   ├── db/            # Database utilities
│   └── email/         # Email service utilities
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── middleware/        # Next.js middleware
```

## Database Schema

The application uses the following main entities:

- **Users**: Trainers, managers, and admins
- **Clients**: Training clients
- **Packages**: Training packages with session values
- **Sessions**: Individual training sessions with validation
- **CommissionTiers**: Configurable commission percentages
- **AuditLog**: System audit trail

See `prisma/schema.prisma` for the complete schema definition.

## User Roles

1. **Trainer**: Can log sessions and view own progress
2. **Club Manager**: Oversees single location and its trainers
3. **PT Manager**: Manages multiple locations
4. **Admin**: Full system access and configuration

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Format code with Prettier
npm run format

# Prisma commands
npx prisma studio     # Open Prisma Studio GUI
npx prisma migrate dev # Run migrations in development
npx prisma generate    # Generate Prisma client
```

## Testing

```bash
# Run tests (to be implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

## Deployment

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Add PostgreSQL database addon
3. Set environment variables in Railway dashboard
4. Deploy with automatic builds on push

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

4. Start the production server:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth encryption secret | Yes |
| `SENDGRID_API_KEY` | SendGrid API key for emails | Yes (production) |
| `SENDGRID_FROM_EMAIL` | Sender email address | Yes (production) |
| `APP_URL` | Public application URL | Yes |

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

[License Type]

## Support

For issues and questions, please [open an issue](link-to-issues) on GitHub.
