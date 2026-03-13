"""
CRM Prospects API Tests
Testing CRUD operations for leads, pipeline, dashboard metrics
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCRMAuth:
    """CRM authentication tests - Licensee role required"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for licensee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API calls"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_as_licensee(self):
        """Verify licensee can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "licenciado"


class TestCRMLeadsCRUD:
    """Lead CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for licensee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API calls"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture
    def test_lead_data(self):
        """Sample lead data for tests"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "name": f"TEST_Lead_{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "phone": "11999999999",
            "city": "São Paulo",
            "state": "SP",
            "origin": "indicacao",
            "priority": "media",
            "estimated_value": 5000.00,
            "notes": "Lead de teste automatizado"
        }
    
    def test_create_lead(self, headers, test_lead_data):
        """Test creating a new lead - POST /api/crm/leads"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json=test_lead_data
        )
        assert response.status_code == 200, f"Create lead failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert data["success"] == True
        assert "lead" in data
        assert data["lead"]["name"] == test_lead_data["name"]
        assert data["lead"]["email"] == test_lead_data["email"]
        assert data["lead"]["phone"] == test_lead_data["phone"]
        assert data["lead"]["status"] == "novo"  # Default status
        assert data["lead"]["priority"] == "media"  # Default priority
        assert "id" in data["lead"]
        
        # Cleanup - delete the lead
        lead_id = data["lead"]["id"]
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_create_lead_minimal_data(self, headers):
        """Test creating lead with only required field (name)"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": "TEST_MinimalLead"}
        )
        assert response.status_code == 200, f"Create lead failed: {response.text}"
        data = response.json()
        assert data["lead"]["name"] == "TEST_MinimalLead"
        
        # Cleanup
        lead_id = data["lead"]["id"]
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_get_lead_by_id(self, headers, test_lead_data):
        """Test getting a specific lead - GET /api/crm/leads/{id}"""
        # Create lead first
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json=test_lead_data
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Get lead
        response = requests.get(
            f"{BASE_URL}/api/crm/leads/{lead_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Get lead failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "lead" in data
        assert "activities" in data
        assert "tasks" in data
        assert data["lead"]["id"] == lead_id
        assert data["lead"]["name"] == test_lead_data["name"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_update_lead(self, headers, test_lead_data):
        """Test updating a lead - PUT /api/crm/leads/{id}"""
        # Create lead first
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json=test_lead_data
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Update lead
        update_data = {
            "name": "TEST_Updated Lead Name",
            "estimated_value": 10000.00,
            "priority": "alta"
        }
        response = requests.put(
            f"{BASE_URL}/api/crm/leads/{lead_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update lead failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert data["lead"]["name"] == "TEST_Updated Lead Name"
        assert data["lead"]["estimated_value"] == 10000.00
        assert data["lead"]["priority"] == "alta"
        
        # Verify update persisted with GET
        get_response = requests.get(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
        assert get_response.json()["lead"]["name"] == "TEST_Updated Lead Name"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_delete_lead(self, headers, test_lead_data):
        """Test deleting a lead - DELETE /api/crm/leads/{id}"""
        # Create lead first
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json=test_lead_data
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Delete lead
        response = requests.delete(
            f"{BASE_URL}/api/crm/leads/{lead_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Delete lead failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        
        # Verify deletion - should return 404
        get_response = requests.get(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
        assert get_response.status_code == 404, "Lead should not exist after deletion"
    
    def test_get_nonexistent_lead(self, headers):
        """Test getting a non-existent lead returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/crm/leads/{fake_id}",
            headers=headers
        )
        assert response.status_code == 404


