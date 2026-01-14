"""
Test suite for Folder System (Pastas) - File Repository
Tests CRUD operations for folders and file management with folders
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFolderSystem:
    """Test folder CRUD operations and file management"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ozoxx.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        """Get licensee authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado.teste@ozoxx.com",
            "password": "licenciado123"
        })
        assert response.status_code == 200, f"Licensee login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture
    def licensee_headers(self, licensee_token):
        """Headers with licensee auth"""
        return {
            "Authorization": f"Bearer {licensee_token}",
            "Content-Type": "application/json"
        }
    
    # ==================== FOLDER TESTS ====================
    
    def test_get_all_folders_admin(self, admin_headers):
        """GET /api/files/folders - Admin can list all folders"""
        response = requests.get(f"{BASE_URL}/api/files/folders", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} folders")
    
    def test_get_all_folders_licensee(self, licensee_headers):
        """GET /api/files/folders - Licensee can list all folders"""
        response = requests.get(f"{BASE_URL}/api/files/folders", headers=licensee_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_folder_admin(self, admin_headers):
        """POST /api/files/folders - Admin can create folder"""
        folder_data = {
            "name": f"TEST_Pasta_{uuid.uuid4().hex[:8]}",
            "description": "Pasta de teste automatizado",
            "icon": "📂",
            "color": "#3b82f6",
            "order": 99
        }
        response = requests.post(f"{BASE_URL}/api/files/folders", json=folder_data, headers=admin_headers)
        assert response.status_code == 200, f"Create folder failed: {response.text}"
        data = response.json()
        assert "folder" in data
        assert data["folder"]["name"] == folder_data["name"]
        assert data["folder"]["icon"] == folder_data["icon"]
        assert data["folder"]["color"] == folder_data["color"]
        assert "id" in data["folder"]
        print(f"Created folder: {data['folder']['id']}")
        return data["folder"]["id"]
    
    def test_create_folder_licensee_forbidden(self, licensee_headers):
        """POST /api/files/folders - Licensee cannot create folder (403)"""
        folder_data = {
            "name": "TEST_Unauthorized_Folder",
            "description": "Should not be created",
            "icon": "📁",
            "color": "#06b6d4",
            "order": 0
        }
        response = requests.post(f"{BASE_URL}/api/files/folders", json=folder_data, headers=licensee_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_update_folder_admin(self, admin_headers):
        """PUT /api/files/folders/{id} - Admin can update folder"""
        # First create a folder
        folder_data = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "description": "Original description",
            "icon": "📁",
            "color": "#06b6d4",
            "order": 98
        }
        create_response = requests.post(f"{BASE_URL}/api/files/folders", json=folder_data, headers=admin_headers)
        assert create_response.status_code == 200
        folder_id = create_response.json()["folder"]["id"]
        
        # Update the folder
        update_data = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:8]}",
            "description": "Updated description",
            "icon": "🗂️",
            "color": "#8b5cf6",
            "order": 97
        }
        update_response = requests.put(f"{BASE_URL}/api/files/folders/{folder_id}", json=update_data, headers=admin_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update by getting folders
        get_response = requests.get(f"{BASE_URL}/api/files/folders", headers=admin_headers)
        folders = get_response.json()
        updated_folder = next((f for f in folders if f["id"] == folder_id), None)
        assert updated_folder is not None
        assert updated_folder["name"] == update_data["name"]
        assert updated_folder["icon"] == update_data["icon"]
        print(f"Updated folder: {folder_id}")
    
    def test_update_folder_not_found(self, admin_headers):
        """PUT /api/files/folders/{id} - Returns 404 for non-existent folder"""
        update_data = {
            "name": "Non-existent",
            "description": "",
            "icon": "📁",
            "color": "#06b6d4",
            "order": 0
        }
        response = requests.put(f"{BASE_URL}/api/files/folders/non-existent-id", json=update_data, headers=admin_headers)
        assert response.status_code == 404
    
    def test_delete_folder_admin(self, admin_headers):
        """DELETE /api/files/folders/{id} - Admin can delete folder"""
        # First create a folder
        folder_data = {
            "name": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "description": "To be deleted",
            "icon": "📁",
            "color": "#ef4444",
            "order": 96
        }
        create_response = requests.post(f"{BASE_URL}/api/files/folders", json=folder_data, headers=admin_headers)
        assert create_response.status_code == 200
        folder_id = create_response.json()["folder"]["id"]
        
        # Delete the folder
        delete_response = requests.delete(f"{BASE_URL}/api/files/folders/{folder_id}", headers=admin_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/files/folders", headers=admin_headers)
        folders = get_response.json()
        deleted_folder = next((f for f in folders if f["id"] == folder_id), None)
        assert deleted_folder is None, "Folder should be deleted"
        print(f"Deleted folder: {folder_id}")
    
    def test_delete_folder_not_found(self, admin_headers):
        """DELETE /api/files/folders/{id} - Returns 404 for non-existent folder"""
        response = requests.delete(f"{BASE_URL}/api/files/folders/non-existent-id", headers=admin_headers)
        assert response.status_code == 404
    
    # ==================== FILES BY FOLDER TESTS ====================
    
    def test_get_files_by_folder_admin(self, admin_headers):
        """GET /api/files/by-folder - Admin can get files grouped by folder"""
        response = requests.get(f"{BASE_URL}/api/files/by-folder", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "folders" in data
        assert "uncategorized" in data
        assert isinstance(data["folders"], list)
        assert isinstance(data["uncategorized"], list)
        
        # Check folder structure
        for folder in data["folders"]:
            assert "id" in folder
            assert "name" in folder
            assert "files" in folder
            assert "file_count" in folder
        print(f"Found {len(data['folders'])} folders with files, {len(data['uncategorized'])} uncategorized files")
    
    def test_get_files_by_folder_licensee(self, licensee_headers):
        """GET /api/files/by-folder - Licensee can get files grouped by folder"""
        response = requests.get(f"{BASE_URL}/api/files/by-folder", headers=licensee_headers)
        assert response.status_code == 200
        data = response.json()
        assert "folders" in data
        assert "uncategorized" in data
    
    # ==================== FILE OPERATIONS WITH FOLDERS ====================
    
    def test_get_all_files(self, admin_headers):
        """GET /api/files/ - Get all files"""
        response = requests.get(f"{BASE_URL}/api/files/", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} total files")
    
    def test_get_files_filtered_by_folder(self, admin_headers):
        """GET /api/files/?folder_id=xxx - Get files filtered by folder"""
        # First get folders to find one with files
        folders_response = requests.get(f"{BASE_URL}/api/files/by-folder", headers=admin_headers)
        folders_data = folders_response.json()
        
        if folders_data["folders"]:
            folder_id = folders_data["folders"][0]["id"]
            response = requests.get(f"{BASE_URL}/api/files/?folder_id={folder_id}", headers=admin_headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            # All files should belong to the specified folder
            for file in data:
                assert file.get("folder_id") == folder_id
            print(f"Found {len(data)} files in folder {folder_id}")
    
    def test_get_categories(self, admin_headers):
        """GET /api/files/categories - Get file categories"""
        response = requests.get(f"{BASE_URL}/api/files/categories", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        for cat in data:
            assert "value" in cat
            assert "label" in cat
        print(f"Found {len(data)} categories")
    
    def test_move_file_to_folder(self, admin_headers):
        """PUT /api/files/{id} - Move file to another folder"""
        # Get files to find one to move
        files_response = requests.get(f"{BASE_URL}/api/files/", headers=admin_headers)
        files = files_response.json()
        
        if not files:
            pytest.skip("No files available to test move operation")
        
        file_to_move = files[0]
        file_id = file_to_move["id"]
        
        # Get folders
        folders_response = requests.get(f"{BASE_URL}/api/files/folders", headers=admin_headers)
        folders = folders_response.json()
        
        if not folders:
            pytest.skip("No folders available to test move operation")
        
        target_folder_id = folders[0]["id"]
        
        # Move file to folder
        response = requests.put(f"{BASE_URL}/api/files/{file_id}", json={
            "folder_id": target_folder_id
        }, headers=admin_headers)
        assert response.status_code == 200, f"Move failed: {response.text}"
        
        # Verify move
        verify_response = requests.get(f"{BASE_URL}/api/files/?folder_id={target_folder_id}", headers=admin_headers)
        files_in_folder = verify_response.json()
        moved_file = next((f for f in files_in_folder if f["id"] == file_id), None)
        assert moved_file is not None, "File should be in target folder"
        print(f"Moved file {file_id} to folder {target_folder_id}")
    
    def test_move_file_to_no_folder(self, admin_headers):
        """PUT /api/files/{id} - Move file to no folder (uncategorized)"""
        # Get files to find one to move
        files_response = requests.get(f"{BASE_URL}/api/files/", headers=admin_headers)
        files = files_response.json()
        
        if not files:
            pytest.skip("No files available to test move operation")
        
        file_to_move = files[0]
        file_id = file_to_move["id"]
        
        # Move file to no folder
        response = requests.put(f"{BASE_URL}/api/files/{file_id}", json={
            "folder_id": None
        }, headers=admin_headers)
        assert response.status_code == 200, f"Move to uncategorized failed: {response.text}"
        print(f"Moved file {file_id} to uncategorized")
    
    def test_update_file_not_found(self, admin_headers):
        """PUT /api/files/{id} - Returns 404 for non-existent file"""
        response = requests.put(f"{BASE_URL}/api/files/non-existent-id", json={
            "folder_id": "some-folder"
        }, headers=admin_headers)
        assert response.status_code == 404


class TestFolderCleanup:
    """Cleanup test folders after tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ozoxx.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_cleanup_test_folders(self, admin_token):
        """Clean up TEST_ prefixed folders"""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Get all folders
        response = requests.get(f"{BASE_URL}/api/files/folders", headers=headers)
        folders = response.json()
        
        # Delete TEST_ prefixed folders
        deleted_count = 0
        for folder in folders:
            if folder["name"].startswith("TEST_"):
                delete_response = requests.delete(f"{BASE_URL}/api/files/folders/{folder['id']}", headers=headers)
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test folders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
