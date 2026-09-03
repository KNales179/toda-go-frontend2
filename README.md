# TODA-Go Frontend

Frontend application for **TODA-Go**, a digital platform developed to support tricycle transportation and regulatory operations.

The application provides the client-side interface for interacting with TODA-Go services, communicating with backend APIs, and presenting functionality based on user roles and system permissions.

## Overview

TODA-Go was developed to improve the management and accessibility of tricycle transportation services through a centralized digital platform.

The frontend is responsible for the presentation layer of the system, including user interfaces, client-side state, API communication, authentication flows, and role-specific functionality.

## Features

* User authentication
* Role-based interfaces
* Driver and vehicle information
* Ride-related functionality
* Administrative interfaces
* API integration
* Responsive user interface
* Form handling and validation
* Client-side authentication state
* Protected application routes

## Tech Stack

### Frontend

* React
* JavaScript / TypeScript
* Vite
* Tailwind CSS

### Backend Integration

* REST API
* JSON
* JWT authentication

### Development Tools

* Git
* GitHub
* npm
* ESLint

## Project Structure

```text
src/
├── assets/          # Static assets
├── components/      # Reusable UI components
├── pages/           # Application pages
├── layouts/         # Shared layouts
├── services/        # API and external service integration
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── types/           # Type definitions
├── App.*            # Application configuration
└── main.*           # Application entry point
```

The exact structure may vary depending on the current implementation.

## Getting Started

### Prerequisites

* Node.js
* npm
* Git

### Installation

Clone the repository:

```bash
git clone <repository-url>
```

Navigate to the project directory:

```bash
cd <repository-folder>
```

Install dependencies:

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the project root and configure the required environment variables.

Example:

```env
VITE_API_URL=http://localhost:5000
```

Use the appropriate backend URL for the environment being used.

Environment files containing credentials or private configuration should not be committed to the repository.

### Development

Start the development server:

```bash
npm run dev
```

Vite will provide the local development address in the terminal.

### Production Build

Create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Related Components

TODA-Go is composed of multiple system components:

* **TODA-Go Frontend** — Client-facing web application
* **TODA-Go Admin** — Administrative and regulatory management interface
* **TODA-Go Backend** — REST API and server-side services
* **TODA-Go Mobile** — Mobile application for supported transportation workflows

## Development Notes

This repository is maintained primarily as a portfolio and project demonstration.

The source code is publicly visible to allow the implementation, architecture, and development work to be reviewed. Sensitive configuration, credentials, private keys, and deployment secrets are excluded from the repository.

## License

### Proprietary — All Rights Reserved

This repository is publicly available for **portfolio, educational, and demonstration purposes**.

No permission is granted to copy, modify, reproduce, distribute, sublicense, publish, or use the source code or substantial portions of it for another project without prior written permission from the copyright holder.

Viewing and evaluating the source code through this repository does not grant ownership or any additional rights to the software.

For permission to use any portion of this project beyond viewing and evaluation, contact the copyright holder.

## Author

**IBell**