class TestCRMPipeline:
    """Pipeline and Kanban board tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for licensee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API calls"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_pipeline(self, headers):
        """Test getting pipeline data - GET /api/crm/leads/pipeline"""
        response = requests.get(
            f"{BASE_URL}/api/crm/leads/pipeline",
            headers=headers
        )
        assert response.status_code == 200, f"Get pipeline failed: {response.text}"
        data = response.json()
        
        # Validate pipeline structure - all 5 stages
        assert "pipeline" in data
        assert "stats" in data
        
        pipeline = data["pipeline"]
        assert "novo" in pipeline
        assert "contato" in pipeline
        assert "negociacao" in pipeline
        assert "ganho" in pipeline
        assert "perdido" in pipeline
        
        # Validate stats structure
        stats = data["stats"]
        for stage in ["novo", "contato", "negociacao", "ganho", "perdido"]:
            assert stage in stats
            assert "count" in stats[stage]
            assert "value" in stats[stage]
    
    def test_move_lead_between_stages(self, headers):
        """Test moving lead between pipeline stages - PUT /api/crm/leads/{id}/move"""
        # Create a lead
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": "TEST_MoveLead", "estimated_value": 1000}
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Move to "contato" stage
        response = requests.put(
            f"{BASE_URL}/api/crm/leads/{lead_id}/move",
            headers=headers,
            json={"new_status": "contato"}
        )
        assert response.status_code == 200, f"Move lead failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["old_status"] == "novo"
        assert data["new_status"] == "contato"
        
        # Verify status change persisted
        get_response = requests.get(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
        assert get_response.json()["lead"]["status"] == "contato"
        
        # Move to "negociacao"
        response2 = requests.put(
            f"{BASE_URL}/api/crm/leads/{lead_id}/move",
            headers=headers,
            json={"new_status": "negociacao"}
        )
        assert response2.status_code == 200
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_move_lead_to_ganho(self, headers):
        """Test moving lead to 'ganho' (won) with sale_value"""
        # Create a lead
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": "TEST_WonLead", "estimated_value": 5000}
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Move to "ganho" with sale_value
        response = requests.put(
            f"{BASE_URL}/api/crm/leads/{lead_id}/move",
            headers=headers,
            json={"new_status": "ganho", "sale_value": 4500}
        )
        assert response.status_code == 200, f"Move to ganho failed: {response.text}"
        
        # Verify sale_value and converted_date were set
        get_response = requests.get(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
        lead = get_response.json()["lead"]
        assert lead["status"] == "ganho"
        assert lead["sale_value"] == 4500
        assert lead["converted_date"] is not None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_move_lead_to_perdido(self, headers):
        """Test moving lead to 'perdido' (lost) with lost_reason"""
        # Create a lead
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": "TEST_LostLead", "estimated_value": 3000}
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Move to "perdido" with lost_reason
        response = requests.put(
            f"{BASE_URL}/api/crm/leads/{lead_id}/move",
            headers=headers,
            json={"new_status": "perdido", "lost_reason": "Preço muito alto"}
        )
        assert response.status_code == 200, f"Move to perdido failed: {response.text}"
        
        # Verify lost_reason and lost_date were set
        get_response = requests.get(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
        lead = get_response.json()["lead"]
        assert lead["status"] == "perdido"
        assert lead["lost_reason"] == "Preço muito alto"
        assert lead["lost_date"] is not None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)


class TestCRMDashboard:
    """Dashboard and metrics tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for licensee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API calls"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_dashboard(self, headers):
        """Test getting dashboard metrics - GET /api/crm/dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/crm/dashboard",
            headers=headers
        )
        assert response.status_code == 200, f"Get dashboard failed: {response.text}"
        data = response.json()
        
        # Validate dashboard structure
        assert "total_leads" in data
        assert "converted_count" in data
        assert "lost_count" in data
        assert "in_progress_count" in data
        assert "total_converted_value" in data
        assert "total_estimated_value" in data
        assert "conversion_rate" in data
        assert "leads_this_month" in data
        assert "conversions_this_month" in data
        assert "value_this_month" in data
        assert "by_origin" in data
        assert "pending_tasks" in data
        
        # Validate types
        assert isinstance(data["total_leads"], int)
        assert isinstance(data["conversion_rate"], (int, float))
        assert isinstance(data["by_origin"], dict)
    
    def test_get_leads_stats(self, headers):
        """Test getting leads stats - GET /api/crm/leads/stats"""
        response = requests.get(
            f"{BASE_URL}/api/crm/leads/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        
        # Validate stats structure
        assert "total_leads" in data
        assert "leads_by_status" in data
        assert "value_by_status" in data
        assert "total_estimated_value" in data
        assert "total_converted_value" in data
        assert "conversion_rate" in data
        assert "leads_this_month" in data
        assert "conversions_this_month" in data


class TestCRMSearch:
    """Lead search and filtering tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for licensee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API calls"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_leads_list(self, headers):
        """Test getting leads list - GET /api/crm/leads"""
        response = requests.get(
            f"{BASE_URL}/api/crm/leads",
            headers=headers
        )
        assert response.status_code == 200, f"Get leads failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
    
    def test_search_leads_by_name(self, headers):
        """Test searching leads by name"""
        # Create a lead with specific name
        unique_name = f"TEST_SearchByName_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": unique_name, "email": "search@test.com"}
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Search by name
        response = requests.get(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            params={"search": unique_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(lead["name"] == unique_name for lead in data)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_filter_leads_by_status(self, headers):
        """Test filtering leads by status"""
        response = requests.get(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            params={"status": "novo"}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned leads should have status "novo"
        for lead in data:
            assert lead["status"] == "novo"
    
    def test_filter_leads_by_origin(self, headers):
        """Test filtering leads by origin"""
        # Create lead with specific origin
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": "TEST_OriginFilter", "origin": "whatsapp"}
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Filter by origin
        response = requests.get(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            params={"origin": "whatsapp"}
        )
        assert response.status_code == 200
        data = response.json()
        for lead in data:
            assert lead["origin"] == "whatsapp"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)


class TestCRMActivitiesAndTasks:
    """Activities and Tasks related to leads"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for licensee"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for API calls"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_activity_for_lead(self, headers):
        """Test creating an activity for a lead"""
        # Create lead
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": "TEST_ActivityLead"}
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Create activity
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/{lead_id}/activities",
            headers=headers,
            json={
                "activity_type": "call",
                "description": "Ligação de follow-up"
            }
        )
        assert response.status_code == 200, f"Create activity failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["activity"]["activity_type"] == "call"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_create_task_for_lead(self, headers):
        """Test creating a task for a lead"""
        # Create lead
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            headers=headers,
            json={"name": "TEST_TaskLead"}
        )
        lead_id = create_response.json()["lead"]["id"]
        
        # Create task
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/{lead_id}/tasks",
            headers=headers,
            json={
                "title": "Enviar proposta",
                "description": "Enviar proposta comercial",
                "due_date": "2026-02-01"
            }
        )
        assert response.status_code == 200, f"Create task failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["task"]["title"] == "Enviar proposta"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=headers)
    
    def test_get_all_tasks(self, headers):
        """Test getting all tasks - GET /api/crm/tasks"""
        response = requests.get(
            f"{BASE_URL}/api/crm/tasks",
            headers=headers
        )
        assert response.status_code == 200, f"Get tasks failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)


# Cleanup fixture - runs after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Post-test cleanup
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "licenciado@teste.com",
            "password": "senha123"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get all leads
            leads_response = requests.get(f"{BASE_URL}/api/crm/leads", headers=headers)
            if leads_response.status_code == 200:
                leads = leads_response.json()
                for lead in leads:
                    if lead["name"].startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/crm/leads/{lead['id']}", headers=headers)
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
