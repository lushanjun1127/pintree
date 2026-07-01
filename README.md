# CrateNav

CrateNav is a smart bookmark management and organization platform that helps users collect, organize and share their favorite websites in a beautiful way.
Based on the original Pintree project by Pintree-io.

## Features

- AI-powered organization
- Custom collections
- Seamless bookmark sharing
- Advanced search capabilities
- Responsive design
- Easy import/export functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The original Pintree project was created by Pintree-io and is used under the MIT license.
CrateNav is a fork with modifications by lushanjun1127.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- PNPM package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lushanjun1127/cratenav.git
cd cratenav
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy the environment variables template:
```bash
cp .env.example .env.local
```

4. Update the `.env.local` file with your configuration:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cratenav"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# UploadThing
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

5. Set up the database:
```bash
# Generate Prisma client
pnpm prisma generate

# Create and apply database migration
pnpm prisma migrate dev --name init
```

6. Run the development server:
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Deployment

### Vercel

The project is configured for easy deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Add the required environment variables in Vercel dashboard
3. Vercel will automatically detect the Next.js configuration and build the project

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

- `DATABASE_URL`: PostgreSQL database connection string
- `NEXTAUTH_URL`: Production URL for authentication
- `NEXTAUTH_SECRET`: Secret for NextAuth
- `UPLOADTHING_SECRET`: UploadThing secret
- `UPLOADTHING_APP_ID`: UploadThing app ID
- `NEXT_PUBLIC_APP_URL`: Public URL of your application

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linter
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Create and apply migration