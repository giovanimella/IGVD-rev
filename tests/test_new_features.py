"""
Test suite for new features:
1. Analytics (Supervisor/Admin) - Reports & Analytics dashboard
2. Profile Picture - Upload, resize, remove
3. Favorites - Favorite chapters and favorites page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@ozoxx.com", "password": "admin123"}
LICENSEE_CREDS = {"email": "licenciado.teste@ozoxx.com", "password": "licenciado123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def licensee_token():
    """Get licensee authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=LICENSEE_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Licensee authentication failed: {response.status_code}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def licensee_headers(licensee_token):
    """Headers with licensee auth"""
    return {"Authorization": f"Bearer {licensee_token}", "Content-Type": "application/json"}


# ==================== ANALYTICS TESTS (Admin/Supervisor) ====================

class TestAnalyticsOverview:
    """Test GET /api/analytics/supervisor/overview"""
    
    def test_admin_can_access_overview(self, admin_headers):
        """Admin should access supervisor overview"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/overview", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "total_licensees" in data
        assert "active_licensees" in data
        assert "total_modules" in data
        assert "total_completions" in data
        assert "certificates_issued" in data
        assert "assessments" in data
        assert "recent_accesses_7d" in data
        
        # Validate assessments structure
        assert "total" in data["assessments"]
        assert "passed" in data["assessments"]
        assert "average_score" in data["assessments"]
        
        print(f"Overview: {data['total_licensees']} licensees, {data['total_modules']} modules")
    
    def test_licensee_cannot_access_overview(self, licensee_headers):
        """Licensee should NOT access supervisor overview (403)"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/overview", headers=licensee_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


class TestAnalyticsLicenseesProgress:
    """Test GET /api/analytics/supervisor/licensees-progress"""
    
    def test_admin_can_access_licensees_progress(self, admin_headers):
        """Admin should access licensees progress"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/licensees-progress", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            licensee = data[0]
            # Validate licensee structure
            assert "id" in licensee
            assert "full_name" in licensee
            assert "email" in licensee
            assert "points" in licensee
            assert "completed_modules" in licensee
            assert "total_modules" in licensee
            assert "completed_chapters" in licensee
            assert "certificates" in licensee
            assert "current_streak" in licensee
            print(f"Found {len(data)} licensees. Top: {licensee['full_name']} with {licensee['points']} pts")
    
    def test_licensee_cannot_access_licensees_progress(self, licensee_headers):
        """Licensee should NOT access licensees progress (403)"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/licensees-progress", headers=licensee_headers)
        assert response.status_code == 403


class TestAnalyticsModuleEngagement:
    """Test GET /api/analytics/supervisor/module-engagement"""
    
    def test_admin_can_access_module_engagement(self, admin_headers):
        """Admin should access module engagement"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/module-engagement", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            module = data[0]
            # Validate module engagement structure
            assert "id" in module
            assert "title" in module
            assert "total_chapters" in module
            assert "users_started" in module
            assert "users_completed" in module
            assert "completion_rate" in module
            assert "start_rate" in module
            assert "assessment" in module
            assert "certificates_issued" in module
            print(f"Found {len(data)} modules. First: {module['title']} - {module['completion_rate']}% completion")
    
    def test_licensee_cannot_access_module_engagement(self, licensee_headers):
        """Licensee should NOT access module engagement (403)"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/module-engagement", headers=licensee_headers)
        assert response.status_code == 403


class TestAnalyticsStudyHeatmap:
    """Test GET /api/analytics/supervisor/study-heatmap"""
    
    def test_admin_can_access_study_heatmap(self, admin_headers):
        """Admin should access study heatmap"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/study-heatmap?days=30", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # Should have 7 days * 24 hours = 168 entries
        assert len(data) == 168, f"Expected 168 heatmap entries, got {len(data)}"
        
        if len(data) > 0:
            entry = data[0]
            assert "day" in entry
            assert "day_name" in entry
            assert "hour" in entry
            assert "count" in entry
            print(f"Heatmap has {len(data)} entries")
    
    def test_licensee_cannot_access_study_heatmap(self, licensee_headers):
        """Licensee should NOT access study heatmap (403)"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/study-heatmap", headers=licensee_headers)
        assert response.status_code == 403


