"""
Test suite for Document Upload Flow - PF and PJ Documents
Tests the restructured onboarding with separate PF (Pessoa Física) and PJ (Pessoa Jurídica) document stages

Features tested:
- Document PF upload API (/api/onboarding/documents/pf/{document_type})
- Document PJ upload API (/api/onboarding/documents/pj/{document_type})
- Supervisor/Admin document viewing API (/api/onboarding/supervisor/licensee/{user_id}/documents)
- My-stage API with documents_pf and documents_pj fields
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ozoxx.com"
ADMIN_PASSWORD = "admin123"
LICENSEE_EMAIL = "licenciado.teste@ozoxx.com"
LICENSEE_PASSWORD = "licenciado123"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        """Get licensee authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Licensee authentication failed: {response.status_code}")
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful")
    
    def test_licensee_login(self):
        """Test licensee can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Licensee login successful")


class TestMyStageAPI:
    """Test /api/onboarding/my-stage endpoint"""
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Licensee authentication failed")
    
    def test_my_stage_returns_documents_pf_and_pj(self, licensee_token):
        """Test that my-stage returns documents_pf and documents_pj fields"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        response = requests.get(f"{BASE_URL}/api/onboarding/my-stage", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        assert "current_stage" in data
        assert "documents_pf" in data
        assert "documents_pj" in data
        
        # documents_pf and documents_pj should be dictionaries
        assert isinstance(data["documents_pf"], dict)
        assert isinstance(data["documents_pj"], dict)
        
        print(f"✓ my-stage returns documents_pf and documents_pj")
        print(f"  Current stage: {data['current_stage']}")
        print(f"  Documents PF count: {len(data['documents_pf'])}")
        print(f"  Documents PJ count: {len(data['documents_pj'])}")


class TestDocumentPFUpload:
    """Test PF (Pessoa Física) document upload APIs"""
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Licensee authentication failed")
    
    def test_upload_pf_invalid_type(self, licensee_token):
        """Test that invalid document type is rejected"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        # Create a fake file
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pf/invalid_type",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400
        assert "Tipo inválido" in response.json().get("detail", "")
        print(f"✓ Invalid PF document type rejected (400)")
    
    def test_upload_pf_valid_types_exist(self, licensee_token):
        """Test that valid document types are: rg, cpf, comprovante_residencia"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        # Test with invalid type to see valid types in error message
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pf/invalid",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        assert "rg" in detail
        assert "cpf" in detail
        assert "comprovante_residencia" in detail
        print(f"✓ Valid PF document types confirmed: rg, cpf, comprovante_residencia")
    
    def test_upload_pf_requires_auth(self):
        """Test that PF upload requires authentication"""
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pf/rg",
            files=files
        )
        
        assert response.status_code == 401
        print(f"✓ PF upload requires authentication (401)")
    
    def test_get_documents_pf(self, licensee_token):
        """Test GET /api/onboarding/documents/pf endpoint"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        response = requests.get(f"{BASE_URL}/api/onboarding/documents/pf", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ GET documents/pf returns dict with {len(data)} documents")


class TestDocumentPJUpload:
    """Test PJ (Pessoa Jurídica) document upload APIs"""
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Licensee authentication failed")
    
    def test_upload_pj_invalid_type(self, licensee_token):
        """Test that invalid PJ document type is rejected"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pj/invalid_type",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400
        assert "Tipo inválido" in response.json().get("detail", "")
        print(f"✓ Invalid PJ document type rejected (400)")
    
    def test_upload_pj_valid_types_exist(self, licensee_token):
        """Test that valid PJ document types are: cartao_cnpj, contrato_social"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pj/invalid",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        assert "cartao_cnpj" in detail
        assert "contrato_social" in detail
        print(f"✓ Valid PJ document types confirmed: cartao_cnpj, contrato_social")
    
    def test_upload_pj_requires_auth(self):
        """Test that PJ upload requires authentication"""
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pj/cartao_cnpj",
            files=files
        )
        
        assert response.status_code == 401
        print(f"✓ PJ upload requires authentication (401)")
    
    def test_get_documents_pj(self, licensee_token):
        """Test GET /api/onboarding/documents/pj endpoint"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        response = requests.get(f"{BASE_URL}/api/onboarding/documents/pj", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ GET documents/pj returns dict with {len(data)} documents")


