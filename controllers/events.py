"""
Event management controller
Handles CRUD operations for events
"""

from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from datetime import datetime
import sqlite3

events_bp = Blueprint('events', __name__)

@events_bp.route('/', methods=['GET'])
def get_events():
    """Get all events with MVP and winner information"""
    status_filter = request.args.get('status')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT e.id, e.name, e.description, e.event_date, e.status, e.mvp_type,
               p.name as mvp_name, p.id as mvp_id,
               a.name as winner_alliance_name, a.id as winner_alliance_id, a.tag as winner_alliance_tag,
               mt.icon_class as mvp_icon, mt.color_class as mvp_color, mt.points as mvp_points
        FROM events e
        LEFT JOIN players p ON e.mvp_player_id = p.id
        LEFT JOIN alliances a ON e.winner_alliance_id = a.id
        LEFT JOIN mvp_types mt ON e.mvp_type = mt.name
    '''
    
    params = []
    if status_filter:
        query += ' WHERE e.status = ?'
        params.append(status_filter)
    
    query += ' ORDER BY e.event_date DESC'
    
    cursor.execute(query, params)
    
    events = []
    for row in cursor.fetchall():
        events.append({
            'id': row['id'],
            'name': row['name'],
            'description': row['description'],
            'event_date': row['event_date'],
            'status': row['status'],
            'mvp': {
                'id': row['mvp_id'],
                'name': row['mvp_name'],
                'type': row['mvp_type'],
                'icon': row['mvp_icon'],
                'color': row['mvp_color'],
                'points': row['mvp_points']
            } if row['mvp_id'] else None,
            'winner_alliance': {
                'id': row['winner_alliance_id'],
                'name': row['winner_alliance_name'],
                'tag': row['winner_alliance_tag']
            } if row['winner_alliance_id'] else None
        })
    
    conn.close()
    return jsonify(events)

@events_bp.route('/', methods=['POST'])
def create_event():
    """Create a new event"""
    data = request.get_json()
    
    if not data or 'name' not in data or 'event_date' not in data:
        return jsonify({'error': 'Event name and date are required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO events (name, description, event_date, status)
            VALUES (?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('description', ''),
            data['event_date'],
            data.get('status', 'upcoming')
        ))
        
        event_id = cursor.lastrowid
        
        # Log event creation
        cursor.execute('''
            INSERT INTO event_history (event_id, action, details)
            VALUES (?, 'created', ?)
        ''', (event_id, f"Event '{data['name']}' created"))
        
        conn.commit()
        
        return jsonify({
            'id': event_id,
            'name': data['name'],
            'message': 'Event created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@events_bp.route('/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    """Update event information"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if event exists
    cursor.execute('SELECT id, name FROM events WHERE id = ?', (event_id,))
    event = cursor.fetchone()
    if not event:
        conn.close()
        return jsonify({'error': 'Event not found'}), 404
    
    # Build update query dynamically
    update_fields = []
    values = []
    changes = []
    
    if 'name' in data:
        update_fields.append('name = ?')
        values.append(data['name'])
        changes.append(f"name changed to '{data['name']}'")
    
    if 'description' in data:
        update_fields.append('description = ?')
        values.append(data['description'])
        changes.append("description updated")
    
    if 'event_date' in data:
        update_fields.append('event_date = ?')
        values.append(data['event_date'])
        changes.append(f"date changed to {data['event_date']}")
    
    if 'status' in data:
        update_fields.append('status = ?')
        values.append(data['status'])
        changes.append(f"status changed to '{data['status']}'")
    
    if not update_fields:
        conn.close()
        return jsonify({'error': 'No valid fields to update'}), 400
    
    update_fields.append('updated_at = ?')
    values.append(datetime.now())
    values.append(event_id)
    
    try:
        cursor.execute(f'''
            UPDATE events 
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', values)
        
        # Log the changes
        if changes:
            cursor.execute('''
                INSERT INTO event_history (event_id, action, details)
                VALUES (?, 'updated', ?)
            ''', (event_id, '; '.join(changes)))
        
        conn.commit()
        return jsonify({'message': 'Event updated successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@events_bp.route('/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if event exists
    cursor.execute('SELECT id, name FROM events WHERE id = ?', (event_id,))
    event = cursor.fetchone()
    if not event:
        conn.close()
        return jsonify({'error': 'Event not found'}), 404
    
    # Log deletion before deleting
    cursor.execute('''
        INSERT INTO event_history (event_id, action, details)
        VALUES (?, 'deleted', ?)
    ''', (event_id, f"Event '{event['name']}' was deleted"))
    
    # Delete the event
    cursor.execute('DELETE FROM events WHERE id = ?', (event_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Event deleted successfully'})

@events_bp.route('/<int:event_id>/assign_winner', methods=['POST'])
def assign_winner(event_id):
    """Assign winner alliance to an event"""
    data = request.get_json()
    
    if not data or 'alliance_id' not in data:
        return jsonify({'error': 'Alliance ID is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if event exists
    cursor.execute('SELECT id, name FROM events WHERE id = ?', (event_id,))
    event = cursor.fetchone()
    if not event:
        conn.close()
        return jsonify({'error': 'Event not found'}), 404
    
    # Check if alliance exists and is not blacklisted
    cursor.execute('SELECT id, name, is_blacklisted FROM alliances WHERE id = ?', (data['alliance_id'],))
    alliance = cursor.fetchone()
    if not alliance:
        conn.close()
        return jsonify({'error': 'Alliance not found'}), 404
    
    if alliance['is_blacklisted']:
        conn.close()
        return jsonify({'error': 'Cannot assign winner to blacklisted alliance'}), 400
    
    try:
        # Update event with winner
        cursor.execute('''
            UPDATE events 
            SET winner_alliance_id = ?, updated_at = ?
            WHERE id = ?
        ''', (data['alliance_id'], datetime.now(), event_id))
        
        # Increment alliance wins count
        cursor.execute('''
            UPDATE alliances 
            SET wins_count = wins_count + 1, updated_at = ?
            WHERE id = ?
        ''', (datetime.now(), data['alliance_id']))
        
        # Log the winner assignment
        cursor.execute('''
            INSERT INTO event_history (event_id, action, details)
            VALUES (?, 'winner_assigned', ?)
        ''', (event_id, f"Alliance '{alliance['name']}' assigned as winner"))
        
        conn.commit()
        return jsonify({'message': 'Winner assigned successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@events_bp.route('/<int:event_id>/history', methods=['GET'])
def get_event_history(event_id):
    """Get event history"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT action, details, timestamp
        FROM event_history
        WHERE event_id = ?
        ORDER BY timestamp DESC
    ''', (event_id,))
    
    history = []
    for row in cursor.fetchall():
        history.append({
            'action': row['action'],
            'details': row['details'],
            'timestamp': row['timestamp']
        })
    
    conn.close()
    return jsonify(history)

@events_bp.route('/upcoming', methods=['GET'])
def get_upcoming_events():
    """Get upcoming events"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT e.id, e.name, e.description, e.event_date,
               p.name as mvp_name, p.id as mvp_id
        FROM events e
        LEFT JOIN players p ON e.mvp_player_id = p.id
        WHERE e.status = 'upcoming'
        ORDER BY e.event_date ASC
    ''')
    
    events = []
    for row in cursor.fetchall():
        events.append({
            'id': row['id'],
            'name': row['name'],
            'description': row['description'],
            'event_date': row['event_date'],
            'mvp': {
                'id': row['mvp_id'],
                'name': row['mvp_name']
            } if row['mvp_id'] else None
        })
    
    conn.close()
    return jsonify(events)

@events_bp.route('/stats', methods=['GET'])
def get_event_stats():
    """Get event statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            COUNT(*) as total_events,
            COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_events,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
            COUNT(CASE WHEN mvp_player_id IS NOT NULL THEN 1 END) as events_with_mvp,
            COUNT(CASE WHEN winner_alliance_id IS NOT NULL THEN 1 END) as events_with_winner
        FROM events
    ''')
    
    stats = dict(cursor.fetchone())
    conn.close()
    
    return jsonify(stats)