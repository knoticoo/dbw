#!/usr/bin/env python3
"""
Kings Choice Alliance Management Web App
Main Flask application entry point
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
import json

# Import modular components
from models.database import init_db, get_db_connection
from controllers.players import players_bp
from controllers.events import events_bp
from controllers.alliances import alliances_bp
from controllers.mvp import mvp_bp
from controllers.guides import guides_bp

def create_app():
    app = Flask(__name__)
    app.secret_key = 'kings_choice_alliance_management_2024'
    
    # Enable CORS for API endpoints
    CORS(app)
    
    # Initialize database
    init_db()
    
    # Register blueprints (modular controllers)
    app.register_blueprint(players_bp, url_prefix='/api/players')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(alliances_bp, url_prefix='/api/alliances')
    app.register_blueprint(mvp_bp, url_prefix='/api/mvp')
    app.register_blueprint(guides_bp, url_prefix='/guides')
    
    @app.route('/')
    def index():
        """Main dashboard"""
        return render_template('index.html')
    
    @app.route('/dashboard')
    def dashboard():
        """Alliance management dashboard"""
        return render_template('dashboard.html')
    
    @app.route('/health')
    def health_check():
        """Health check endpoint"""
        return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    # Use port 5002 to avoid conflicts with your existing apps on 5000/5001
    app.run(debug=True, host='0.0.0.0', port=5002)