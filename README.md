# 🐉 Dragon World Alliance Management System

A comprehensive web application for managing alliances, players, events, and MVP rotations in the Kings Choice game.

## ✨ Features

### 🎯 Core Functionality
- **Enhanced Player Management**: Add, edit, delete (soft/hard), and organize players with alliance assignments
- **Simplified Alliance Control**: Create alliances with just a name - other fields optional, blacklist functionality  
- **Event Tracking**: Create events and track competitions with detailed history
- **MVP Rotation**: Fair MVP assignment with automatic rotation system
- **MVP Types**: Three MVP tiers (Simple, Earl, Duke) with different point values
- **Winner Assignment**: Assign alliance winners to events with win tracking
- **Guides with Images**: Built-in guides and documentation system with image upload support

### 🔧 Technical Features
- **Modular Architecture**: Easy to extend and maintain
- **SQLite Database**: Lightweight, serverless database
- **RESTful API**: Clean API endpoints for all operations
- **Enhanced Responsive UI**: Modern Bootstrap-based interface with improved button visibility
- **Real-time Updates**: Dynamic content loading
- **Persistent Service**: Run as systemd service that survives SSH disconnection
- **Image Support**: Upload and manage images with guides
- **Port Flexibility**: Configured for port 5002 (avoiding 5000/5001 conflicts)

### 🆕 Recent Improvements
- ✅ **Enhanced UI Design**: Better button visibility, contrast, and modern styling
- ✅ **Player Delete Options**: Choose between soft delete (deactivate) or hard delete (permanent)
- ✅ **Simplified Alliance Creation**: Only alliance name required, other fields optional
- ✅ **Guides with Images**: Upload multiple images per guide with preview functionality
- ✅ **Service Management**: Run as persistent systemd service with management scripts
- ✅ **Improved Forms**: Enhanced form styling, validation, and user experience

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Modern web browser

### Installation & Setup

1. **Clone/Download the project**
   ```bash
   cd /workspace
   ```

2. **Install dependencies**
   ```bash
   pip3 install --break-system-packages Flask Flask-CORS
   ```

3. **Initialize the database**
   ```bash
   python3 models/database.py
   ```

4. **Choose how to run the application**
   
   **Option A: Quick Start (stops when SSH closes)**
   ```bash
   python3 run.py
   ```
   
   **Option B: Enhanced Setup with Service Option**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   This will prompt you to choose between foreground mode or persistent service mode.

   **Option C: Direct Service Installation**
   ```bash
   chmod +x manage-service.sh
   ./manage-service.sh install
   ```

5. **Access the application**
   - Main Dashboard: http://localhost:5002/dashboard
   - Home Page: http://localhost:5002/
   - Guides: http://localhost:5002/guides
   - API Health: http://localhost:5002/health

## 🔧 Service Management

For production use, run the application as a persistent service:

```bash
# Install and start as service
./manage-service.sh install

# Service management commands
./manage-service.sh start      # Start the service
./manage-service.sh stop       # Stop the service
./manage-service.sh restart    # Restart the service
./manage-service.sh status     # Check service status
./manage-service.sh logs       # View live logs
./manage-service.sh uninstall  # Remove the service
```

**Benefits of Service Mode:**
- ✅ Survives SSH disconnection
- ✅ Automatic restart on failure
- ✅ Starts automatically on system boot
- ✅ Proper logging via systemd journal

## 📋 Usage Guide

### Player Management
1. Navigate to the Dashboard → Players section
2. Click "Add Player" to create new players
3. Assign players to alliances
4. Track MVP history and performance

### Alliance Management  
1. Go to Dashboard → Alliances
2. Create alliances with names and tags
3. Use blacklist functionality to exclude problematic alliances
4. Monitor alliance wins and member counts

### Event System
1. Access Dashboard → Events
2. Create events with dates and descriptions
3. Assign MVPs using the rotation system
4. Assign winner alliances to track victories

### MVP Rotation
1. Visit Dashboard → MVP System
2. View rotation status and next candidates
3. Assign MVPs with three types:
   - **Simple MVP** (1 point) - Standard recognition
   - **Earl MVP** (3 points) - Enhanced recognition  
   - **Duke MVP** (5 points) - Highest recognition
4. System automatically ensures fair MVP distribution
5. Reset rotation cycles when needed

## 🗂️ Project Structure

```
/workspace/
├── app.py                 # Main Flask application
├── run.py                 # Startup script
├── requirements.txt       # Python dependencies
├── alliance_management.db # SQLite database
├── models/
│   └── database.py       # Database models and initialization
├── controllers/          # Modular API controllers
│   ├── players.py       # Player management endpoints
│   ├── alliances.py     # Alliance management endpoints
│   ├── events.py        # Event management endpoints
│   ├── mvp.py           # MVP system endpoints
│   └── guides.py        # Guides and documentation
├── templates/           # HTML templates
│   ├── base.html       # Base template
│   ├── index.html      # Home page
│   ├── dashboard.html  # Main dashboard
│   ├── guides.html     # Guides page
│   └── modals/         # Modal dialogs
└── static/             # Static assets
    ├── css/style.css   # Custom styles
    ├── js/app.js       # Common JavaScript
    └── js/dashboard.js # Dashboard functionality
```

