import requests
import sys
from datetime import datetime

class OzoxxAPITester:
    def __init__(self, base_url="https://recent-modules.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.franqueado_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "admin@ozoxx.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin user: {response.get('user', {}).get('full_name', 'Unknown')}")
            return True
        return False

    def test_franqueado_login(self):
        """Test franqueado login"""
        success, response = self.run_test(
            "Franqueado Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "franqueado@teste.com", "password": "senha123"}
        )
        if success and 'access_token' in response:
            self.franqueado_token = response['access_token']
            print(f"   Franqueado user: {response.get('user', {}).get('full_name', 'Unknown')}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        return self.run_test(
            "Invalid Login",
            "POST",
            "api/auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"}
        )

    def test_password_reset_request(self):
        """Test password reset request"""
        return self.run_test(
            "Password Reset Request",
            "POST",
            "api/auth/request-reset",
            200,
            data={"email": "franqueado@teste.com"}
        )

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.franqueado_token:
            print("❌ Skipping - No franqueado token")
            return False
        
        return self.run_test(
            "Get User Profile",
            "GET",
            "api/users/me",
            200,
            token=self.franqueado_token
        )

    def test_get_all_users_admin(self):
        """Test admin getting all users"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        return self.run_test(
            "Get All Users (Admin)",
            "GET",
            "api/users/",
            200,
            token=self.admin_token
        )

    def test_get_all_users_unauthorized(self):
        """Test unauthorized access to users list"""
        if not self.franqueado_token:
            print("❌ Skipping - No franqueado token")
            return False
        
        return self.run_test(
            "Get All Users (Unauthorized)",
            "GET",
            "api/users/",
            403,
            token=self.franqueado_token
        )

    def test_get_modules(self):
        """Test getting modules list"""
        if not self.franqueado_token:
            print("❌ Skipping - No franqueado token")
            return False
        
        return self.run_test(
            "Get Modules",
            "GET",
            "api/modules/",
            200,
            token=self.franqueado_token
        )

    def test_dashboard_stats_admin(self):
        """Test admin dashboard stats"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        return self.run_test(
            "Dashboard Stats (Admin)",
            "GET",
            "api/stats/dashboard",
            200,
            token=self.admin_token
        )

    def test_dashboard_stats_franqueado(self):
        """Test franqueado dashboard stats"""
        if not self.franqueado_token:
            print("❌ Skipping - No franqueado token")
            return False
        
        return self.run_test(
            "Dashboard Stats (Franqueado)",
            "GET",
            "api/stats/dashboard",
            200,
            token=self.franqueado_token
        )

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        if not self.franqueado_token:
            print("❌ Skipping - No franqueado token")
            return False
        
        return self.run_test(
            "Leaderboard",
            "GET",
            "api/stats/leaderboard",
            200,
            token=self.franqueado_token
        )

    def test_rewards(self):
        """Test rewards endpoint"""
        if not self.franqueado_token:
            print("❌ Skipping - No franqueado token")
            return False
        
        return self.run_test(
            "Get Rewards",
            "GET",
            "api/rewards/",
            200,
            token=self.franqueado_token
        )

def main():
    print("🚀 Starting Ozoxx LMS API Tests")
    print("=" * 50)
    
    tester = OzoxxAPITester()
    
    # Basic health check
    tester.test_health_check()
    
    # Authentication tests
    admin_login_success = tester.test_admin_login()
    franqueado_login_success = tester.test_franqueado_login()
    tester.test_invalid_login()
    
    # Password reset
    tester.test_password_reset_request()
    
    # User management tests
    if franqueado_login_success:
        tester.test_get_user_profile()
    
    if admin_login_success:
        tester.test_get_all_users_admin()
    
    if franqueado_login_success:
        tester.test_get_all_users_unauthorized()
    
    # Module tests
    if franqueado_login_success:
        tester.test_get_modules()
    
    # Dashboard stats tests
    if admin_login_success:
        tester.test_dashboard_stats_admin()
    
    if franqueado_login_success:
        tester.test_dashboard_stats_franqueado()
        tester.test_leaderboard()
        tester.test_rewards()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            print(f"   - {failed}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())