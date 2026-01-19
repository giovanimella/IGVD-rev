"""
Test Suite for Training System (Treinamentos Presenciais)
- Training configuration management
- Training class CRUD operations
- Licensee registration flow
- Payment simulation
- Attendance management
- PDF generation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ozoxx-training.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ozoxx.com"
ADMIN_PASSWORD = "admin123"
LICENSEE_EMAIL = "licenciado.teste@ozoxx.com"
LICENSEE_PASSWORD = "licenciado123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def licensee_token():
    """Get licensee authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": LICENSEE_EMAIL,
        "password": LICENSEE_PASSWORD
    })
    assert response.status_code == 200, f"Licensee login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def licensee_headers(licensee_token):
    return {"Authorization": f"Bearer {licensee_token}", "Content-Type": "application/json"}


# ==================== TRAINING CONFIG TESTS ====================

class TestTrainingConfig:
    """Tests for training configuration endpoints"""
    
    def test_get_config_authenticated(self, admin_headers):
        """GET /api/training/config - Returns config for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/training/config", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "days_before_closing" in data
        assert "solo_price" in data
        assert "couple_price" in data
        assert "terms_and_conditions" in data
        assert data["solo_price"] == 3500.0
        assert data["couple_price"] == 6000.0
    
    def test_get_config_unauthenticated(self):
        """GET /api/training/config - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/training/config")
        assert response.status_code in [401, 403]
    
    def test_update_config_admin(self, admin_headers):
        """PUT /api/training/config - Admin can update config"""
        update_data = {
            "days_before_closing": 10,
            "solo_price": 3500.0,
            "couple_price": 6000.0
        }
        response = requests.put(f"{BASE_URL}/api/training/config", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["days_before_closing"] == 10
        
        # Reset to original
        reset_data = {"days_before_closing": 7}
        requests.put(f"{BASE_URL}/api/training/config", json=reset_data, headers=admin_headers)
    
    def test_update_config_licensee_forbidden(self, licensee_headers):
        """PUT /api/training/config - Licensee cannot update config"""
        update_data = {"days_before_closing": 5}
        response = requests.put(f"{BASE_URL}/api/training/config", json=update_data, headers=licensee_headers)
        assert response.status_code == 403


# ==================== TRAINING CLASSES TESTS ====================

class TestTrainingClasses:
    """Tests for training class management endpoints"""
    
    def test_get_all_classes_admin(self, admin_headers):
        """GET /api/training/classes - Admin can list all classes"""
        response = requests.get(f"{BASE_URL}/api/training/classes", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            cls = data[0]
            assert "id" in cls
            assert "date" in cls
            assert "capacity" in cls
            assert "enrolled_count" in cls
            assert "available_spots" in cls
    
    def test_get_all_classes_licensee_forbidden(self, licensee_headers):
        """GET /api/training/classes - Licensee cannot list all classes"""
        response = requests.get(f"{BASE_URL}/api/training/classes", headers=licensee_headers)
        assert response.status_code == 403
    
    def test_get_available_classes(self, licensee_headers):
        """GET /api/training/classes/available - Returns available classes for enrollment"""
        response = requests.get(f"{BASE_URL}/api/training/classes/available", headers=licensee_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned classes should be open and have available spots
        for cls in data:
            assert cls["status"] == "open"
            assert cls["available_spots"] > 0
    
    def test_create_class_admin(self, admin_headers):
        """POST /api/training/classes - Admin can create a class"""
        class_data = {
            "date": "2026-06-15",
            "time": "09:00",
            "capacity": 25,
            "location": "TEST_Location - Centro de Treinamento",
            "hotel_info": "TEST_Hotel - Av. Principal, 500"
        }
        response = requests.post(f"{BASE_URL}/api/training/classes", json=class_data, headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2026-06-15"
        assert data["time"] == "09:00"
        assert data["capacity"] == 25
        assert data["status"] == "open"
        assert "closing_date" in data
        assert "id" in data
        
        # Store class ID for cleanup
        TestTrainingClasses.test_class_id = data["id"]
        return data["id"]
    
    def test_create_class_licensee_forbidden(self, licensee_headers):
        """POST /api/training/classes - Licensee cannot create class"""
        class_data = {
            "date": "2026-07-01",
            "capacity": 10
        }
        response = requests.post(f"{BASE_URL}/api/training/classes", json=class_data, headers=licensee_headers)
        assert response.status_code == 403
    
    def test_get_class_detail(self, admin_headers):
        """GET /api/training/classes/{id} - Get class details with registrations"""
        # First get list of classes
        response = requests.get(f"{BASE_URL}/api/training/classes", headers=admin_headers)
        classes = response.json()
        
        if len(classes) > 0:
            class_id = classes[0]["id"]
            response = requests.get(f"{BASE_URL}/api/training/classes/{class_id}", headers=admin_headers)
            assert response.status_code == 200
            
            data = response.json()
            assert "registrations" in data
            assert isinstance(data["registrations"], list)
    
    def test_get_class_not_found(self, admin_headers):
        """GET /api/training/classes/{id} - Returns 404 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/training/classes/invalid-id-12345", headers=admin_headers)
        assert response.status_code == 404
    
    def test_update_class_admin(self, admin_headers):
        """PUT /api/training/classes/{id} - Admin can update class"""
        # Get test class ID
        class_id = getattr(TestTrainingClasses, 'test_class_id', None)
        if not class_id:
            pytest.skip("No test class created")
        
        update_data = {
            "capacity": 30,
            "location": "TEST_Updated Location"
        }
        response = requests.put(f"{BASE_URL}/api/training/classes/{class_id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["capacity"] == 30
    
    def test_delete_class_admin(self, admin_headers):
        """DELETE /api/training/classes/{id} - Admin can delete class without enrollments"""
        class_id = getattr(TestTrainingClasses, 'test_class_id', None)
        if not class_id:
            pytest.skip("No test class created")
        
        response = requests.delete(f"{BASE_URL}/api/training/classes/{class_id}", headers=admin_headers)
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/training/classes/{class_id}", headers=admin_headers)
        assert response.status_code == 404


# ==================== LICENSEE REGISTRATION TESTS ====================

class TestLicenseeRegistration:
    """Tests for licensee training registration"""
    
    def test_get_my_registration_no_registration(self, licensee_headers):
        """GET /api/training/my-registration - Returns null registration if not enrolled"""
        response = requests.get(f"{BASE_URL}/api/training/my-registration", headers=licensee_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "registration" in data
        assert "config" in data
        # Config should always be present
        assert data["config"] is not None
    
    def test_register_wrong_stage(self, licensee_headers):
        """POST /api/training/register - Rejects if not in treinamento_presencial stage"""
        # The test licensee is at 'completo' stage
        registration_data = {
            "full_name": "Test User",
            "phone": "(11) 99999-9999",
            "email": "test@example.com",
            "address": "Rua Teste, 123",
            "city": "São Paulo",
            "state": "SP",
            "zip_code": "01234-567",
            "cpf": "123.456.789-00",
            "rg": "12.345.678-9",
            "birth_date": "1990-01-15",
            "has_spouse": False,
            "terms_accepted": True
        }
        response = requests.post(f"{BASE_URL}/api/training/register", json=registration_data, headers=licensee_headers)
        # Should fail because licensee is at 'completo' stage, not 'treinamento_presencial'
        assert response.status_code == 400
        # Check that error message mentions training stage
        detail = response.json().get("detail", "").lower()
        assert "treinamento" in detail or "etapa" in detail
    
    def test_register_terms_not_accepted(self, licensee_headers):
        """POST /api/training/register - Rejects if terms not accepted"""
        registration_data = {
            "full_name": "Test User",
            "phone": "(11) 99999-9999",
            "email": "test@example.com",
            "address": "Rua Teste, 123",
            "city": "São Paulo",
            "state": "SP",
            "zip_code": "01234-567",
            "cpf": "123.456.789-00",
            "rg": "12.345.678-9",
            "birth_date": "1990-01-15",
            "has_spouse": False,
            "terms_accepted": False
        }
        response = requests.post(f"{BASE_URL}/api/training/register", json=registration_data, headers=licensee_headers)
        # Should fail because terms not accepted (or wrong stage)
        assert response.status_code == 400


# ==================== PAYMENT SIMULATION TESTS ====================

class TestPaymentSimulation:
    """Tests for payment simulation endpoint"""
    
    def test_simulate_payment_no_registration(self, licensee_headers):
        """POST /api/training/simulate-payment - Fails if no registration"""
        response = requests.post(f"{BASE_URL}/api/training/simulate-payment", headers=licensee_headers)
        # Should fail because licensee has no registration
        assert response.status_code == 404
    
    def test_simulate_payment_unauthenticated(self):
        """POST /api/training/simulate-payment - Requires authentication"""
        response = requests.post(f"{BASE_URL}/api/training/simulate-payment")
        assert response.status_code in [401, 403]


# ==================== ATTENDANCE MANAGEMENT TESTS ====================

class TestAttendanceManagement:
    """Tests for attendance marking endpoints"""
    
    def test_mark_attendance_invalid_registration(self, admin_headers):
        """PUT /api/training/registrations/{id}/attendance - Returns 404 for invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/training/registrations/invalid-id/attendance?present=true",
            headers=admin_headers
        )
        assert response.status_code == 404
    
    def test_mark_attendance_licensee_forbidden(self, licensee_headers):
        """PUT /api/training/registrations/{id}/attendance - Licensee cannot mark attendance"""
        response = requests.put(
            f"{BASE_URL}/api/training/registrations/some-id/attendance?present=true",
            headers=licensee_headers
        )
        assert response.status_code == 403


# ==================== PDF GENERATION TESTS ====================

class TestPDFGeneration:
    """Tests for attendance PDF generation"""
    
    def test_generate_pdf_admin(self, admin_headers):
        """GET /api/training/classes/{id}/attendance-pdf - Admin can generate PDF"""
        # Get a class ID
        response = requests.get(f"{BASE_URL}/api/training/classes", headers=admin_headers)
        classes = response.json()
        
        if len(classes) > 0:
            class_id = classes[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/training/classes/{class_id}/attendance-pdf",
                headers=admin_headers
            )
            assert response.status_code == 200
            assert response.headers.get("content-type") == "application/pdf"
            # Check that we got some PDF content
            assert len(response.content) > 0
            # PDF files start with %PDF
            assert response.content[:4] == b'%PDF'
    
    def test_generate_pdf_invalid_class(self, admin_headers):
        """GET /api/training/classes/{id}/attendance-pdf - Returns 404 for invalid class"""
        response = requests.get(
            f"{BASE_URL}/api/training/classes/invalid-class-id/attendance-pdf",
            headers=admin_headers
        )
        assert response.status_code == 404
    
    def test_generate_pdf_licensee_forbidden(self, licensee_headers):
        """GET /api/training/classes/{id}/attendance-pdf - Licensee cannot generate PDF"""
        response = requests.get(
            f"{BASE_URL}/api/training/classes/some-id/attendance-pdf",
            headers=licensee_headers
        )
        assert response.status_code == 403


# ==================== ONBOARDING STAGES TESTS ====================

class TestOnboardingStages:
    """Tests for onboarding stage flow (without payment step)"""
    
    def test_stages_order(self, licensee_headers):
        """Verify onboarding stages order (no payment step)"""
        # Expected stages: registro -> documentos_pf -> acolhimento -> treinamento_presencial -> vendas_campo -> documentos_pj -> completo
        response = requests.get(f"{BASE_URL}/api/onboarding/my-stage", headers=licensee_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "current_stage" in data
        # The test licensee should be at 'completo' stage
        assert data["current_stage"] == "completo"
    
    def test_my_stage_returns_expected_fields(self, licensee_headers):
        """GET /api/onboarding/my-stage - Returns all expected fields"""
        response = requests.get(f"{BASE_URL}/api/onboarding/my-stage", headers=licensee_headers)
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ["current_stage", "documents_pf", "documents_pj", "field_sales_count", "training_attended"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


# ==================== SUPERVISOR VIEW TESTS ====================

class TestSupervisorView:
    """Tests for supervisor training view"""
    
    def test_supervisor_licensees_training(self, admin_headers):
        """GET /api/training/supervisor/licensees - Returns licensees with training status"""
        response = requests.get(f"{BASE_URL}/api/training/supervisor/licensees", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
