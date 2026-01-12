import requests
import sys
from datetime import datetime

class OzoxxAPITester:
    def __init__(self, base_url="https://recent-modules.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.franqueado_token = None
        self.licensee_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_module_id = None
        self.test_assessment_id = None
        self.test_question_ids = []

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

    def test_licensee_login(self):
        """Test licensee login with provided credentials"""
        success, response = self.run_test(
            "Licensee Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "licenciado.teste@ozoxx.com", "password": "licenciado123"}
        )
        if success and 'access_token' in response:
            self.licensee_token = response['access_token']
            print(f"   Licensee user: {response.get('user', {}).get('full_name', 'Unknown')}")
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

    # ==================== ASSESSMENT SYSTEM TESTS ====================
    
    def test_get_system_config(self):
        """Test getting system configuration"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get System Config",
            "GET",
            "api/system/config",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Current minimum passing score: {response.get('minimum_passing_score', 'Not set')}")
        return success

    def test_update_system_config(self):
        """Test updating system configuration to 75% minimum score"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        return self.run_test(
            "Update System Config (75% minimum)",
            "PUT",
            "api/system/config",
            200,
            data={"minimum_passing_score": 75},
            token=self.admin_token
        )

    def test_get_modules_for_assessment(self):
        """Get modules to find one for testing assessments"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get Modules for Assessment",
            "GET",
            "api/modules/",
            200,
            token=self.admin_token
        )
        
        if success and response:
            # Look for "Introdução à Ozoxx" module or use the first available
            modules = response if isinstance(response, list) else response.get('modules', [])
            target_module = None
            
            for module in modules:
                if "Introdução" in module.get('title', '') or "ozoxx" in module.get('title', '').lower():
                    target_module = module
                    break
            
            if not target_module and modules:
                target_module = modules[0]  # Use first module if target not found
            
            if target_module:
                self.test_module_id = target_module['id']
                print(f"   Using module: {target_module.get('title', 'Unknown')} (ID: {self.test_module_id})")
                return True
        
        return False

    def test_create_assessment(self):
        """Test creating an assessment for a module"""
        if not self.admin_token or not self.test_module_id:
            print("❌ Skipping - No admin token or module ID")
            return False
        
        assessment_data = {
            "module_id": self.test_module_id,
            "title": "Avaliação de Teste - Sistema Ozoxx",
            "description": "Avaliação criada automaticamente para testar o sistema",
            "passing_score": 70
        }
        
        success, response = self.run_test(
            "Create Assessment",
            "POST",
            "api/assessments/",
            200,
            data=assessment_data,
            token=self.admin_token
        )
        
        if success and response:
            self.test_assessment_id = response.get('id')
            print(f"   Created assessment ID: {self.test_assessment_id}")
        
        return success

    def test_create_single_choice_question(self):
        """Test creating a single choice question"""
        if not self.admin_token or not self.test_assessment_id:
            print("❌ Skipping - No admin token or assessment ID")
            return False
        
        question_data = {
            "assessment_id": self.test_assessment_id,
            "question_text": "Qual é o principal objetivo da plataforma Ozoxx?",
            "question_type": "single_choice",
            "points": 50,
            "order": 1,
            "options": [
                "Vender produtos online",
                "Capacitar licenciados através de educação",
                "Gerenciar estoque",
                "Fazer marketing digital"
            ],
            "correct_answers": ["Capacitar licenciados através de educação"]
        }
        
        success, response = self.run_test(
            "Create Single Choice Question",
            "POST",
            "api/assessments/questions",
            200,
            data=question_data,
            token=self.admin_token
        )
        
        if success and response:
            question_id = response.get('id')
            self.test_question_ids.append(question_id)
            print(f"   Created single choice question ID: {question_id}")
        
        return success

    def test_create_multiple_choice_question(self):
        """Test creating a multiple choice question"""
        if not self.admin_token or not self.test_assessment_id:
            print("❌ Skipping - No admin token or assessment ID")
            return False
        
        question_data = {
            "assessment_id": self.test_assessment_id,
            "question_text": "Quais são os benefícios de ser um licenciado Ozoxx? (Selecione todas as corretas)",
            "question_type": "multiple_choice",
            "points": 50,
            "order": 2,
            "options": [
                "Suporte técnico especializado",
                "Treinamentos regulares",
                "Acesso a produtos exclusivos",
                "Garantia de lucro imediato"
            ],
            "correct_answers": ["Suporte técnico especializado", "Treinamentos regulares", "Acesso a produtos exclusivos"]
        }
        
        success, response = self.run_test(
            "Create Multiple Choice Question",
            "POST",
            "api/assessments/questions",
            200,
            data=question_data,
            token=self.admin_token
        )
        
        if success and response:
            question_id = response.get('id')
            self.test_question_ids.append(question_id)
            print(f"   Created multiple choice question ID: {question_id}")
        
        return success

    def test_get_assessment_as_licensee(self):
        """Test licensee viewing assessment (should not see correct answers)"""
        if not self.licensee_token or not self.test_module_id:
            print("❌ Skipping - No licensee token or module ID")
            return False
        
        success, response = self.run_test(
            "Get Assessment as Licensee",
            "GET",
            f"api/assessments/module/{self.test_module_id}",
            200,
            token=self.licensee_token
        )
        
        if success and response:
            questions = response.get('questions', [])
            print(f"   Assessment has {len(questions)} questions")
            
            # Verify licensee cannot see correct answers
            for question in questions:
                if 'correct_answer' in question or 'correct_answers' in question:
                    print("   ⚠️ WARNING: Licensee can see correct answers!")
                    return False
            
            print("   ✅ Correct: Licensee cannot see correct answers")
        
        return success

    def test_submit_assessment_correct_answers(self):
        """Test licensee submitting assessment with correct answers"""
        if not self.licensee_token or not self.test_assessment_id:
            print("❌ Skipping - No licensee token or assessment ID")
            return False
        
        # Submit correct answers
        submission_data = {
            "assessment_id": self.test_assessment_id,
            "answers": [
                {
                    "question_id": self.test_question_ids[0] if len(self.test_question_ids) > 0 else "q1",
                    "answers": ["Capacitar licenciados através de educação"]
                },
                {
                    "question_id": self.test_question_ids[1] if len(self.test_question_ids) > 1 else "q2",
                    "answers": ["Suporte técnico especializado", "Treinamentos regulares", "Acesso a produtos exclusivos"]
                }
            ]
        }
        
        success, response = self.run_test(
            "Submit Assessment (Correct Answers)",
            "POST",
            "api/assessments/submit",
            200,
            data=submission_data,
            token=self.licensee_token
        )
        
        if success and response:
            score = response.get('score', 0)
            total_points = response.get('total_points', 0)
            percentage = response.get('percentage', 0)
            passed = response.get('passed', False)
            
            print(f"   Score: {score}/{total_points} ({percentage}%)")
            print(f"   Passed: {passed}")
            
            if passed and percentage >= 75:  # Should pass with 75% minimum
                print("   ✅ Correct: Assessment passed with correct answers")
                return True
            else:
                print("   ❌ ERROR: Should have passed with correct answers")
                return False
        
        return success

    def test_submit_assessment_wrong_answers(self):
        """Test licensee submitting assessment with wrong answers"""
        if not self.licensee_token or not self.test_assessment_id:
            print("❌ Skipping - No licensee token or assessment ID")
            return False
        
        # Submit wrong answers
        submission_data = {
            "assessment_id": self.test_assessment_id,
            "answers": [
                {
                    "question_id": self.test_question_ids[0] if len(self.test_question_ids) > 0 else "q1",
                    "answers": ["Vender produtos online"]  # Wrong answer
                },
                {
                    "question_id": self.test_question_ids[1] if len(self.test_question_ids) > 1 else "q2",
                    "answers": ["Garantia de lucro imediato"]  # Wrong answer
                }
            ]
        }
        
        success, response = self.run_test(
            "Submit Assessment (Wrong Answers)",
            "POST",
            "api/assessments/submit",
            200,
            data=submission_data,
            token=self.licensee_token
        )
        
        if success and response:
            score = response.get('score', 0)
            total_points = response.get('total_points', 0)
            percentage = response.get('percentage', 0)
            passed = response.get('passed', False)
            
            print(f"   Score: {score}/{total_points} ({percentage}%)")
            print(f"   Passed: {passed}")
            
            if not passed and percentage < 75:  # Should fail with 75% minimum
                print("   ✅ Correct: Assessment failed with wrong answers")
                return True
            else:
                print("   ❌ ERROR: Should have failed with wrong answers")
                return False
        
        return success

    def test_get_assessment_results(self):
        """Test getting assessment results"""
        if not self.licensee_token or not self.test_module_id:
            print("❌ Skipping - No licensee token or module ID")
            return False
        
        success, response = self.run_test(
            "Get Assessment Results",
            "GET",
            f"api/assessments/results/module/{self.test_module_id}",
            200,
            token=self.licensee_token
        )
        
        if success and response:
            print(f"   Found assessment result: {response.get('passed', 'Unknown status')}")
        
        return success

    def test_edit_question(self):
        """Test editing a question"""
        if not self.admin_token or not self.test_question_ids:
            print("❌ Skipping - No admin token or question IDs")
            return False
        
        question_id = self.test_question_ids[0]
        updates = {
            "question_text": "Qual é o PRINCIPAL objetivo da plataforma Ozoxx? (EDITADO)",
            "points": 60
        }
        
        return self.run_test(
            "Edit Question",
            "PUT",
            f"api/assessments/questions/{question_id}",
            200,
            data=updates,
            token=self.admin_token
        )

    def test_delete_question(self):
        """Test deleting a question"""
        if not self.admin_token or not self.test_question_ids:
            print("❌ Skipping - No admin token or question IDs")
            return False
        
        # Delete the second question if it exists
        if len(self.test_question_ids) > 1:
            question_id = self.test_question_ids[1]
            return self.run_test(
                "Delete Question",
                "DELETE",
                f"api/assessments/questions/{question_id}",
                200,
                token=self.admin_token
            )
        
        print("❌ Skipping - No second question to delete")
        return False

def main():
    print("🚀 Starting Ozoxx LMS API Tests - Assessment System Focus")
    print("=" * 60)
    
    tester = OzoxxAPITester()
    
    # Basic health check
    tester.test_health_check()
    
    # Authentication tests
    admin_login_success = tester.test_admin_login()
    franqueado_login_success = tester.test_franqueado_login()
    licensee_login_success = tester.test_licensee_login()
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
    
    # ==================== ASSESSMENT SYSTEM TESTS ====================
    print("\n" + "🎯 ASSESSMENT SYSTEM TESTS" + "=" * 40)
    
    if admin_login_success:
        # 1. System Configuration Tests
        tester.test_get_system_config()
        tester.test_update_system_config()
        
        # 2. Get modules and create assessment
        if tester.test_get_modules_for_assessment():
            tester.test_create_assessment()
            
            # 3. Create questions
            tester.test_create_single_choice_question()
            tester.test_create_multiple_choice_question()
            
            # 4. Question management
            tester.test_edit_question()
    
    # 5. Licensee tests
    if licensee_login_success and tester.test_module_id:
        tester.test_get_assessment_as_licensee()
        tester.test_submit_assessment_correct_answers()
        tester.test_submit_assessment_wrong_answers()
        tester.test_get_assessment_results()
    
    # 6. Admin cleanup tests
    if admin_login_success:
        tester.test_delete_question()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            print(f"   - {failed}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    # Assessment-specific summary
    print(f"\n🎯 Assessment System Summary:")
    print(f"   - Admin credentials: {'✅ Working' if admin_login_success else '❌ Failed'}")
    print(f"   - Licensee credentials: {'✅ Working' if licensee_login_success else '❌ Failed'}")
    print(f"   - Test module found: {'✅ Yes' if tester.test_module_id else '❌ No'}")
    print(f"   - Assessment created: {'✅ Yes' if tester.test_assessment_id else '❌ No'}")
    print(f"   - Questions created: {len(tester.test_question_ids)} questions")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())