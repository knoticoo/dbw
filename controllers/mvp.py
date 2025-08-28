"""
MVP management controller
Handles MVP assignment and rotation logic
"""

from flask import Blueprint, request, jsonify
from models.database import get_db_connection, reset_mvp_rotation
from datetime import datetime
import sqlite3

mvp_bp = Blueprint('mvp', __name__)

@mvp_bp.route('/assign/<int:event_id>', methods=['POST'])
def assign_mvp(event_id):
    """Assign MVP to an event with rotation logic"""
    data = request.get_json()
    
    if not data or 'player_id' not in data:
        return jsonify({'error': 'Player ID is required'}), 400
    
    mvp_type = data.get('mvp_type', 'Simple')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if event exists
    cursor.execute('SELECT id, name FROM events WHERE id = ?', (event_id,))
    event = cursor.fetchone()
    if not event:
        conn.close()
        return jsonify({'error': 'Event not found'}), 404
    
    # Check if player exists and is active
    cursor.execute('SELECT id, name, alliance_id FROM players WHERE id = ? AND is_active = 1', (data['player_id'],))
    player = cursor.fetchone()
    if not player:
        conn.close()
        return jsonify({'error': 'Player not found or inactive'}), 404
    
    try:
        # Get MVP type points
        cursor.execute('SELECT points FROM mvp_types WHERE name = ?', (mvp_type,))
        mvp_points = cursor.fetchone()
        points = mvp_points[0] if mvp_points else 1
        
        # Update event with MVP and type
        cursor.execute('''
            UPDATE events 
            SET mvp_player_id = ?, mvp_type = ?, updated_at = ?
            WHERE id = ?
        ''', (data['player_id'], mvp_type, datetime.now(), event_id))
        
        # Update player MVP count, points, and last MVP info
        cursor.execute('''
            UPDATE players 
            SET mvp_count = mvp_count + 1, 
                mvp_points = mvp_points + ?,
                last_mvp_date = ?, 
                last_mvp_type = ?,
                updated_at = ?
            WHERE id = ?
        ''', (points, datetime.now().date(), mvp_type, datetime.now(), data['player_id']))
        
        # Update MVP rotation tracking
        cursor.execute('SELECT MAX(rotation_cycle) FROM mvp_rotation')
        current_cycle = cursor.fetchone()[0] or 0
        
        # Mark player as having been MVP in current cycle
        cursor.execute('''
            UPDATE mvp_rotation 
            SET has_been_mvp = 1
            WHERE player_id = ? AND rotation_cycle = ?
        ''', (data['player_id'], current_cycle))
        
        # If no record exists for current cycle, create one
        if cursor.rowcount == 0:
            cursor.execute('''
                INSERT INTO mvp_rotation (player_id, rotation_cycle, has_been_mvp)
                VALUES (?, ?, 1)
            ''', (data['player_id'], current_cycle))
        
        # Log MVP assignment in event history
        cursor.execute('''
            INSERT INTO event_history (event_id, action, details)
            VALUES (?, 'mvp_assigned', ?)
        ''', (event_id, f"Player '{player['name']}' assigned as {mvp_type} MVP ({points} points)"))
        
        conn.commit()
        
        # Check if rotation should reset
        reset_mvp_rotation()
        
        return jsonify({'message': 'MVP assigned successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@mvp_bp.route('/next_candidates', methods=['GET'])
def get_next_mvp_candidates():
    """Get players who haven't been MVP in current rotation cycle"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current rotation cycle
    cursor.execute('SELECT MAX(rotation_cycle) FROM mvp_rotation')
    current_cycle = cursor.fetchone()[0] or 0
    
    cursor.execute('''
        SELECT p.id, p.name, p.mvp_count, p.last_mvp_date,
               a.name as alliance_name, a.tag as alliance_tag,
               COALESCE(mr.has_been_mvp, 0) as has_been_mvp_this_cycle
        FROM players p
        LEFT JOIN alliances a ON p.alliance_id = a.id
        LEFT JOIN mvp_rotation mr ON p.id = mr.player_id AND mr.rotation_cycle = ?
        WHERE p.is_active = 1
        ORDER BY 
            COALESCE(mr.has_been_mvp, 0) ASC,
            p.mvp_count ASC,
            p.last_mvp_date ASC NULLS FIRST,
            p.name ASC
    ''', (current_cycle,))
    
    candidates = []
    for row in cursor.fetchall():
        candidates.append({
            'id': row['id'],
            'name': row['name'],
            'mvp_count': row['mvp_count'],
            'last_mvp_date': row['last_mvp_date'],
            'has_been_mvp_this_cycle': bool(row['has_been_mvp_this_cycle']),
            'alliance': {
                'name': row['alliance_name'],
                'tag': row['alliance_tag']
            } if row['alliance_name'] else None,
            'priority': 'high' if not row['has_been_mvp_this_cycle'] else 'low'
        })
    
    conn.close()
    return jsonify(candidates)

@mvp_bp.route('/rotation_status', methods=['GET'])
def get_rotation_status():
    """Get current MVP rotation status"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current rotation cycle
    cursor.execute('SELECT MAX(rotation_cycle) FROM mvp_rotation')
    current_cycle = cursor.fetchone()[0] or 0
    
    # Get rotation statistics
    cursor.execute('''
        SELECT 
            COUNT(p.id) as total_active_players,
            COUNT(CASE WHEN mr.has_been_mvp = 1 THEN 1 END) as players_been_mvp,
            COUNT(CASE WHEN mr.has_been_mvp = 0 OR mr.has_been_mvp IS NULL THEN 1 END) as players_pending_mvp
        FROM players p
        LEFT JOIN mvp_rotation mr ON p.id = mr.player_id AND mr.rotation_cycle = ?
        WHERE p.is_active = 1
    ''', (current_cycle,))
    
    stats = cursor.fetchone()
    
    # Get next player in line (highest priority)
    cursor.execute('''
        SELECT p.id, p.name, p.mvp_count, p.last_mvp_date
        FROM players p
        LEFT JOIN mvp_rotation mr ON p.id = mr.player_id AND mr.rotation_cycle = ?
        WHERE p.is_active = 1
        ORDER BY 
            COALESCE(mr.has_been_mvp, 0) ASC,
            p.mvp_count ASC,
            p.last_mvp_date ASC NULLS FIRST,
            p.name ASC
        LIMIT 1
    ''', (current_cycle,))
    
    next_player = cursor.fetchone()
    
    rotation_complete = stats['players_pending_mvp'] == 0 and stats['total_active_players'] > 0
    
    result = {
        'current_cycle': current_cycle,
        'total_active_players': stats['total_active_players'],
        'players_been_mvp': stats['players_been_mvp'],
        'players_pending_mvp': stats['players_pending_mvp'],
        'rotation_complete': rotation_complete,
        'next_player': {
            'id': next_player['id'],
            'name': next_player['name'],
            'mvp_count': next_player['mvp_count'],
            'last_mvp_date': next_player['last_mvp_date']
        } if next_player else None
    }
    
    conn.close()
    return jsonify(result)

@mvp_bp.route('/history', methods=['GET'])
def get_mvp_history():
    """Get MVP assignment history"""
    limit = request.args.get('limit', 50, type=int)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT e.id as event_id, e.name as event_name, e.event_date,
               p.id as player_id, p.name as player_name,
               a.name as alliance_name, a.tag as alliance_tag
        FROM events e
        JOIN players p ON e.mvp_player_id = p.id
        LEFT JOIN alliances a ON p.alliance_id = a.id
        WHERE e.mvp_player_id IS NOT NULL
        ORDER BY e.event_date DESC, e.id DESC
        LIMIT ?
    ''', (limit,))
    
    history = []
    for row in cursor.fetchall():
        history.append({
            'event': {
                'id': row['event_id'],
                'name': row['event_name'],
                'date': row['event_date']
            },
            'player': {
                'id': row['player_id'],
                'name': row['player_name']
            },
            'alliance': {
                'name': row['alliance_name'],
                'tag': row['alliance_tag']
            } if row['alliance_name'] else None
        })
    
    conn.close()
    return jsonify(history)

@mvp_bp.route('/reset_rotation', methods=['POST'])
def manual_reset_rotation():
    """Manually reset MVP rotation cycle"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get current rotation cycle
        cursor.execute('SELECT MAX(rotation_cycle) FROM mvp_rotation')
        current_cycle = cursor.fetchone()[0] or 0
        
        # Start new rotation cycle
        new_cycle = current_cycle + 1
        cursor.execute('''
            INSERT INTO mvp_rotation (player_id, rotation_cycle, has_been_mvp)
            SELECT id, ?, 0
            FROM players
            WHERE is_active = 1
        ''', (new_cycle,))
        
        conn.commit()
        
        return jsonify({
            'message': 'MVP rotation reset successfully',
            'new_cycle': new_cycle
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@mvp_bp.route('/stats', methods=['GET'])
def get_mvp_stats():
    """Get MVP statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Overall MVP stats
    cursor.execute('''
        SELECT 
            COUNT(DISTINCT mvp_player_id) as unique_mvps,
            COUNT(*) as total_mvp_assignments,
            AVG(p.mvp_count) as avg_mvp_per_player
        FROM events e
        LEFT JOIN players p ON e.mvp_player_id = p.id
        WHERE e.mvp_player_id IS NOT NULL
    ''')
    
    overall_stats = dict(cursor.fetchone())
    
    # Top MVPs
    cursor.execute('''
        SELECT p.name, p.mvp_count, a.name as alliance_name
        FROM players p
        LEFT JOIN alliances a ON p.alliance_id = a.id
        WHERE p.mvp_count > 0
        ORDER BY p.mvp_count DESC, p.name ASC
        LIMIT 10
    ''')
    
    top_mvps = []
    for row in cursor.fetchall():
        top_mvps.append({
            'name': row['name'],
            'mvp_count': row['mvp_count'],
            'alliance': row['alliance_name']
        })
    
    conn.close()
    
    return jsonify({
        'overall': overall_stats,
        'top_mvps': top_mvps
    })

@mvp_bp.route('/types', methods=['GET'])
def get_mvp_types():
    """Get all MVP types"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT name, points, description, icon_class, color_class
        FROM mvp_types
        ORDER BY order_index ASC
    ''')
    
    types = []
    for row in cursor.fetchall():
        types.append({
            'name': row['name'],
            'points': row['points'],
            'description': row['description'],
            'icon': row['icon_class'],
            'color': row['color_class']
        })
    
    conn.close()
    return jsonify(types)