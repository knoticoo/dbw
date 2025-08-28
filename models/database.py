"""
Database models and initialization for Kings Choice Alliance Management
SQLite3 database with comprehensive schema
"""

import sqlite3
import os
from datetime import datetime

DATABASE_PATH = '/workspace/alliance_management.db'

def get_db_connection():
    """Get database connection with row factory"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with all required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Players table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            alliance_id INTEGER,
            is_active BOOLEAN DEFAULT 1,
            mvp_count INTEGER DEFAULT 0,
            mvp_points INTEGER DEFAULT 0,
            last_mvp_date DATE,
            last_mvp_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (alliance_id) REFERENCES alliances (id)
        )
    ''')
    
    # Alliances table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alliances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            tag TEXT,
            description TEXT,
            is_blacklisted BOOLEAN DEFAULT 0,
            wins_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            event_date DATE NOT NULL,
            status TEXT DEFAULT 'upcoming',
            mvp_player_id INTEGER,
            mvp_type TEXT DEFAULT 'Simple',
            winner_alliance_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (mvp_player_id) REFERENCES players (id),
            FOREIGN KEY (winner_alliance_id) REFERENCES alliances (id)
        )
    ''')
    
    # MVP rotation tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mvp_rotation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            rotation_cycle INTEGER NOT NULL,
            has_been_mvp BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players (id)
        )
    ''')
    
    # MVP types table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mvp_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            points INTEGER DEFAULT 1,
            description TEXT,
            icon_class TEXT,
            color_class TEXT,
            order_index INTEGER DEFAULT 0
        )
    ''')
    
    # Event history for detailed tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS event_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events (id)
        )
    ''')
    
    # Guides content table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS guides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            order_index INTEGER DEFAULT 0,
            is_published BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create indexes for better performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_players_alliance ON players(alliance_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_mvp ON events(mvp_player_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_winner ON events(winner_alliance_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_alliances_blacklisted ON alliances(is_blacklisted)')
    
    # Insert default MVP types
    cursor.execute('''
        INSERT OR IGNORE INTO mvp_types (name, points, description, icon_class, color_class, order_index)
        VALUES 
        ('Simple', 1, 'Basic MVP recognition for standard performance', 'fas fa-trophy', 'text-warning', 1),
        ('Earl', 3, 'Enhanced MVP recognition for excellent performance', 'fas fa-crown', 'text-primary', 2),
        ('Duke', 5, 'Highest MVP recognition for outstanding performance', 'fas fa-chess-king', 'text-danger', 3)
    ''')
    
    # Insert default guides
    cursor.execute('''
        INSERT OR IGNORE INTO guides (title, content, category, order_index)
        VALUES 
        ('Getting Started', 'Welcome to Kings Choice Alliance Management! This tool helps you manage players, alliances, and events efficiently.', 'basics', 1),
        ('Managing Players', 'Add players to the system and assign them to alliances. Track their MVP history and performance.', 'players', 2),
        ('Event Management', 'Create events, assign MVPs, and track alliance winners. The system automatically rotates MVP assignments.', 'events', 3),
        ('Alliance System', 'Manage alliances, track wins, and maintain blacklists for problematic alliances.', 'alliances', 4),
        ('MVP Rotation', 'The system ensures fair MVP rotation - once all players have been MVP, the cycle resets automatically.', 'mvp', 5),
        ('MVP Types', 'MVP assignments come in three tiers: Simple (1 point), Earl (3 points), and Duke (5 points). Higher tiers recognize exceptional performance.', 'mvp', 6)
    ''')
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DATABASE_PATH}")

def reset_mvp_rotation():
    """Reset MVP rotation when all players have been MVP"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current rotation cycle
    cursor.execute('SELECT MAX(rotation_cycle) FROM mvp_rotation')
    current_cycle = cursor.fetchone()[0] or 0
    
    # Check if all active players have been MVP in current cycle
    cursor.execute('''
        SELECT COUNT(*) as total_active,
               COUNT(mr.id) as mvp_count
        FROM players p
        LEFT JOIN mvp_rotation mr ON p.id = mr.player_id 
                                   AND mr.rotation_cycle = ?
                                   AND mr.has_been_mvp = 1
        WHERE p.is_active = 1
    ''', (current_cycle,))
    
    result = cursor.fetchone()
    total_active = result[0]
    mvp_count = result[1]
    
    if total_active > 0 and mvp_count >= total_active:
        # Start new rotation cycle
        new_cycle = current_cycle + 1
        cursor.execute('''
            INSERT INTO mvp_rotation (player_id, rotation_cycle, has_been_mvp)
            SELECT id, ?, 0
            FROM players
            WHERE is_active = 1
        ''', (new_cycle,))
        
        conn.commit()
        conn.close()
        return True
    
    conn.close()
    return False

if __name__ == '__main__':
    init_db()