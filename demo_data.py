#!/usr/bin/env python3
"""
Kings Choice Alliance Management - Demo Data Script
Populates the system with sample data for testing
"""

import sqlite3
from datetime import datetime, timedelta
from models.database import get_db_connection

def add_demo_data():
    """Add sample data to demonstrate the system"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("🏰 Adding demo data to Kings Choice Alliance Management...")
    
    # Add sample alliances
    alliances = [
        ("Dragon Lords", "[DL]", "Elite alliance focused on strategic warfare", 0, 3),
        ("Shadow Knights", "[SK]", "Stealth specialists and tactical experts", 0, 2),
        ("Golden Eagles", "[GE]", "Economic powerhouse with strong defenses", 0, 1),
        ("Iron Wolves", "[IW]", "Aggressive raiders and fierce warriors", 1, 0),  # Blacklisted
        ("Crystal Guardians", "[CG]", "Protective alliance with magical focus", 0, 1),
    ]
    
    for name, tag, desc, blacklisted, wins in alliances:
        cursor.execute('''
            INSERT OR IGNORE INTO alliances (name, tag, description, is_blacklisted, wins_count)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, tag, desc, blacklisted, wins))
    
    # Get alliance IDs
    cursor.execute('SELECT id, name FROM alliances')
    alliance_map = {name: id for id, name in cursor.fetchall()}
    
    # Add sample players
    players = [
        ("KingArthur", "Dragon Lords", 2, "2024-01-15"),
        ("QueenElsa", "Dragon Lords", 1, "2024-01-20"),
        ("LordStark", "Shadow Knights", 3, "2024-01-10"),
        ("LadyGaga", "Shadow Knights", 0, None),
        ("CaptainAmerica", "Golden Eagles", 1, "2024-01-25"),
        ("WonderWoman", "Golden Eagles", 2, "2024-01-05"),
        ("Wolverine", "Crystal Guardians", 1, "2024-01-18"),
        ("StormBreaker", None, 0, None),  # No alliance
        ("PhoenixRider", None, 1, "2024-01-22"),  # No alliance
        ("DragonSlayer", "Iron Wolves", 0, None),  # In blacklisted alliance
    ]
    
    for name, alliance_name, mvp_count, last_mvp in players:
        alliance_id = alliance_map.get(alliance_name) if alliance_name else None
        cursor.execute('''
            INSERT OR IGNORE INTO players (name, alliance_id, mvp_count, last_mvp_date, is_active)
            VALUES (?, ?, ?, ?, 1)
        ''', (name, alliance_id, mvp_count, last_mvp))
    
    # Get player IDs
    cursor.execute('SELECT id, name FROM players')
    player_map = {name: id for id, name in cursor.fetchall()}
    
    # Add sample events
    events = [
        ("Winter Tournament", "2024-01-15", "Annual winter competition", "completed", "KingArthur", "Dragon Lords"),
        ("Spring Festival", "2024-02-20", "Celebration and friendly competition", "completed", "LordStark", "Shadow Knights"),
        ("Summer War Games", "2024-03-25", "Major alliance warfare event", "completed", "WonderWoman", "Golden Eagles"),
        ("Autumn Harvest", "2024-04-15", "Resource gathering competition", "ongoing", "Wolverine", None),
        ("New Year Championship", "2024-12-31", "Year-end grand tournament", "upcoming", None, None),
        ("Valentine's Day Special", "2024-02-14", "Love-themed mini games", "upcoming", None, None),
    ]
    
    for name, date, desc, status, mvp_name, winner_name in events:
        mvp_id = player_map.get(mvp_name) if mvp_name else None
        winner_id = alliance_map.get(winner_name) if winner_name else None
        
        cursor.execute('''
            INSERT OR IGNORE INTO events (name, event_date, description, status, mvp_player_id, winner_alliance_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, date, desc, status, mvp_id, winner_id))
    
    # Initialize MVP rotation for current cycle
    cursor.execute('SELECT id FROM players WHERE is_active = 1')
    active_players = cursor.fetchall()
    
    for player in active_players:
        cursor.execute('''
            INSERT OR IGNORE INTO mvp_rotation (player_id, rotation_cycle, has_been_mvp)
            VALUES (?, 0, 0)
        ''', (player[0],))
    
    # Mark some players as having been MVP in current cycle
    mvp_players = ["KingArthur", "LordStark", "WonderWoman", "Wolverine"]
    for player_name in mvp_players:
        if player_name in player_map:
            cursor.execute('''
                UPDATE mvp_rotation 
                SET has_been_mvp = 1 
                WHERE player_id = ? AND rotation_cycle = 0
            ''', (player_map[player_name],))
    
    # Add some event history
    cursor.execute('SELECT id, name FROM events LIMIT 3')
    events_with_history = cursor.fetchall()
    
    for event_id, event_name in events_with_history:
        cursor.execute('''
            INSERT OR IGNORE INTO event_history (event_id, action, details)
            VALUES (?, 'created', ?)
        ''', (event_id, f"Event '{event_name}' was created"))
        
        cursor.execute('''
            INSERT OR IGNORE INTO event_history (event_id, action, details)
            VALUES (?, 'completed', ?)
        ''', (event_id, f"Event '{event_name}' was completed successfully"))
    
    conn.commit()
    conn.close()
    
    print("✅ Demo data added successfully!")
    print("\n📊 Sample data includes:")
    print("  • 5 alliances (1 blacklisted)")
    print("  • 10 players with various MVP histories")
    print("  • 6 events (completed, ongoing, and upcoming)")
    print("  • MVP rotation system initialized")
    print("  • Event history records")
    print("\n🚀 Start the application with: python3 run.py")
    print("💡 Visit: http://localhost:5002/dashboard")

if __name__ == '__main__':
    add_demo_data()