## 🔌 API Endpoints

### Players
- `GET /api/players/` - Get all players
- `POST /api/players/` - Create new player
- `PUT /api/players/{id}` - Update player
- `DELETE /api/players/{id}` - Deactivate player
- `GET /api/players/active` - Get active players only
- `GET /api/players/stats` - Get player statistics

### Alliances
- `GET /api/alliances/` - Get all alliances
- `POST /api/alliances/` - Create new alliance
- `PUT /api/alliances/{id}` - Update alliance
- `DELETE /api/alliances/{id}` - Delete alliance
- `POST /api/alliances/{id}/blacklist` - Add to blacklist
- `POST /api/alliances/{id}/whitelist` - Remove from blacklist
- `GET /api/alliances/blacklisted` - Get blacklisted alliances
- `GET /api/alliances/{id}/members` - Get alliance members
- `GET /api/alliances/stats` - Get alliance statistics

### Events
- `GET /api/events/` - Get all events
- `POST /api/events/` - Create new event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `POST /api/events/{id}/assign_winner` - Assign winner alliance
- `GET /api/events/{id}/history` - Get event history
- `GET /api/events/upcoming` - Get upcoming events
- `GET /api/events/stats` - Get event statistics

### MVP System
- `POST /api/mvp/assign/{event_id}` - Assign MVP to event
- `GET /api/mvp/next_candidates` - Get next MVP candidates
- `GET /api/mvp/rotation_status` - Get rotation status
- `GET /api/mvp/history` - Get MVP history
- `POST /api/mvp/reset_rotation` - Reset rotation cycle
- `GET /api/mvp/stats` - Get MVP statistics

### Guides
- `GET /guides/` - Guides page
- `GET /guides/api` - Get all guides
- `POST /guides/api` - Create new guide
- `PUT /guides/api/{id}` - Update guide
- `DELETE /guides/api/{id}` - Delete guide
- `GET /guides/api/categories` - Get guide categories

## 🎨 Icons & Visual Elements

The system uses Font Awesome icons for visual clarity:
- 🏆 **MVP Icons**: 
  - Simple MVP: Golden trophy (🏆)
  - Earl MVP: Blue crown (👑) 
  - Duke MVP: Red king piece (♔)
- 👑 **Winner Icon**: Crown for winning alliances  
- 🚫 **Blacklist Icon**: Ban icon for blacklisted alliances
- ⭐ **Status Badges**: Color-coded status indicators
- 📊 **Point System**: Visual point tracking for MVP achievements

## 🔧 Customization

### Adding New Features
1. Create new controller in `/controllers/`
2. Add API endpoints following the existing pattern
3. Update the frontend JavaScript in `/static/js/`
4. Add new templates if needed in `/templates/`
5. Register new blueprints in `app.py`

### Database Modifications
1. Update schema in `models/database.py`
2. Add migration logic if needed
3. Update API controllers to handle new fields
4. Modify frontend to display new data

### UI Customization
1. Edit `/static/css/style.css` for styling
2. Modify templates in `/templates/` for layout changes
3. Update JavaScript in `/static/js/` for functionality

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
- The app runs on port 5002 by default
- Change port in `app.py` and `run.py` if needed

**Database Issues**
- Delete `alliance_management.db` and run `python3 models/database.py` to reset
- Check file permissions on the database file

**Missing Dependencies**
- Run `pip3 install --break-system-packages Flask Flask-CORS`
- Ensure Python 3.7+ is installed

**API Errors**
- Check browser console for JavaScript errors
- Verify API endpoints are responding at `/health`

## 📊 Database Schema

### Players Table
- id, name, alliance_id, is_active, mvp_count, mvp_points, last_mvp_date, last_mvp_type, timestamps

### Alliances Table  
- id, name, tag, description, is_blacklisted, wins_count, timestamps

### Events Table
- id, name, description, event_date, status, mvp_player_id, mvp_type, winner_alliance_id, timestamps

### MVP Rotation Table
- id, player_id, rotation_cycle, has_been_mvp, timestamp

### Event History Table
- id, event_id, action, details, timestamp

### MVP Types Table
- id, name, points, description, icon_class, color_class, order_index

### Guides Table
- id, title, content, category, order_index, is_published, timestamps

## 🚀 Deployment

For production deployment:

1. **Use a production WSGI server**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5002 app:app
   ```

2. **Set up reverse proxy** (nginx/Apache)

3. **Configure environment variables** for production settings

4. **Set up database backups** for the SQLite file

5. **Enable HTTPS** for secure access

## 🤝 Contributing

1. Follow the modular architecture pattern
2. Add comprehensive error handling
3. Include API documentation for new endpoints
4. Test all CRUD operations
5. Update this README for new features

## 📝 License

This project is built for Kings Choice game alliance management. Feel free to modify and extend as needed.

## 🎮 About Kings Choice

Kings Choice is a strategic medieval game where alliances play a crucial role in success. This management system helps coordinate alliance activities, track performance, and ensure fair participation through the MVP rotation system.

---

**Happy Alliance Managing! 🏰👑**