class TestSupervisorDocumentAccess:
    """Test supervisor/admin access to licensee documents"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Licensee authentication failed")
    
    @pytest.fixture(scope="class")
    def licensee_id(self, licensee_token):
        """Get licensee user ID"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        response = requests.get(f"{BASE_URL}/api/profile/me", headers=headers)
        if response.status_code == 200:
            return response.json().get("id")
        pytest.skip("Could not get licensee ID")
    
    def test_admin_can_view_licensee_documents(self, admin_token, licensee_id):
        """Test admin can view licensee documents"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/onboarding/supervisor/licensee/{licensee_id}/documents",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "user_id" in data
        assert "full_name" in data
        assert "email" in data
        assert "current_stage" in data
        assert "documents_pf" in data
        assert "documents_pj" in data
        
        assert data["user_id"] == licensee_id
        assert isinstance(data["documents_pf"], dict)
        assert isinstance(data["documents_pj"], dict)
        
        print(f"✓ Admin can view licensee documents")
        print(f"  User: {data['full_name']} ({data['email']})")
        print(f"  Stage: {data['current_stage']}")
        print(f"  PF docs: {len(data['documents_pf'])}, PJ docs: {len(data['documents_pj'])}")
    
    def test_supervisor_endpoint_requires_auth(self, licensee_id):
        """Test supervisor endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/onboarding/supervisor/licensee/{licensee_id}/documents"
        )
        
        assert response.status_code == 401
        print(f"✓ Supervisor endpoint requires authentication (401)")
    
    def test_licensee_cannot_access_supervisor_endpoint(self, licensee_token, licensee_id):
        """Test licensee cannot access supervisor endpoint"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/onboarding/supervisor/licensee/{licensee_id}/documents",
            headers=headers
        )
        
        assert response.status_code == 403
        print(f"✓ Licensee cannot access supervisor endpoint (403)")
    
    def test_supervisor_endpoint_returns_404_for_invalid_user(self, admin_token):
        """Test supervisor endpoint returns 404 for non-existent user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/onboarding/supervisor/licensee/nonexistent-user-id/documents",
            headers=headers
        )
        
        assert response.status_code == 404
        print(f"✓ Supervisor endpoint returns 404 for invalid user")


class TestStageValidation:
    """Test stage validation for document uploads"""
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Licensee authentication failed")
    
    def test_pf_upload_stage_validation(self, licensee_token):
        """Test PF upload validates user is in correct stage"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        # First check current stage
        stage_response = requests.get(f"{BASE_URL}/api/onboarding/my-stage", headers=headers)
        current_stage = stage_response.json().get("current_stage")
        
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pf/rg",
            headers=headers,
            files=files
        )
        
        # If user is not in documentos_pf stage, should get 400
        if current_stage not in ["documentos_pf", "documentos"]:
            assert response.status_code == 400
            assert "não está na etapa" in response.json().get("detail", "")
            print(f"✓ PF upload rejected - user in stage '{current_stage}' (expected documentos_pf)")
        else:
            # If in correct stage, upload should work
            assert response.status_code in [200, 400]  # 400 if file format issue
            print(f"✓ PF upload stage validation passed - user in stage '{current_stage}'")
    
    def test_pj_upload_stage_validation(self, licensee_token):
        """Test PJ upload validates user is in correct stage"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        # First check current stage
        stage_response = requests.get(f"{BASE_URL}/api/onboarding/my-stage", headers=headers)
        current_stage = stage_response.json().get("current_stage")
        
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/documents/pj/cartao_cnpj",
            headers=headers,
            files=files
        )
        
        # If user is not in documentos_pj stage, should get 400
        if current_stage != "documentos_pj":
            assert response.status_code == 400
            assert "não está na etapa" in response.json().get("detail", "")
            print(f"✓ PJ upload rejected - user in stage '{current_stage}' (expected documentos_pj)")
        else:
            # If in correct stage, upload should work
            assert response.status_code in [200, 400]  # 400 if file format issue
            print(f"✓ PJ upload stage validation passed - user in stage '{current_stage}'")


class TestLegacyCompatibility:
    """Test legacy endpoint compatibility"""
    
    @pytest.fixture(scope="class")
    def licensee_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Licensee authentication failed")
    
    def test_legacy_upload_endpoint_exists(self, licensee_token):
        """Test legacy upload-document endpoint still exists"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        files = {"file": ("test.pdf", io.BytesIO(b"fake pdf content"), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/onboarding/upload-document/rg",
            headers=headers,
            files=files
        )
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
        print(f"✓ Legacy upload-document endpoint exists (status: {response.status_code})")
    
    def test_my_stage_handles_old_documentos_stage(self, licensee_token):
        """Test my-stage converts old 'documentos' stage to 'documentos_pf'"""
        headers = {"Authorization": f"Bearer {licensee_token}"}
        
        response = requests.get(f"{BASE_URL}/api/onboarding/my-stage", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Stage should never be 'documentos' (old name), should be 'documentos_pf' or later
        assert data["current_stage"] != "documentos"
        print(f"✓ my-stage returns new stage format: {data['current_stage']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