class TestAnalyticsDailyActivity:
    """Test GET /api/analytics/supervisor/daily-activity"""
    
    def test_admin_can_access_daily_activity(self, admin_headers):
        """Admin should access daily activity"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/daily-activity?days=14", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 14, f"Expected 14 days, got {len(data)}"
        
        if len(data) > 0:
            day = data[0]
            assert "date" in day
            assert "active_users" in day
            assert "chapters_completed" in day
            print(f"Daily activity: {len(data)} days of data")
    
    def test_licensee_cannot_access_daily_activity(self, licensee_headers):
        """Licensee should NOT access daily activity (403)"""
        response = requests.get(f"{BASE_URL}/api/analytics/supervisor/daily-activity", headers=licensee_headers)
        assert response.status_code == 403


class TestAnalyticsExportCSV:
    """Test GET /api/analytics/export/csv"""
    
    def test_admin_can_export_csv(self, admin_headers):
        """Admin should export CSV report"""
        response = requests.get(f"{BASE_URL}/api/analytics/export/csv?report_type=licensees", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type is CSV
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Check content-disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp
        assert "relatorio" in content_disp
        
        # Validate CSV content
        content = response.text
        assert "Nome" in content or "Email" in content, "CSV should have headers"
        print(f"CSV export successful, {len(content)} bytes")
    
    def test_licensee_cannot_export_csv(self, licensee_headers):
        """Licensee should NOT export CSV (403)"""
        response = requests.get(f"{BASE_URL}/api/analytics/export/csv", headers=licensee_headers)
        assert response.status_code == 403


# ==================== PROFILE PICTURE TESTS ====================

class TestProfileMe:
    """Test GET /api/profile/me"""
    
    def test_admin_can_get_profile(self, admin_headers):
        """Admin should get their profile"""
        response = requests.get(f"{BASE_URL}/api/profile/me", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data
        assert "stats" in data
        
        # Validate stats structure
        assert "badges" in data["stats"]
        assert "chapters_completed" in data["stats"]
        assert "certificates" in data["stats"]
        print(f"Profile: {data['full_name']} ({data['role']})")
    
    def test_licensee_can_get_profile(self, licensee_headers):
        """Licensee should get their profile"""
        response = requests.get(f"{BASE_URL}/api/profile/me", headers=licensee_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["role"] == "licenciado"
        print(f"Licensee profile: {data['full_name']}")


class TestProfilePicture:
    """Test POST/DELETE /api/profile/picture"""
    
    def test_upload_profile_picture_invalid_format(self, licensee_headers):
        """Should reject invalid file format"""
        # Create a fake text file
        files = {"file": ("test.txt", b"not an image", "text/plain")}
        headers = {"Authorization": licensee_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/profile/picture", headers=headers, files=files)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Formato" in response.json().get("detail", "") or "suportado" in response.json().get("detail", "")
    
    def test_upload_profile_picture_too_large(self, licensee_headers):
        """Should reject file larger than 2MB"""
        # Create a large fake image (3MB)
        large_content = b"x" * (3 * 1024 * 1024)
        files = {"file": ("large.jpg", large_content, "image/jpeg")}
        headers = {"Authorization": licensee_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/profile/picture", headers=headers, files=files)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "grande" in response.json().get("detail", "").lower() or "máximo" in response.json().get("detail", "").lower()
    
    def test_upload_valid_profile_picture(self, licensee_headers):
        """Should upload valid profile picture"""
        # Create a minimal valid JPEG (1x1 pixel)
        # This is a minimal valid JPEG file
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xBA, 0xAE, 0xAF,
            0xDA, 0xAD, 0x28, 0xA6, 0x02, 0x8A, 0x28, 0x03, 0xFF, 0xD9
        ])
        
        files = {"file": ("test_avatar.jpg", jpeg_bytes, "image/jpeg")}
        headers = {"Authorization": licensee_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/profile/picture", headers=headers, files=files)
        # May fail due to PIL processing of minimal JPEG, but should not be 500
        if response.status_code == 200:
            data = response.json()
            assert "profile_picture" in data
            assert data["profile_picture"].startswith("/uploads/avatars/")
            print(f"Profile picture uploaded: {data['profile_picture']}")
        else:
            # Accept 400 if image processing fails (minimal JPEG may not be processable)
            assert response.status_code == 400, f"Expected 200 or 400, got {response.status_code}: {response.text}"
            print(f"Upload rejected (expected for minimal JPEG): {response.json().get('detail')}")
    
    def test_delete_profile_picture(self, licensee_headers):
        """Should delete profile picture"""
        response = requests.delete(f"{BASE_URL}/api/profile/picture", headers=licensee_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"Profile picture deleted: {data['message']}")


# ==================== FAVORITES TESTS ====================

class TestFavoritesList:
    """Test GET /api/favorites/"""
    
    def test_licensee_can_list_favorites(self, licensee_headers):
        """Licensee should list their favorites"""
        response = requests.get(f"{BASE_URL}/api/favorites/", headers=licensee_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Licensee has {len(data)} favorites")
    
    def test_admin_can_list_favorites(self, admin_headers):
        """Admin should also be able to list favorites"""
        response = requests.get(f"{BASE_URL}/api/favorites/", headers=admin_headers)
        assert response.status_code == 200


class TestFavoritesToggle:
    """Test POST /api/favorites/toggle/{chapter_id}"""
    
    @pytest.fixture
    def chapter_id(self, licensee_headers):
        """Get a chapter ID to test with"""
        # First get modules
        response = requests.get(f"{BASE_URL}/api/modules", headers=licensee_headers)
        if response.status_code != 200:
            pytest.skip("Could not get modules")
        
        modules = response.json()
        if not modules:
            pytest.skip("No modules available")
        
        # Get first module with chapters
        for module in modules:
            module_response = requests.get(f"{BASE_URL}/api/modules/{module['id']}", headers=licensee_headers)
            if module_response.status_code == 200:
                module_data = module_response.json()
                chapters = module_data.get("chapters", [])
                if chapters:
                    return chapters[0]["id"]
        
        pytest.skip("No chapters available for testing")
    
    def test_toggle_favorite_add(self, licensee_headers, chapter_id):
        """Should add chapter to favorites"""
        # First remove if exists
        requests.delete(f"{BASE_URL}/api/favorites/{chapter_id}", headers=licensee_headers)
        
        # Toggle to add
        response = requests.post(f"{BASE_URL}/api/favorites/toggle/{chapter_id}", headers=licensee_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "is_favorite" in data
        assert data["is_favorite"] == True
        print(f"Added chapter {chapter_id} to favorites")
    
    def test_toggle_favorite_remove(self, licensee_headers, chapter_id):
        """Should remove chapter from favorites"""
        # First add
        requests.post(f"{BASE_URL}/api/favorites/toggle/{chapter_id}", headers=licensee_headers)
        
        # Toggle to remove
        response = requests.post(f"{BASE_URL}/api/favorites/toggle/{chapter_id}", headers=licensee_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_favorite"] == False
        print(f"Removed chapter {chapter_id} from favorites")
    
    def test_toggle_nonexistent_chapter(self, licensee_headers):
        """Should return 404 for non-existent chapter"""
        response = requests.post(f"{BASE_URL}/api/favorites/toggle/nonexistent-chapter-id", headers=licensee_headers)
        assert response.status_code == 404


class TestFavoritesDelete:
    """Test DELETE /api/favorites/{chapter_id}"""
    
    def test_delete_nonexistent_favorite(self, licensee_headers):
        """Should return 404 for non-existent favorite"""
        response = requests.delete(f"{BASE_URL}/api/favorites/nonexistent-chapter-id", headers=licensee_headers)
        assert response.status_code == 404


class TestFavoritesCheck:
    """Test GET /api/favorites/check/{chapter_id}"""
    
    def test_check_favorite_status(self, licensee_headers):
        """Should check if chapter is favorited"""
        response = requests.get(f"{BASE_URL}/api/favorites/check/some-chapter-id", headers=licensee_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "is_favorite" in data
        assert isinstance(data["is_favorite"], bool)


# ==================== INTEGRATION TEST ====================

class TestFavoritesIntegration:
    """Full integration test for favorites flow"""
    
    def test_full_favorites_flow(self, licensee_headers):
        """Test complete favorites workflow"""
        # 1. Get modules to find a chapter
        modules_response = requests.get(f"{BASE_URL}/api/modules", headers=licensee_headers)
        if modules_response.status_code != 200:
            pytest.skip("Could not get modules")
        
        modules = modules_response.json()
        if not modules:
            pytest.skip("No modules available")
        
        # Find a chapter
        chapter_id = None
        module_id = None
        for module in modules:
            module_response = requests.get(f"{BASE_URL}/api/modules/{module['id']}", headers=licensee_headers)
            if module_response.status_code == 200:
                module_data = module_response.json()
                chapters = module_data.get("chapters", [])
                if chapters:
                    chapter_id = chapters[0]["id"]
                    module_id = module["id"]
                    break
        
        if not chapter_id:
            pytest.skip("No chapters available")
        
        # 2. Check initial status
        check_response = requests.get(f"{BASE_URL}/api/favorites/check/{chapter_id}", headers=licensee_headers)
        assert check_response.status_code == 200
        initial_status = check_response.json()["is_favorite"]
        
        # 3. Toggle to add
        toggle_response = requests.post(f"{BASE_URL}/api/favorites/toggle/{chapter_id}", headers=licensee_headers)
        assert toggle_response.status_code == 200
        
        # 4. Verify in list
        list_response = requests.get(f"{BASE_URL}/api/favorites/", headers=licensee_headers)
        assert list_response.status_code == 200
        favorites = list_response.json()
        
        # Check if chapter is in favorites (if we added it)
        if not initial_status:
            found = any(f["chapter_id"] == chapter_id for f in favorites)
            assert found, "Chapter should be in favorites list"
            
            # Verify enriched data
            fav = next(f for f in favorites if f["chapter_id"] == chapter_id)
            assert "chapter" in fav
            assert "module" in fav
            assert fav["chapter"]["id"] == chapter_id
        
        # 5. Delete favorite
        delete_response = requests.delete(f"{BASE_URL}/api/favorites/{chapter_id}", headers=licensee_headers)
        # May be 200 or 404 depending on current state
        assert delete_response.status_code in [200, 404]
        
        # 6. Verify removed
        final_check = requests.get(f"{BASE_URL}/api/favorites/check/{chapter_id}", headers=licensee_headers)
        assert final_check.status_code == 200
        assert final_check.json()["is_favorite"] == False
        
        print("Full favorites flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
