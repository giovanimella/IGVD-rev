"""
Test suite for Levels API - Admin Levels Management Feature
Tests CRUD operations for gamification levels
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ozoxx.com"
ADMIN_PASSWORD = "admin123"

class TestLevelsAPI:
    """Test suite for /api/levels endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.auth_token = token
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        yield
        
        # Cleanup: Delete any test levels created
        self._cleanup_test_levels()
    
    def _cleanup_test_levels(self):
        """Remove test levels created during tests"""
        try:
            response = self.session.get(f"{BASE_URL}/api/levels/")
            if response.status_code == 200:
                levels = response.json()
                for level in levels:
                    if level.get("title", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/levels/{level['id']}")
        except Exception:
            pass
    
    # ==================== GET /api/levels/ ====================
    
    def test_get_all_levels_returns_200(self):
        """GET /api/levels/ - Should return list of levels"""
        response = self.session.get(f"{BASE_URL}/api/levels/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify levels are sorted by min_points
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i]["min_points"] <= data[i + 1]["min_points"], \
                    "Levels should be sorted by min_points ascending"
    
    def test_get_all_levels_structure(self):
        """GET /api/levels/ - Verify response structure"""
        response = self.session.get(f"{BASE_URL}/api/levels/")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            level = data[0]
            # Verify required fields
            assert "id" in level
            assert "title" in level
            assert "min_points" in level
            assert "icon" in level
            assert "color" in level
            assert "order" in level
            assert "created_at" in level
            assert "updated_at" in level
    
    def test_get_all_levels_no_auth_required(self):
        """GET /api/levels/ - Should work without authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/levels/")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    # ==================== GET /api/levels/{level_id} ====================
    
    def test_get_single_level_returns_200(self):
        """GET /api/levels/{id} - Should return specific level"""
        # First get all levels to get a valid ID
        all_levels = self.session.get(f"{BASE_URL}/api/levels/").json()
        
        if len(all_levels) > 0:
            level_id = all_levels[0]["id"]
            response = self.session.get(f"{BASE_URL}/api/levels/{level_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == level_id
    
    def test_get_nonexistent_level_returns_404(self):
        """GET /api/levels/{id} - Should return 404 for invalid ID"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/levels/{fake_id}")
        
        assert response.status_code == 404
    
    # ==================== POST /api/levels/ ====================
    
    def test_create_level_success(self):
        """POST /api/levels/ - Should create new level"""
        unique_points = 99999  # Unique points to avoid conflicts
        payload = {
            "title": f"TEST_Level_{uuid.uuid4().hex[:8]}",
            "min_points": unique_points,
            "icon": "🎯",
            "color": "#22c55e",
            "description": "Test level description"
        }
        
        response = self.session.post(f"{BASE_URL}/api/levels/", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response data
        assert data["title"] == payload["title"]
        assert data["min_points"] == payload["min_points"]
        assert data["icon"] == payload["icon"]
        assert data["color"] == payload["color"]
        assert data["description"] == payload["description"]
        assert "id" in data
        assert "created_at" in data
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/levels/{data['id']}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == payload["title"]
    
    def test_create_level_requires_auth(self):
        """POST /api/levels/ - Should require admin authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        payload = {
            "title": "TEST_Unauthorized",
            "min_points": 88888
        }
        
        response = no_auth_session.post(f"{BASE_URL}/api/levels/", json=payload)
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]
    
    def test_create_level_duplicate_title_rejected(self):
        """POST /api/levels/ - Should reject duplicate titles"""
        # Get existing level title
        all_levels = self.session.get(f"{BASE_URL}/api/levels/").json()
        
        if len(all_levels) > 0:
            existing_title = all_levels[0]["title"]
            payload = {
                "title": existing_title,
                "min_points": 77777  # Different points
            }
            
            response = self.session.post(f"{BASE_URL}/api/levels/", json=payload)
            
            assert response.status_code == 400
            assert "título" in response.json().get("detail", "").lower() or "title" in response.json().get("detail", "").lower()
    
    def test_create_level_duplicate_points_rejected(self):
        """POST /api/levels/ - Should reject duplicate min_points"""
        # Get existing level points
        all_levels = self.session.get(f"{BASE_URL}/api/levels/").json()
        
        if len(all_levels) > 0:
            existing_points = all_levels[0]["min_points"]
            payload = {
                "title": f"TEST_DuplicatePoints_{uuid.uuid4().hex[:8]}",
                "min_points": existing_points  # Same points
            }
            
            response = self.session.post(f"{BASE_URL}/api/levels/", json=payload)
            
            assert response.status_code == 400
            assert "pontos" in response.json().get("detail", "").lower() or "points" in response.json().get("detail", "").lower()
    
    def test_create_level_default_values(self):
        """POST /api/levels/ - Should use default icon and color"""
        payload = {
            "title": f"TEST_Defaults_{uuid.uuid4().hex[:8]}",
            "min_points": 66666
        }
        
        response = self.session.post(f"{BASE_URL}/api/levels/", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify defaults
        assert data["icon"] == "⭐"  # Default icon
        assert data["color"] == "#3b82f6"  # Default color (blue)
    
    # ==================== PUT /api/levels/{level_id} ====================
    
    def test_update_level_success(self):
        """PUT /api/levels/{id} - Should update existing level"""
        # First create a test level
        create_payload = {
            "title": f"TEST_ToUpdate_{uuid.uuid4().hex[:8]}",
            "min_points": 55555,
            "icon": "🌱",
            "color": "#6b7280"
        }
        create_response = self.session.post(f"{BASE_URL}/api/levels/", json=create_payload)
        assert create_response.status_code == 200
        level_id = create_response.json()["id"]
        
        # Update the level
        update_payload = {
            "title": f"TEST_Updated_{uuid.uuid4().hex[:8]}",
            "icon": "🚀",
            "color": "#ef4444"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/levels/{level_id}", json=update_payload)
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["title"] == update_payload["title"]
        assert data["icon"] == update_payload["icon"]
        assert data["color"] == update_payload["color"]
        assert data["min_points"] == create_payload["min_points"]  # Unchanged
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/levels/{level_id}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == update_payload["title"]
    
    def test_update_level_requires_auth(self):
        """PUT /api/levels/{id} - Should require admin authentication"""
        all_levels = self.session.get(f"{BASE_URL}/api/levels/").json()
        
        if len(all_levels) > 0:
            level_id = all_levels[0]["id"]
            
            no_auth_session = requests.Session()
            no_auth_session.headers.update({"Content-Type": "application/json"})
            
            response = no_auth_session.put(f"{BASE_URL}/api/levels/{level_id}", json={
                "title": "Unauthorized Update"
            })
            
            assert response.status_code in [401, 403]
    
    def test_update_nonexistent_level_returns_404(self):
        """PUT /api/levels/{id} - Should return 404 for invalid ID"""
        fake_id = str(uuid.uuid4())
        response = self.session.put(f"{BASE_URL}/api/levels/{fake_id}", json={
            "title": "Nonexistent"
        })
        
        assert response.status_code == 404
    
    # ==================== DELETE /api/levels/{level_id} ====================
    
    def test_delete_level_success(self):
        """DELETE /api/levels/{id} - Should delete level"""
        # First create a test level
        create_payload = {
            "title": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "min_points": 44444
        }
        create_response = self.session.post(f"{BASE_URL}/api/levels/", json=create_payload)
        assert create_response.status_code == 200
        level_id = create_response.json()["id"]
        
        # Delete the level
        delete_response = self.session.delete(f"{BASE_URL}/api/levels/{level_id}")
        
        assert delete_response.status_code == 200
        assert "sucesso" in delete_response.json().get("message", "").lower() or "success" in delete_response.json().get("message", "").lower()
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/levels/{level_id}")
        assert get_response.status_code == 404
    
    def test_delete_level_requires_auth(self):
        """DELETE /api/levels/{id} - Should require admin authentication"""
        all_levels = self.session.get(f"{BASE_URL}/api/levels/").json()
        
        if len(all_levels) > 0:
            level_id = all_levels[0]["id"]
            
            no_auth_session = requests.Session()
            response = no_auth_session.delete(f"{BASE_URL}/api/levels/{level_id}")
            
            assert response.status_code in [401, 403]
    
    def test_delete_nonexistent_level_returns_404(self):
        """DELETE /api/levels/{id} - Should return 404 for invalid ID"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/levels/{fake_id}")
        
        assert response.status_code == 404
    
    # ==================== POST /api/levels/seed ====================
    
    def test_seed_levels_requires_auth(self):
        """POST /api/levels/seed - Should require admin authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.post(f"{BASE_URL}/api/levels/seed")
        
        assert response.status_code in [401, 403]
    
    def test_seed_levels_when_levels_exist(self):
        """POST /api/levels/seed - Should not create duplicates when levels exist"""
        # First verify levels exist
        all_levels = self.session.get(f"{BASE_URL}/api/levels/").json()
        initial_count = len(all_levels)
        
        if initial_count > 0:
            # Try to seed again
            response = self.session.post(f"{BASE_URL}/api/levels/seed")
            
            assert response.status_code == 200
            assert "existem" in response.json().get("message", "").lower() or "exist" in response.json().get("message", "").lower()
            
            # Verify count unchanged
            after_levels = self.session.get(f"{BASE_URL}/api/levels/").json()
            assert len(after_levels) == initial_count


class TestLevelsValidation:
    """Test input validation for levels API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed")
        
        yield
        
        # Cleanup
        self._cleanup_test_levels()
    
    def _cleanup_test_levels(self):
        """Remove test levels"""
        try:
            response = self.session.get(f"{BASE_URL}/api/levels/")
            if response.status_code == 200:
                for level in response.json():
                    if level.get("title", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/levels/{level['id']}")
        except Exception:
            pass
    
    def test_create_level_missing_title(self):
        """POST /api/levels/ - Should reject missing title"""
        payload = {
            "min_points": 33333
        }
        
        response = self.session.post(f"{BASE_URL}/api/levels/", json=payload)
        
        # Should return 422 (validation error)
        assert response.status_code == 422
    
    def test_create_level_missing_min_points(self):
        """POST /api/levels/ - Should reject missing min_points"""
        payload = {
            "title": "TEST_NoPoints"
        }
        
        response = self.session.post(f"{BASE_URL}/api/levels/", json=payload)
        
        # Should return 422 (validation error)
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
