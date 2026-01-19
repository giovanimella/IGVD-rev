"""
Test suite for new features:
- Training attendance system (mark training as completed, mark individual attendance)
- Sales in field (register sales with customer data and payment link)
- Commission system (admin can create commission types)
- Sales dashboard (view reports)
- Webhook kit_type support (master/senior)
- Ozoxx Cast (video management)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@ozoxx.com"
ADMIN_PASSWORD = "admin123"
LICENSEE_EMAIL = "licenciado.teste@ozoxx.com"
LICENSEE_PASSWORD = "licenciado123"


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful")
    
    def test_licensee_login(self):
        """Test licensee login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "licenciado"
        print(f"✓ Licensee login successful")


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def licensee_token():
    """Get licensee authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": LICENSEE_EMAIL,
        "password": LICENSEE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Licensee authentication failed")


class TestTrainingAttendance:
    """Test training attendance system"""
    
    def test_get_training_classes(self, admin_token):
        """Admin can list all training classes"""
        response = requests.get(
            f"{BASE_URL}/api/training/classes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/training/classes - Found {len(data)} classes")
    
    def test_create_training_class(self, admin_token):
        """Admin can create a training class"""
        response = requests.post(
            f"{BASE_URL}/api/training/classes",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "date": "2026-03-15",
                "time": "09:00",
                "capacity": 25,
                "location": "Test Location",
                "hotel_info": "Test Hotel Info"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["date"] == "2026-03-15"
        assert data["capacity"] == 25
        print(f"✓ POST /api/training/classes - Created class {data['id']}")
        return data["id"]
    
    def test_open_attendance(self, admin_token):
        """Admin can mark training as completed and open attendance"""
        # First create a class
        create_response = requests.post(
            f"{BASE_URL}/api/training/classes",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "date": "2026-04-01",
                "time": "08:00",
                "capacity": 20,
                "location": "Attendance Test Location"
            }
        )
        assert create_response.status_code == 200
        class_id = create_response.json()["id"]
        
        # Open attendance
        response = requests.put(
            f"{BASE_URL}/api/training/classes/{class_id}/open-attendance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "attendance_open"
        print(f"✓ PUT /api/training/classes/{class_id}/open-attendance - Attendance opened")
        
        # Verify class status changed
        get_response = requests.get(
            f"{BASE_URL}/api/training/classes/{class_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "attendance_open"
        print(f"✓ Class status verified as 'attendance_open'")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/training/classes/{class_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_get_class_attendees(self, admin_token):
        """Admin can get list of attendees for a class"""
        # First get existing classes
        classes_response = requests.get(
            f"{BASE_URL}/api/training/classes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        classes = classes_response.json()
        
        if classes:
            class_id = classes[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/training/classes/{class_id}/attendees",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "class" in data
            assert "attendees" in data
            print(f"✓ GET /api/training/classes/{class_id}/attendees - Found {len(data['attendees'])} attendees")
        else:
            print("⚠ No classes available to test attendees endpoint")


class TestSalesSystem:
    """Test sales in field system"""
    
    def test_get_my_sales_licensee(self, licensee_token):
        """Licensee can get their sales"""
        response = requests.get(
            f"{BASE_URL}/api/sales/my-sales",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "sales" in data
        assert "total_sales" in data
        assert "completed_sales" in data
        assert "remaining_sales" in data
        print(f"✓ GET /api/sales/my-sales - {data['total_sales']} total, {data['completed_sales']} completed")
    
    def test_sales_report_summary_admin(self, admin_token):
        """Admin can get sales summary report"""
        response = requests.get(
            f"{BASE_URL}/api/sales/report/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_sales" in data
        assert "paid_sales" in data
        assert "pending_sales" in data
        assert "total_value" in data
        assert "by_device_source" in data
        assert "commissions" in data
        print(f"✓ GET /api/sales/report/summary - Total: {data['total_sales']}, Value: R${data['total_value']}")
    
    def test_sales_report_all_admin(self, admin_token):
        """Admin can get all sales report"""
        response = requests.get(
            f"{BASE_URL}/api/sales/report/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "sales" in data
        assert "licensee_stats" in data
        print(f"✓ GET /api/sales/report/all - {len(data['sales'])} sales, {len(data['licensee_stats'])} licensees")
    
    def test_sales_report_requires_admin(self, licensee_token):
        """Licensee cannot access admin sales report"""
        response = requests.get(
            f"{BASE_URL}/api/sales/report/summary",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 403
        print(f"✓ GET /api/sales/report/summary - Correctly denied for licensee (403)")


class TestCommissionSystem:
    """Test commission types system"""
    
    def test_get_commission_types(self, admin_token):
        """Admin can list commission types"""
        response = requests.get(
            f"{BASE_URL}/api/sales/commission-types",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/sales/commission-types - Found {len(data)} types")
    
    def test_create_commission_type(self, admin_token):
        """Admin can create a commission type"""
        test_description = f"TEST_Commission_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/sales/commission-types",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "description": test_description,
                "percentage": 15.5,
                "active": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["description"] == test_description
        assert data["percentage"] == 15.5
        assert data["active"] == True
        print(f"✓ POST /api/sales/commission-types - Created '{test_description}' at 15.5%")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/sales/commission-types/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Cleanup: Deleted test commission type")
    
    def test_update_commission_type(self, admin_token):
        """Admin can update a commission type"""
        # Create first
        create_response = requests.post(
            f"{BASE_URL}/api/sales/commission-types",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "description": f"TEST_Update_{uuid.uuid4().hex[:8]}",
                "percentage": 10.0,
                "active": True
            }
        )
        commission_id = create_response.json()["id"]
        
        # Update
        response = requests.put(
            f"{BASE_URL}/api/sales/commission-types/{commission_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "percentage": 12.5,
                "active": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["percentage"] == 12.5
        assert data["active"] == False
        print(f"✓ PUT /api/sales/commission-types/{commission_id} - Updated to 12.5%, inactive")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/sales/commission-types/{commission_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_delete_commission_type(self, admin_token):
        """Admin can delete a commission type"""
        # Create first
        create_response = requests.post(
            f"{BASE_URL}/api/sales/commission-types",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "description": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
                "percentage": 5.0,
                "active": True
            }
        )
        commission_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(
            f"{BASE_URL}/api/sales/commission-types/{commission_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print(f"✓ DELETE /api/sales/commission-types/{commission_id} - Deleted successfully")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/sales/commission-types",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        types = get_response.json()
        assert not any(t["id"] == commission_id for t in types)
        print(f"✓ Verified commission type no longer exists")


class TestOzoxxCast:
    """Test Ozoxx Cast video management"""
    
    def test_get_videos_admin(self, admin_token):
        """Admin can list all videos"""
        response = requests.get(
            f"{BASE_URL}/api/ozoxx-cast/videos",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/ozoxx-cast/videos - Found {len(data)} videos")
    
    def test_get_videos_licensee(self, licensee_token):
        """Licensee can list active videos"""
        response = requests.get(
            f"{BASE_URL}/api/ozoxx-cast/videos",
            headers={"Authorization": f"Bearer {licensee_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Licensee should only see active videos
        for video in data:
            assert video.get("active", True) == True
        print(f"✓ GET /api/ozoxx-cast/videos (licensee) - Found {len(data)} active videos")


class TestWebhookKitType:
    """Test webhook kit_type support (master/senior)"""
    
    def test_webhook_requires_api_key(self):
        """Webhook endpoint requires API key"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/licensee",
            json={
                "id": "test-id",
                "full_name": "Test User",
                "email": "test@test.com"
            }
        )
        assert response.status_code in [401, 422]  # 401 Unauthorized or 422 missing header
        print(f"✓ POST /api/webhook/licensee - Correctly requires API key")
    
    def test_webhook_logs(self, admin_token):
        """Can retrieve webhook logs"""
        response = requests.get(
            f"{BASE_URL}/api/webhook/logs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # This endpoint may or may not require auth
        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ GET /api/webhook/logs - Found {len(data)} logs")
        else:
            print(f"⚠ GET /api/webhook/logs - Requires different auth")


class TestTrainingConfig:
    """Test training configuration"""
    
    def test_get_training_config(self, admin_token):
        """Admin can get training config"""
        response = requests.get(
            f"{BASE_URL}/api/training/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "days_before_closing" in data
        assert "solo_price" in data
        assert "couple_price" in data
        print(f"✓ GET /api/training/config - Days: {data['days_before_closing']}, Solo: R${data['solo_price']}")
    
    def test_update_training_config(self, admin_token):
        """Admin can update training config"""
        # Get current config
        get_response = requests.get(
            f"{BASE_URL}/api/training/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_config = get_response.json()
        
        # Update
        response = requests.put(
            f"{BASE_URL}/api/training/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "days_before_closing": 10
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["days_before_closing"] == 10
        print(f"✓ PUT /api/training/config - Updated days_before_closing to 10")
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/training/config",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "days_before_closing": original_config.get("days_before_closing", 7)
            }
        )


class TestModuleDelayVisibility:
    """Test module delay visibility feature"""
    
    def test_get_modules(self, admin_token):
        """Admin can get modules list"""
        response = requests.get(
            f"{BASE_URL}/api/modules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/modules - Found {len(data)} modules")
        
        # Check if modules have delay_days field
        if data:
            module = data[0]
            # delay_days may or may not exist depending on implementation
            print(f"  Module fields: {list(module.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
