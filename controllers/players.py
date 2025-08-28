"""
Player management controller
Handles CRUD operations for players
"""

from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from datetime import datetime
import sqlite3

players_bp = Blueprint('players', __name__)

@players_bp.route('/', methods=['GET'])
def get_players():
    """Get all players with their alliance information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT p.id, p.name, p.is_active, p.mvp_count, p.mvp_points, p.last_mvp_date, p.last_mvp_type,
               a.name as alliance_name, a.tag as alliance_tag, a.id as alliance_id
        FROM players p
        LEFT JOIN alliances a ON p.alliance_id = a.id
        ORDER BY p.name
    ''')
    
    players = []
    for row in cursor.fetchall():
        players.append({
            'id': row['id'],
            'name': row['name'],
            'is_active': bool(row['is_active']),
            'mvp_count': row['mvp_count'],
            'mvp_points': row['mvp_points'],
            'last_mvp_date': row['last_mvp_date'],
            'last_mvp_type': row['last_mvp_type'],
            'alliance': {
                'id': row['alliance_id'],
                'name': row['alliance_name'],
                'tag': row['alliance_tag']
            } if row['alliance_id'] else None
        })
    
    conn.close()
    return jsonify(players)

@players_bp.route('/', methods=['POST'])
def create_player():
    """Create a new player"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Player name is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO players (name, alliance_id, is_active)
            VALUES (?, ?, ?)
        ''', (data['name'], data.get('alliance_id'), data.get('is_active', True)))
        
        player_id = cursor.lastrowid
        
        # Add to current MVP rotation cycle
        cursor.execute('SELECT MAX(rotation_cycle) FROM mvp_rotation')
        current_cycle = cursor.fetchone()[0] or 0
        
        cursor.execute('''
            INSERT INTO mvp_rotation (player_id, rotation_cycle, has_been_mvp)
            VALUES (?, ?, 0)
        ''', (player_id, current_cycle))
        
        conn.commit()
        
        return jsonify({
            'id': player_id,
            'name': data['name'],
            'message': 'Player created successfully'
        }), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Player name already exists'}), 409
    finally:
        conn.close()

@players_bp.route('/<int:player_id>', methods=['PUT'])
def update_player(player_id):
    """Update player information"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if player exists
    cursor.execute('SELECT id FROM players WHERE id = ?', (player_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Player not found'}), 404
    
    # Build update query dynamically
    update_fields = []
    values = []
    
    if 'name' in data:
        update_fields.append('name = ?')
        values.append(data['name'])
    
    if 'alliance_id' in data:
        update_fields.append('alliance_id = ?')
        values.append(data['alliance_id'])
    
    if 'is_active' in data:
        update_fields.append('is_active = ?')
        values.append(data['is_active'])
    
    if not update_fields:
        conn.close()
        return jsonify({'error': 'No valid fields to update'}), 400
    
    update_fields.append('updated_at = ?')
    values.append(datetime.now())
    values.append(player_id)
    
    try:
        cursor.execute(f'''
            UPDATE players 
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', values)
        
        conn.commit()
        return jsonify({'message': 'Player updated successfully'})
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Player name already exists'}), 409
    finally:
        conn.close()

@players_bp.route('/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    """Delete a player (soft delete by setting inactive or hard delete)"""
    hard_delete = request.args.get('hard', 'false').lower() == 'true'
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM players WHERE id = ?', (player_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Player not found'}), 404
    
    try:
        if hard_delete:
            # Hard delete - remove completely from database
            # First remove from MVP rotation
            cursor.execute('DELETE FROM mvp_rotation WHERE player_id = ?', (player_id,))
            
            # Remove from any event MVP assignments
            cursor.execute('UPDATE events SET mvp_player_id = NULL WHERE mvp_player_id = ?', (player_id,))
            
            # Finally delete the player
            cursor.execute('DELETE FROM players WHERE id = ?', (player_id,))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Player permanently deleted successfully'})
        else:
            # Soft delete - set as inactive
            cursor.execute('''
                UPDATE players 
                SET is_active = 0, updated_at = ?
                WHERE id = ?
            ''', (datetime.now(), player_id))
            
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Player deactivated successfully'})
            
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': f'Failed to delete player: {str(e)}'}), 500

@players_bp.route('/active', methods=['GET'])
def get_active_players():
    """Get only active players"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT p.id, p.name, p.mvp_count, p.last_mvp_date,
               a.name as alliance_name, a.tag as alliance_tag
        FROM players p
        LEFT JOIN alliances a ON p.alliance_id = a.id
        WHERE p.is_active = 1
        ORDER BY p.name
    ''')
    
    players = []
    for row in cursor.fetchall():
        players.append({
            'id': row['id'],
            'name': row['name'],
            'mvp_count': row['mvp_count'],
            'last_mvp_date': row['last_mvp_date'],
            'alliance': {
                'name': row['alliance_name'],
                'tag': row['alliance_tag']
            } if row['alliance_name'] else None
        })
    
    conn.close()
    return jsonify(players)

@players_bp.route('/stats', methods=['GET'])
def get_player_stats():
    """Get player statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            COUNT(*) as total_players,
            COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_players,
            COUNT(CASE WHEN alliance_id IS NOT NULL THEN 1 END) as players_with_alliance,
            AVG(mvp_count) as avg_mvp_count
        FROM players
    ''')
    
    stats = dict(cursor.fetchone())
    conn.close()
    
    return jsonify(stats)