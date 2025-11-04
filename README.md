# ChurchEase - Church Reservation Management System

A modern web application for managing church service reservations with Flask backend and Supabase database.

## Features

- **One-Page Reservation Form** - Streamlined booking process
- **Client Search & Auto-fill** - Quick client lookup from database
- **Real-time Preview** - Live preview of reservation details
- **Service Management** - Wedding, Baptism, Funeral, Confirmation services
- **Status Tracking** - Pending, Approved, Completed, Cancelled statuses
- **Dashboard Analytics** - Reservation statistics and insights
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Supabase Integration** - Cloud database with real-time capabilities

## Installation

### Prerequisites
- Python 3.8+
- pip (Python package installer)
- Supabase account and project

### Setup Instructions

1. **Clone or Download** the project files to your local machine

2. **Navigate to the project directory:**
   ```bash
   cd "ChurchEase V.2"
   ```

3. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup Supabase Database:**
   - Go to your Supabase dashboard
   - Navigate to **SQL Editor**
   - Copy the entire content from `supabase_setup.sql`
   - Paste and click **Run** to create all tables

5. **Configure Database Connection:**
   - The app is pre-configured with your Supabase credentials
   - Database URL: `https://dgeauftgwgxkbwidiios.supabase.co`
   - Tables: `users`, `clients`, `reservations`

## Running the Application

1. **Start the Flask server:**
   ```bash
   python app.py
   ```

2. **Open your web browser and navigate to:**
   ```
   http://localhost:5000
   ```

3. **Login with demo credentials:**
   - Username: `admin`
   - Password: `admin123`

## Database Schema

### Supabase Tables

The application uses three main tables in Supabase:

#### Users Table
- `id` (UUID) - Primary key
- `username` (VARCHAR) - Unique username
- `email` (VARCHAR) - User email
- `password_hash` (VARCHAR) - Hashed password
- `role` (VARCHAR) - User role (admin, secretary)
- `created_at` (TIMESTAMP) - Account creation time

#### Clients Table
- `id` (UUID) - Primary key
- `first_name` (VARCHAR) - Client first name
- `last_name` (VARCHAR) - Client last name
- `phone` (VARCHAR) - Contact number
- `email` (VARCHAR) - Email address
- `address` (TEXT) - Complete address
- `created_at` (TIMESTAMP) - Record creation time

#### Reservations Table
- `id` (UUID) - Primary key
- `reservation_id` (VARCHAR) - Unique reservation identifier (e.g., R1A2B3C4)
- `service_type` (VARCHAR) - Type of service (wedding, baptism, funeral, confirmation)
- `reservation_date` (DATE) - Date of service
- `reservation_time` (TIME) - Time of service
- `location` (VARCHAR) - Venue location
- `attendees` (INTEGER) - Expected number of attendees
- `special_requests` (TEXT) - Additional notes
- `status` (VARCHAR) - Reservation status (pending, approved, completed, cancelled)
- `client_id` (UUID) - Foreign key to clients table
- `created_by` (UUID) - Foreign key to users table
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Last update time

## API Endpoints

### Authentication
- `POST /login` - User authentication
- `GET /logout` - User logout
- `GET /dashboard` - Main dashboard (requires login)

### Reservations API
- `GET /api/reservations` - Get all reservations with filters
  - Query params: `service_type`, `status`, `date`, `search`
- `POST /api/reservations` - Create new reservation
- `PUT /api/reservations/<id>` - Update reservation
- `DELETE /api/reservations/<id>` - Delete reservation

### Clients API
- `GET /api/clients/search?q=<query>` - Search clients by name/phone

### Dashboard API
- `GET /api/dashboard/stats` - Get dashboard statistics

## Usage Guide

### Creating a Reservation

1. **Navigate to Reservations** - Click "Reservations" in the sidebar
2. **Go to Add Reservation tab**
3. **Select Service Type** - Click on Wedding 💍, Baptism 👶, Funeral ⚰️, or Confirmation ✝️
4. **Fill Schedule Details**:
   - Date (required)
   - Time (required) 
   - Venue/Location (required)
   - Expected attendees (optional)
5. **Enter Client Information**:
   - Use search bar to find existing clients
   - Or enter new client details
   - Required: First name, Last name, Phone
   - Optional: Email, Address
6. **Add Special Requests** - Any additional notes or requirements
7. **Review Live Preview** - Check all details in the preview panel
8. **Submit** - Click "Submit Reservation" button
9. **Confirmation** - Get unique reservation ID and options to print or create new reservation

### Managing Reservations

- **View All Reservations** - See complete list in table format
- **Filter by Service Type** - Use filter pills (All, Wedding, Baptism, Funeral, Confirmation)
- **Filter by Status** - Use status dropdown (All, Pending, Approved, Completed, Cancelled)
- **Search** - Find specific reservations by client name, phone, or reservation ID
- **Update Status** - Click action buttons to approve, complete, or manage reservations
- **View Details** - Click view button to see full reservation information

### Client Management

- **Auto-fill Forms** - Search existing clients to auto-populate form fields
- **Client History** - View all reservations for a specific client
- **Update Information** - Edit client details when creating new reservations

## Troubleshooting

### Common Issues

