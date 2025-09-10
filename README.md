# SuperAdmin Dashboard for AI-Linc Educational Platform

## Overview

The SuperAdmin Dashboard is a comprehensive management tool designed for the AI-Linc educational platform. It provides super administrators with the ability to manage clients, courses, and analytics effectively. The dashboard is built using modern web technologies, ensuring a responsive and user-friendly experience.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS (Glassmorphism UI)
- **State Management**: React Query, Zustand
- **Animations**: Framer Motion
- **Form Handling**: React Hook Form, Zod
- **Charts**: Recharts

## Features

- **Persistent Navigation**: A collapsible sidebar for easy navigation between different sections of the dashboard.
- **Dashboard Overview**: Displays key statistics and analytics through animated counters and charts.
- **Client Management**: List, view, and manage clients with detailed insights into their statistics and associated courses.
- **Course Management**: View and manage AI-Linc courses with filtering and sorting options.
- **Responsive Design**: Mobile-first approach with a collapsible sidebar for smaller screens.
- **Accessibility**: Compliant with WCAG 2.1 AA standards.

## API Integration

The dashboard integrates with the AI-Linc backend API for data management. Key endpoints include:

- **Authentication**: `POST /accounts/clients/1/user/login/`
- **Dashboard Overview**: `GET /superadmin/api/dashboard/`
- **Clients Management**: 
  - List: `GET /superadmin/api/clients/`
  - Details: `GET /superadmin/api/clients/{id}/`
- **AI-Linc Courses**: `GET /superadmin/api/ai-linc/courses/`

## Getting Started

1. **Clone the repository**:
   ```
   git clone https://github.com/your-repo/superadmin-dashboard.git
   cd superadmin-dashboard
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the application**:
   ```
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000` to view the dashboard.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.