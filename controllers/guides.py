"""
Guides management controller
Handles guides and documentation pages
"""

from flask import Blueprint, request, jsonify, render_template
from models.database import get_db_connection
from datetime import datetime
import sqlite3
import os
import json
from werkzeug.utils import secure_filename
import uuid

guides_bp = Blueprint('guides', __name__)

# Configuration for file uploads
UPLOAD_FOLDER = 'static/uploads/guides'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_images(files):
    """Save uploaded images and return list of filenames"""
    if not files:
        return []
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    saved_files = []
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            # Generate unique filename
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
            
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)
            saved_files.append(unique_filename)
    
    return saved_files

@guides_bp.route('/', methods=['GET'])
def guides_page():
    """Render the guides page"""
    return render_template('guides.html')

@guides_bp.route('/api', methods=['GET'])
def get_guides():
    """Get all published guides"""
    category = request.args.get('category')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT id, title, content, category, order_index, images
        FROM guides
        WHERE is_published = 1
    '''
    params = []
    
    if category:
        query += ' AND category = ?'
        params.append(category)
    
    query += ' ORDER BY order_index ASC, title ASC'
    
    cursor.execute(query, params)
    
    guides = []
    for row in cursor.fetchall():
        # Parse images JSON if present
        images = []
        if row['images']:
            try:
                images = json.loads(row['images'])
            except (json.JSONDecodeError, TypeError):
                images = []
        
        guides.append({
            'id': row['id'],
            'title': row['title'],
            'content': row['content'],
            'category': row['category'],
            'order_index': row['order_index'],
            'images': images
        })
    
    conn.close()
    return jsonify(guides)

@guides_bp.route('/api', methods=['POST'])
def create_guide():
    """Create a new guide with optional image uploads"""
    # Handle both form data and JSON
    if request.is_json:
        data = request.get_json()
        images_list = data.get('images', [])
    else:
        data = request.form.to_dict()
        # Handle file uploads
        uploaded_files = request.files.getlist('images')
        images_list = save_uploaded_images(uploaded_files)
    
    if not data or 'title' not in data or 'content' not in data:
        return jsonify({'error': 'Title and content are required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Convert images list to JSON string
        images_json = json.dumps(images_list) if images_list else None
        
        cursor.execute('''
            INSERT INTO guides (title, content, category, order_index, is_published, images)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['title'],
            data['content'],
            data.get('category', 'general'),
            int(data.get('order_index', 0)),
            bool(data.get('is_published', True)),
            images_json
        ))
        
        guide_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'id': guide_id,
            'title': data['title'],
            'images': images_list,
            'message': 'Guide created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@guides_bp.route('/api/<int:guide_id>', methods=['PUT'])
def update_guide(guide_id):
    """Update a guide"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if guide exists
    cursor.execute('SELECT id FROM guides WHERE id = ?', (guide_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Guide not found'}), 404
    
    # Build update query dynamically
    update_fields = []
    values = []
    
    if 'title' in data:
        update_fields.append('title = ?')
        values.append(data['title'])
    
    if 'content' in data:
        update_fields.append('content = ?')
        values.append(data['content'])
    
    if 'category' in data:
        update_fields.append('category = ?')
        values.append(data['category'])
    
    if 'order_index' in data:
        update_fields.append('order_index = ?')
        values.append(data['order_index'])
    
    if 'is_published' in data:
        update_fields.append('is_published = ?')
        values.append(data['is_published'])
    
    if 'images' in data:
        update_fields.append('images = ?')
        images_json = json.dumps(data['images']) if data['images'] else None
        values.append(images_json)
    
    if not update_fields:
        conn.close()
        return jsonify({'error': 'No valid fields to update'}), 400
    
    update_fields.append('updated_at = ?')
    values.append(datetime.now())
    values.append(guide_id)
    
    try:
        cursor.execute(f'''
            UPDATE guides 
            SET {', '.join(update_fields)}
            WHERE id = ?
        ''', values)
        
        conn.commit()
        return jsonify({'message': 'Guide updated successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@guides_bp.route('/api/<int:guide_id>', methods=['DELETE'])
def delete_guide(guide_id):
    """Delete a guide"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if guide exists
    cursor.execute('SELECT id FROM guides WHERE id = ?', (guide_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Guide not found'}), 404
    
    # Delete the guide
    cursor.execute('DELETE FROM guides WHERE id = ?', (guide_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Guide deleted successfully'})

@guides_bp.route('/api/upload-images', methods=['POST'])
def upload_images():
    """Upload images for guides"""
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400
    
    uploaded_files = request.files.getlist('images')
    if not uploaded_files or all(f.filename == '' for f in uploaded_files):
        return jsonify({'error': 'No images selected'}), 400
    
    try:
        saved_files = save_uploaded_images(uploaded_files)
        if not saved_files:
            return jsonify({'error': 'No valid images uploaded'}), 400
        
        # Return URLs for the uploaded images
        image_urls = [f'/static/uploads/guides/{filename}' for filename in saved_files]
        
        return jsonify({
            'message': f'{len(saved_files)} images uploaded successfully',
            'images': saved_files,
            'urls': image_urls
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@guides_bp.route('/api/categories', methods=['GET'])
def get_guide_categories():
    """Get all guide categories"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT category, COUNT(*) as count
        FROM guides
        WHERE is_published = 1
        GROUP BY category
        ORDER BY category
    ''')
    
    categories = []
    for row in cursor.fetchall():
        categories.append({
            'name': row['category'],
            'count': row['count']
        })
    
    conn.close()
    return jsonify(categories)

@guides_bp.route('/game-mechanics')
def game_mechanics():
    """Game mechanics guide page"""
    return render_template('guides/game_mechanics.html')

@guides_bp.route('/alliance-strategy')
def alliance_strategy():
    """Alliance strategy guide page"""
    return render_template('guides/alliance_strategy.html')

@guides_bp.route('/mvp-system')
def mvp_system():
    """MVP system guide page"""
    return render_template('guides/mvp_system.html')