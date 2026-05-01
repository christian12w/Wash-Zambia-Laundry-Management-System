#!/usr/bin/env python3
"""
Simple HTTP Server for Wash Zambia Laundry System
Provides file-based database operations
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
from datetime import datetime

class LaundryHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.db_file = 'database.json'
        super().__init__(*args, **kwargs)

    def load_database(self):
        """Load database from file"""
        try:
            if os.path.exists(self.db_file):
                with open(self.db_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Create initial database
                initial_data = {
                    "sales": [],
                    "customers": [],
                    "expenses": [],
                    "users": [
                        {
                            "username": "admin",
                            "password": "admin123",
                            "role": "admin"
                        }
                    ],
                    "version": "1.0",
                    "lastUpdated": datetime.now().strftime('%Y-%m-%d')
                }
                self.save_database(initial_data)
                return initial_data
        except Exception as e:
            print(f"Error loading database: {e}")
            return {"sales": [], "customers": [], "expenses": [], "users": []}

    def save_database(self, data):
        """Save database to file"""
        try:
            data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')
            with open(self.db_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving database: {e}")
            return False

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/database':
            # Serve entire database
            data = self.load_database()
            self.send_json_response(data)
        elif parsed_path.path.startswith('/api/'):
            # Serve specific collection
            collection = parsed_path.path.split('/')[-1]
            data = self.load_database()
            if collection in data:
                self.send_json_response(data[collection])
            else:
                self.send_error(404, "Collection not found")
        else:
            # Serve static files
            super().do_GET()

    def do_POST(self):
        """Handle POST requests for database operations"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            parsed_path = urlparse(self.path)
            
            if parsed_path.path == '/api/database/save':
                # Save entire database
                if self.save_database(data):
                    self.send_json_response({"success": True, "message": "Database saved"})
                else:
                    self.send_json_response({"success": False, "message": "Save failed"})
            elif parsed_path.path.startswith('/api/'):
                # Add to specific collection
                collection = parsed_path.path.split('/')[-1]
                db_data = self.load_database()
                
                if collection not in db_data:
                    db_data[collection] = []
                
                # Generate ID if not provided
                if 'id' not in data:
                    data['id'] = str(int(datetime.now().timestamp() * 1000))
                
                db_data[collection].append(data)
                
                if self.save_database(db_data):
                    self.send_json_response({"success": True, "data": data})
                else:
                    self.send_json_response({"success": False, "message": "Save failed"})
            else:
                self.send_error(404, "Endpoint not found")
                
        except Exception as e:
            self.send_json_response({"success": False, "message": str(e)})

    def do_PUT(self):
        """Handle PUT requests for updating records"""
        content_length = int(self.headers['Content-Length'])
        put_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(put_data.decode('utf-8'))
            parsed_path = urlparse(self.path)
            
            if parsed_path.path.startswith('/api/'):
                path_parts = parsed_path.path.split('/')
                collection = path_parts[2]
                record_id = path_parts[3] if len(path_parts) > 3 else None
                
                if record_id:
                    db_data = self.load_database()
                    if collection in db_data:
                        # Find and update the record
                        for i, record in enumerate(db_data[collection]):
                            if record.get('id') == record_id:
                                db_data[collection][i] = {**record, **data}
                                if self.save_database(db_data):
                                    self.send_json_response({"success": True, "data": db_data[collection][i]})
                                return
                        
                        self.send_json_response({"success": False, "message": "Record not found"})
                    else:
                        self.send_error(404, "Collection not found")
                else:
                    self.send_error(400, "Record ID required")
            else:
                self.send_error(404, "Endpoint not found")
                
        except Exception as e:
            self.send_json_response({"success": False, "message": str(e)})

    def do_DELETE(self):
        """Handle DELETE requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/'):
            path_parts = parsed_path.path.split('/')
            collection = path_parts[2]
            record_id = path_parts[3] if len(path_parts) > 3 else None
            
            if record_id:
                db_data = self.load_database()
                if collection in db_data:
                    # Find and delete the record
                    for i, record in enumerate(db_data[collection]):
                        if record.get('id') == record_id:
                            deleted = db_data[collection].pop(i)
                            if self.save_database(db_data):
                                self.send_json_response({"success": True, "data": deleted})
                            return
                    
                    self.send_json_response({"success": False, "message": "Record not found"})
                else:
                    self.send_error(404, "Collection not found")
            else:
                self.send_error(400, "Record ID required")
        else:
            self.send_error(404, "Endpoint not found")

    def send_json_response(self, data, status_code=200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server(port=8000):
    """Start the server"""
    handler = LaundryHTTPRequestHandler
    
    print(f"Wash Zambia Laundry System Server")
    print(f"Server running at: http://localhost:{port}")
    print(f"Database file: {os.path.abspath('database.json')}")
    print(f"API endpoints available:")
    print(f"   GET  /api/database - Get entire database")
    print(f"   GET  /api/sales - Get all sales")
    print(f"   GET  /api/customers - Get all customers")
    print(f"   POST /api/sales - Add new sale")
    print(f"   PUT  /api/sales/{id} - Update sale")
    print(f"   DELETE /api/sales/{id} - Delete sale")
    print(f"   Press Ctrl+C to stop server")
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            httpd.server_close()

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