1. **"Could not find table" error:**
   - Ensure you've run the `supabase_setup.sql` script in your Supabase dashboard
   - Check that all three tables (users, clients, reservations) exist

2. **Login not working:**
   - Verify the users table exists and has the admin user
   - Check Supabase connection credentials in `app.py`

3. **Reservations not loading:**
   - Confirm reservations table exists with proper relationships
   - Check browser console for API errors

4. **Client search not working:**
   - Verify clients table exists
   - Ensure there are some client records to search

### Development Mode

To run with debug information:
```bash
# The app already runs in debug mode by default
python app.py
```

View logs in the terminal to see database queries and errors.

## Security Features

- **Row Level Security (RLS)** - Enabled on all Supabase tables
- **Session Management** - Secure user sessions with Flask
- **Password Hashing** - Werkzeug security for password protection
- **API Authentication** - All API endpoints require valid session

## Project Structure

```
ChurchEase V.2/
├── app.py                      # Flask backend with Supabase integration
├── requirements.txt            # Python dependencies
├── supabase_setup.sql         # Database schema and setup
├── README.md                  # This documentation
├── templates/
│   ├── login.html             # Login page template
│   └── Sec-Dashboard.html     # Main dashboard template
├── static/ (if using static files)
│   ├── css/
│   └── js/
└── *.html, *.css, *.js       # Frontend files (can be moved to static/)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Supabase integration
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For support or questions:
1. Check the troubleshooting section above
2. Verify Supabase setup is complete
3. Check Flask app logs for detailed error messages
   http://localhost:5000
   ```

3. **Login with demo credentials:**
   - Username: `admin`
   - Password: `admin123`

## Project Structure

```
ChurchEase V.2/
├── app.py                      # Flask backend application
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── churchease.db              # SQLite database (created automatically)
├── templates/
│   ├── login.html             # Login page template
│   └── Sec-Dashboard.html     # Main dashboard template
└── static/
    ├── css/
    │   ├── dashboard-styles.css
    │   ├── reservation-styles.css
    │   └── reservation-onepage.css
    └── js/
        ├── dashboard-enhanced.js
        ├── reservation-module.js
        ├── reservation-onepage.js
        └── reservation-backend.js
```

## API Endpoints

### Authentication
- `POST /login` - User authentication
- `GET /logout` - User logout

### Reservations
- `GET /api/reservations` - Get all reservations (with filters)
- `POST /api/reservations` - Create new reservation
- `PUT /api/reservations/<id>` - Update reservation
- `DELETE /api/reservations/<id>` - Delete reservation

### Clients
- `GET /api/clients/search` - Search clients by name/phone

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - User email
- `password_hash` - Hashed password
- `role` - User role (admin, secretary)
- `created_at` - Account creation timestamp

### Clients Table
- `id` - Primary key
- `first_name` - Client first name
- `last_name` - Client last name
- `phone` - Contact number
- `email` - Email address
- `address` - Complete address
- `created_at` - Record creation timestamp

### Reservations Table
- `id` - Primary key
- `reservation_id` - Unique reservation identifier
- `service_type` - Type of service (wedding, baptism, funeral, confirmation)
- `reservation_date` - Date of service
- `reservation_time` - Time of service
- `location` - Venue location
- `attendees` - Expected number of attendees
- `special_requests` - Additional notes
- `status` - Reservation status (pending, approved, completed, cancelled)
- `client_id` - Foreign key to clients table
- `created_by` - Foreign key to users table
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Usage

### Creating a Reservation

1. **Navigate to Reservations** - Click "Reservations" in the sidebar
2. **Go to Add Reservation tab**
3. **Select Service Type** - Click on Wedding, Baptism, Funeral, or Confirmation
4. **Fill Schedule Details** - Date, time, venue, attendees
5. **Enter Client Information** - Use search to find existing clients or add new
6. **Add Special Requests** - Any additional notes
7. **Review Preview** - Check details in the live preview panel
8. **Submit** - Click "Submit Reservation" button

### Managing Reservations

- **View All** - See all reservations in the table
- **Filter** - Use service type filters to narrow results
- **Update Status** - Approve, complete, or cancel reservations
- **Search** - Find specific reservations by client name or ID

## Customization

### Adding New Service Types

1. Update the service cards in the HTML template
2. Add new service type to the database enum
3. Update the service icons and colors in CSS
4. Modify the API endpoints to handle the new service type

### Changing Styling

- Edit CSS files in `static/css/` folder
- Modify color variables in `:root` section
- Update component styles as needed

## Troubleshooting

### Common Issues

1. **Database not found error:**
   - Make sure Flask app runs at least once to create the database
   - Check file permissions in the project directory

2. **Template not found error:**
   - Ensure HTML files are in the `templates/` folder
   - Check file paths in Flask routes

3. **Static files not loading:**
   - Move CSS/JS files to `static/` folder
   - Update file references in HTML templates

4. **Port already in use:**
   - Change the port in `app.py`: `app.run(port=5001)`
   - Or kill the process using the port

### Development Mode

To run in development mode with auto-reload:
```bash
export FLASK_ENV=development  # On Windows: set FLASK_ENV=development
python app.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For support or questions, please create an issue in the project repository.
