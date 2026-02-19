"""
Test suite for Presentations and Categories features
Tests the CRM system for product presentations with daily goals and frequency ranking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-category-mgmt.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ozoxx.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
    
    def test_licensee_login(self):
        """Test licensee login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado.teste@ozoxx.com",
            "password": "licenciado123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "licenciado"


class TestCategories:
    """Category CRUD tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ozoxx.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado.teste@ozoxx.com",
            "password": "licenciado123"
        })
        return response.json()["access_token"]
    
    def test_list_categories_admin(self, admin_token):
        """Admin can list categories"""
        response = requests.get(
            f"{BASE_URL}/api/categories/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_list_categories_licensee(self, licensee_token):
        """Licensee can list categories"""
        response = requests.get(
            f"{BASE_URL}/api/categories/",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_category_admin(self, admin_token):
        """Admin can create category"""
        response = requests.post(
            f"{BASE_URL}/api/categories/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Avançados",
                "description": "Licenciados avançados",
                "color": "#10b981",
                "icon": "🚀"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Categoria criada com sucesso"
        assert data["category"]["name"] == "TEST_Avançados"
        
        # Cleanup
        category_id = data["category"]["id"]
        requests.delete(
            f"{BASE_URL}/api/categories/{category_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestPresentations:
    """Presentation CRM tests"""
    
    @pytest.fixture
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado.teste@ozoxx.com",
            "password": "licenciado123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ozoxx.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_my_presentations(self, licensee_token):
        """Licensee can get their presentations"""
        response = requests.get(
            f"{BASE_URL}/api/presentations/my",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_today_presentations(self, licensee_token):
        """Licensee can get today's presentations stats"""
        response = requests.get(
            f"{BASE_URL}/api/presentations/my/today",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "target" in data
        assert data["target"] == 2  # Daily goal is 2
        assert "completed" in data
    
    def test_get_frequency(self, licensee_token):
        """Licensee can get their frequency stats"""
        response = requests.get(
            f"{BASE_URL}/api/presentations/my/frequency",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "frequency_percentage" in data
        assert "working_days_in_month" in data
        assert "total_presentations" in data
        assert "days_with_presentations" in data


class TestFrequencyLeaderboard:
    """Frequency ranking tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@ozoxx.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_frequency_leaderboard(self, admin_token):
        """Can get frequency leaderboard"""
        response = requests.get(
            f"{BASE_URL}/api/stats/leaderboard/frequency",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If there are entries, check structure
        if len(data) > 0:
            entry = data[0]
            assert "id" in entry
            assert "full_name" in entry
            assert "frequency_percentage" in entry
            assert "rank" in entry


class TestUsersMe:
    """User profile endpoint tests"""
    
    @pytest.fixture
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado.teste@ozoxx.com",
            "password": "licenciado123"
        })
        return response.json()["access_token"]
    
    def test_get_user_profile(self, licensee_token):
        """Licensee can get their profile"""
        response = requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "licenciado.teste@ozoxx.com"
        assert data["role"] == "licenciado"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
