"""
Alliance management controller
Handles CRUD operations for alliances including blacklist functionality
"""

from flask import Blueprint, request, jsonify
from models.database import get_db_connection
from datetime import datetime
import sqlite3

alliances_bp = Blueprint('alliances', __name__)

@alliances_bp.route('/', methods=['GET'])
def get_alliances():
    """Get all alliances"""
    include_blacklisted = request.args.get('include_blacklisted', 'true').lower() == 'true'
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT a.id, a.name, a.tag, a.description, a.is_blacklisted, a.wins_count,
               COUNT(p.id) as member_count
        FROM alliances a
        LEFT JOIN players p ON a.id = p.alliance_id AND p.is_active = 1
    '''
    
    if not include_blacklisted:
        query += ' WHERE a.is_blacklisted = 0'
    
    query += ' GROUP BY a.id ORDER BY a.name'
    
    cursor.execute(query)
    
    alliances = []
    for row in cursor.fetchall():
        alliances.append({
            'id': row['id'],
            'name': row['name'],
            'tag': row['tag'],
            'description': row['description'],
            'is_blacklisted': bool(row['is_blacklisted']),
            'wins_count': row['wins_count'],
            'member_count': row['member_count']
        })
    
    conn.close()
    return jsonify(alliances)

@alliances_bp.route('/', methods=['POST'])
def create_alliance():
    """Create a new alliance"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Alliance name is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO alliances (name, tag, description, is_blacklisted)
            VALUES (?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('tag', ''),
            data.get('description', ''),
            data.get('is_blacklisted', False)
        ))
        
        alliance_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'id': alliance_id,
            'name': data['name'],
            'message': 'Alliance created successfully'
        }), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Alliance name already exists'}), 409
    finally:
        conn.close()

@alliances_bp.route('/<int:alliance_id>', methods=['PUT'])
def update_alliance(alliance_id):
    """Update alliance information"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if alliance exists
    cursor.execute('SELECT id FROM alliances WHERE id = ?', (alliance_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Alliance not found'}), 404
    
    # Build update query dynamically
    update_fields = []
    values = []
    
    if 'name' in data:
        update_fields.append('name = ?')
        values.append(data['name'])
    
    if 'tag' in data:
        update_fields.append('tag = ?')
        values.append(data['tag'])
    
    if 'description' in data:
        update_fields.append('description = ?')
        values.append(data['description'])
    
    if 'is_blacklisted' in data:
        update_fields.append('is_blacklisted = ?')
        values.append(data['is_blacklisted'])
    
    if not update_fields:
        conn.close()
        return jsonify({'error': 'No valid fields to update'}), 400
    
    update_fields.append('updated_at = ?')
    values.append(datetime.now())
    values.append(alliance_id)
    
    try:
        cursor.execute(f'''
            UPDATE alliances 
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', values)
        
        conn.commit()
        return jsonify({'message': 'Alliance updated successfully'})
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Alliance name already exists'}), 409
    finally:
        conn.close()

@alliances_bp.route('/<int:alliance_id>', methods=['DELETE'])
def delete_alliance(alliance_id):
    """Delete an alliance (only if no active members)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if alliance exists
    cursor.execute('SELECT id FROM alliances WHERE id = ?', (alliance_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Alliance not found'}), 404
    
    # Check if alliance has active members
    cursor.execute('''
        SELECT COUNT(*) FROM players 
        WHERE alliance_id = ? AND is_active = 1
    ''', (alliance_id,))
    
    member_count = cursor.fetchone()[0]
    
    if member_count > 0:
        conn.close()
        return jsonify({'error': 'Cannot delete alliance with active members'}), 400
    
    # Delete the alliance
    cursor.execute('DELETE FROM alliances WHERE id = ?', (alliance_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Alliance deleted successfully'})

@alliances_bp.route('/<int:alliance_id>/blacklist', methods=['POST'])
def blacklist_alliance(alliance_id):
    """Add alliance to blacklist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM alliances WHERE id = ?', (alliance_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Alliance not found'}), 404
    
    cursor.execute('''
        UPDATE alliances 
        SET is_blacklisted = 1, updated_at = ?
        WHERE id = ?
    ''', (datetime.now(), alliance_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Alliance blacklisted successfully'})

@alliances_bp.route('/<int:alliance_id>/whitelist', methods=['POST'])
def whitelist_alliance(alliance_id):
    """Remove alliance from blacklist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM alliances WHERE id = ?', (alliance_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Alliance not found'}), 404
    
    cursor.execute('''
        UPDATE alliances 
        SET is_blacklisted = 0, updated_at = ?
        WHERE id = ?
    ''', (datetime.now(), alliance_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Alliance removed from blacklist successfully'})

@alliances_bp.route('/blacklisted', methods=['GET'])
def get_blacklisted_alliances():
    """Get all blacklisted alliances"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT a.id, a.name, a.tag, a.description, a.wins_count,
               COUNT(p.id) as member_count
        FROM alliances a
        LEFT JOIN players p ON a.id = p.alliance_id AND p.is_active = 1
        WHERE a.is_blacklisted = 1
        GROUP BY a.id
        ORDER BY a.name
    ''')
    
    alliances = []
    for row in cursor.fetchall():
        alliances.append({
            'id': row['id'],
            'name': row['name'],
            'tag': row['tag'],
            'description': row['description'],
            'wins_count': row['wins_count'],
            'member_count': row['member_count']
        })
    
    conn.close()
    return jsonify(alliances)

@alliances_bp.route('/<int:alliance_id>/members', methods=['GET'])
def get_alliance_members(alliance_id):
    """Get all members of a specific alliance"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT p.id, p.name, p.is_active, p.mvp_count, p.last_mvp_date
        FROM players p
        WHERE p.alliance_id = ?
        ORDER BY p.name
    ''', (alliance_id,))
    
    members = []
    for row in cursor.fetchall():
        members.append({
            'id': row['id'],
            'name': row['name'],
            'is_active': bool(row['is_active']),
            'mvp_count': row['mvp_count'],
            'last_mvp_date': row['last_mvp_date']
        })
    
    conn.close()
    return jsonify(members)

@alliances_bp.route('/stats', methods=['GET'])
def get_alliance_stats():
    """Get alliance statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            COUNT(*) as total_alliances,
            COUNT(CASE WHEN is_blacklisted = 0 THEN 1 END) as active_alliances,
            COUNT(CASE WHEN is_blacklisted = 1 THEN 1 END) as blacklisted_alliances,
            AVG(wins_count) as avg_wins
        FROM alliances
    ''')
    
    stats = dict(cursor.fetchone())
    conn.close()
    
    return jsonify(stats)