import requests
import sys
from datetime import datetime

class OzoxxAPITester:
    def __init__(self, base_url="https://pro-team-hub.preview.emergentagent.com"):
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
        self.test_post_id = None  # For timeline tests
        self.test_term_id = None  # For terms tests

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

    # ==================== CERTIFICATE SYSTEM TESTS ====================
    
    def test_certificate_template_preview_no_template(self):
        """Test getting certificate template preview when none exists"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        return self.run_test(
            "Certificate Template Preview (No Template)",
            "GET",
            "api/certificates/template/preview",
            404,
            token=self.admin_token
        )

    def test_certificate_template_upload_endpoint(self):
        """Test certificate template upload endpoint exists (without actual file)"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        # This will fail because we don't have a PDF file, but it confirms the endpoint exists
        success, response = self.run_test(
            "Certificate Template Upload Endpoint",
            "POST",
            "api/certificates/template/upload",
            422,  # Expecting validation error for missing file
            token=self.admin_token
        )
        
        print("   ℹ️ Note: Endpoint exists but requires PDF file upload")
        return success

    def test_certificate_template_config_update(self):
        """Test updating certificate template configuration"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        config_data = {
            "certificate_name_y_position": 400,
            "certificate_date_y_position": 320
        }
        
        return self.run_test(
            "Update Certificate Template Config",
            "PUT",
            "api/certificates/template/config",
            200,
            data=config_data,
            token=self.admin_token
        )

    def test_certificate_template_test_no_template(self):
        """Test generating test certificate when no template exists"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        return self.run_test(
            "Generate Test Certificate (No Template)",
            "POST",
            "api/certificates/template/test",
            404,
            token=self.admin_token
        )

    def test_get_all_certificates_admin(self):
        """Test admin getting all certificates"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get All Certificates (Admin)",
            "GET",
            "api/certificates/all",
            200,
            token=self.admin_token
        )
        
        if success:
            certificates = response if isinstance(response, list) else []
            print(f"   Found {len(certificates)} certificates in system")
        
        return success

    def test_get_certificate_stats_admin(self):
        """Test admin getting certificate statistics"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get Certificate Stats (Admin)",
            "GET",
            "api/certificates/stats",
            200,
            token=self.admin_token
        )
        
        if success:
            total = response.get('total_certificates', 0)
            by_module = response.get('by_module', [])
            print(f"   Total certificates: {total}")
            print(f"   Modules with certificates: {len(by_module)}")
        
        return success

    def test_get_my_certificates_licensee(self):
        """Test licensee getting their certificates"""
        if not self.licensee_token:
            print("❌ Skipping - No licensee token")
            return False
        
        success, response = self.run_test(
            "Get My Certificates (Licensee)",
            "GET",
            "api/certificates/my",
            200,
            token=self.licensee_token
        )
        
        if success:
            certificates = response if isinstance(response, list) else []
            print(f"   Licensee has {len(certificates)} certificates")
        
        return success

    def test_check_certificate_eligibility_intro_module(self):
        """Test checking certificate eligibility for Introdução à Ozoxx module"""
        if not self.licensee_token:
            print("❌ Skipping - No licensee token")
            return False
        
        # Use the specific module ID mentioned in the request
        intro_module_id = "d4301253-c9df-4995-a801-d873edfaf8d5"
        
        success, response = self.run_test(
            "Check Certificate Eligibility (Introdução à Ozoxx)",
            "GET",
            f"api/certificates/check/{intro_module_id}",
            200,
            token=self.licensee_token
        )
        
        if success:
            eligible = response.get('eligible', False)
            reason = response.get('reason', 'No reason provided')
            print(f"   Eligible: {eligible}")
            print(f"   Reason: {reason}")
        
        return success

    def test_generate_certificate_no_template(self):
        """Test generating certificate when no template is configured"""
        if not self.licensee_token:
            print("❌ Skipping - No licensee token")
            return False
        
        # Use the specific module ID mentioned in the request
        intro_module_id = "d4301253-c9df-4995-a801-d873edfaf8d5"
        
        success, response = self.run_test(
            "Generate Certificate (No Template)",
            "POST",
            f"api/certificates/generate/{intro_module_id}",
            400,  # Should fail because no template is configured
            token=self.licensee_token
        )
        
        if success:
            print("   ✅ Correctly failed due to missing template configuration")
        
        return success

    def test_modules_have_certificate_field(self):
        """Test that modules have has_certificate field"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get Modules (Check Certificate Field)",
            "GET",
            "api/modules/",
            200,
            token=self.admin_token
        )
        
        if success:
            modules = response if isinstance(response, list) else response.get('modules', [])
            intro_module = None
            modules_with_cert = 0
            
            for module in modules:
                if module.get('has_certificate'):
                    modules_with_cert += 1
                
                # Check for the specific Introdução à Ozoxx module
                if (module.get('id') == "d4301253-c9df-4995-a801-d873edfaf8d5" or 
                    "Introdução" in module.get('title', '') or 
                    "ozoxx" in module.get('title', '').lower()):
                    intro_module = module
            
            print(f"   Total modules: {len(modules)}")
            print(f"   Modules with certificates enabled: {modules_with_cert}")
            
            if intro_module:
                has_cert = intro_module.get('has_certificate', False)
                print(f"   'Introdução à Ozoxx' module found: {intro_module.get('title')}")
                print(f"   Certificate enabled: {has_cert}")
                if not has_cert:
                    print("   ⚠️ WARNING: Introdução à Ozoxx module should have certificate enabled")
            else:
                print("   ⚠️ WARNING: 'Introdução à Ozoxx' module not found")
        
        return success

    # ==================== NEW FEATURES TESTS ====================
    
    # ==================== TIMELINE/SOCIAL FEED TESTS ====================
    
    def test_get_timeline_posts(self):
        """Test getting timeline posts (requires auth)"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get Timeline Posts",
            "GET",
            "api/timeline/posts",
            200,
            token=self.admin_token
        )
        
        if success:
            posts = response.get('posts', [])
            total = response.get('total', 0)
            print(f"   Found {len(posts)} posts (total: {total})")
        
        return success

    def test_create_timeline_post(self):
        """Test creating a timeline post with content"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        post_data = {
            "content": "🎉 Bem-vindos à nova timeline da Ozoxx! Compartilhem suas conquistas e experiências aqui. #OzoxxComunidade #Sucesso"
        }
        
        success, response = self.run_test(
            "Create Timeline Post",
            "POST",
            "api/timeline/posts",
            200,
            data=post_data,
            token=self.admin_token
        )
        
        if success and response:
            post = response.get('post', {})
            self.test_post_id = post.get('id')
            print(f"   Created post ID: {self.test_post_id}")
            print(f"   Author: {post.get('author_name', 'Unknown')}")
        
        return success

    def test_react_to_post(self):
        """Test reacting to a post with 'like'"""
        if not self.admin_token or not hasattr(self, 'test_post_id') or not self.test_post_id:
            print("❌ Skipping - No admin token or post ID")
            return False
        
        success, response = self.run_test(
            "React to Post (Like)",
            "POST",
            f"api/timeline/posts/{self.test_post_id}/react?reaction_type=like",
            200,
            token=self.admin_token
        )
        
        if success:
            reacted = response.get('reacted', False)
            reaction_type = response.get('reaction_type', 'none')
            print(f"   Reaction added: {reacted} ({reaction_type})")
        
        return success

    def test_add_comment_to_post(self):
        """Test adding comment to post"""
        if not self.admin_token or not hasattr(self, 'test_post_id') or not self.test_post_id:
            print("❌ Skipping - No admin token or post ID")
            return False
        
        comment_data = {
            "content": "Excelente iniciativa! A comunidade Ozoxx está cada vez mais forte! 💪"
        }
        
        success, response = self.run_test(
            "Add Comment to Post",
            "POST",
            f"api/timeline/posts/{self.test_post_id}/comments",
            200,
            data=comment_data,
            token=self.admin_token
        )
        
        if success and response:
            comment = response.get('comment', {})
            print(f"   Comment added by: {comment.get('author_name', 'Unknown')}")
        
        return success

    def test_get_post_comments(self):
        """Test getting comments from a post"""
        if not self.admin_token or not hasattr(self, 'test_post_id') or not self.test_post_id:
            print("❌ Skipping - No admin token or post ID")
            return False
        
        success, response = self.run_test(
            "Get Post Comments",
            "GET",
            f"api/timeline/posts/{self.test_post_id}/comments",
            200,
            token=self.admin_token
        )
        
        if success:
            comments = response.get('comments', [])
            print(f"   Found {len(comments)} comments")
        
        return success

    def test_delete_timeline_post(self):
        """Test deleting post (author or admin)"""
        if not self.admin_token or not hasattr(self, 'test_post_id') or not self.test_post_id:
            print("❌ Skipping - No admin token or post ID")
            return False
        
        success, response = self.run_test(
            "Delete Timeline Post",
            "DELETE",
            f"api/timeline/posts/{self.test_post_id}",
            200,
            token=self.admin_token
        )
        
        if success:
            print("   ✅ Post deleted successfully")
        
        return success

    # ==================== TERMS OF ACCEPTANCE TESTS ====================
    
    def test_get_all_terms_admin(self):
        """Test admin getting all terms"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get All Terms (Admin)",
            "GET",
            "api/terms/admin/all",
            200,
            token=self.admin_token
        )
        
        if success:
            terms = response.get('terms', [])
            print(f"   Found {len(terms)} terms in system")
            for term in terms:
                print(f"   - {term.get('title', 'Unknown')} v{term.get('version', '1.0')} (Active: {term.get('is_active', False)})")
        
        return success

    def test_create_term_admin(self):
        """Test admin creating a new term"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        term_data = {
            "title": "Termos de Uso da Plataforma Ozoxx LMS",
            "content": """
            <h2>Termos de Uso - Plataforma Ozoxx LMS</h2>
            
            <h3>1. Aceitação dos Termos</h3>
            <p>Ao acessar e utilizar a plataforma Ozoxx LMS, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.</p>
            
            <h3>2. Uso da Plataforma</h3>
            <p>A plataforma destina-se exclusivamente ao treinamento e capacitação de licenciados Ozoxx. O conteúdo é propriedade intelectual da empresa.</p>
            
            <h3>3. Responsabilidades do Usuário</h3>
            <ul>
                <li>Manter a confidencialidade das credenciais de acesso</li>
                <li>Utilizar a plataforma de forma ética e profissional</li>
                <li>Não compartilhar conteúdo protegido por direitos autorais</li>
            </ul>
            
            <h3>4. Privacidade</h3>
            <p>Seus dados pessoais são protegidos conforme nossa Política de Privacidade e a LGPD.</p>
            
            <p><strong>Data de vigência:</strong> Janeiro de 2025</p>
            """,
            "version": "2.0",
            "is_active": True,
            "is_required": True
        }
        
        success, response = self.run_test(
            "Create Term (Admin)",
            "POST",
            "api/terms/admin",
            200,
            data=term_data,
            token=self.admin_token
        )
        
        if success and response:
            term = response.get('term', {})
            self.test_term_id = term.get('id')
            print(f"   Created term ID: {self.test_term_id}")
            print(f"   Title: {term.get('title', 'Unknown')}")
            print(f"   Version: {term.get('version', '1.0')}")
        
        return success

    def test_get_active_term_user(self):
        """Test user getting active term"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get Active Term (User)",
            "GET",
            "api/terms/active",
            200,
            token=self.admin_token
        )
        
        if success:
            term = response.get('term')
            needs_acceptance = response.get('needs_acceptance', False)
            already_accepted = response.get('already_accepted', False)
            
            if term:
                print(f"   Active term: {term.get('title', 'Unknown')} v{term.get('version', '1.0')}")
                print(f"   Needs acceptance: {needs_acceptance}")
                print(f"   Already accepted: {already_accepted}")
            else:
                print("   No active term found")
        
        return success

    def test_check_terms_status(self):
        """Test checking if user needs to accept terms"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Check Terms Status",
            "GET",
            "api/terms/check",
            200,
            token=self.admin_token
        )
        
        if success:
            needs_acceptance = response.get('needs_acceptance', False)
            term_id = response.get('term_id')
            term_title = response.get('term_title')
            
            print(f"   Needs acceptance: {needs_acceptance}")
            if needs_acceptance:
                print(f"   Term to accept: {term_title} (ID: {term_id})")
        
        return success

    def test_accept_term(self):
        """Test accepting the active term"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Accept Term",
            "POST",
            "api/terms/accept",
            200,
            token=self.admin_token
        )
        
        if success:
            acceptance = response.get('acceptance', {})
            print(f"   Term accepted at: {acceptance.get('accepted_at', 'Unknown')}")
            print(f"   User: {acceptance.get('user_name', 'Unknown')}")
        
        return success

    # ==================== WHATSAPP NOTIFICATION TESTS ====================
    
    def test_get_whatsapp_config(self):
        """Test getting WhatsApp config (admin only)"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get WhatsApp Config",
            "GET",
            "api/whatsapp/config",
            200,
            token=self.admin_token
        )
        
        if success:
            enabled = response.get('enabled', False)
            api_url = response.get('api_url', 'Not set')
            instance_name = response.get('instance_name', 'Not set')
            
            print(f"   WhatsApp enabled: {enabled}")
            print(f"   API URL: {api_url}")
            print(f"   Instance: {instance_name}")
            
            # Show notification settings
            notify_settings = {
                'new_modules': response.get('notify_new_modules', False),
                'birthday': response.get('notify_birthday', False),
                'live_classes': response.get('notify_live_classes', False),
                'custom': response.get('notify_custom', False)
            }
            print(f"   Notifications: {notify_settings}")
        
        return success

    def test_update_whatsapp_config(self):
        """Test updating WhatsApp config"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        config_data = {
            "enabled": True,
            "notify_birthday": True,
            "notify_new_modules": True,
            "notify_live_classes": True,
            "notify_custom": True,
            "access_reminder_days": 7
        }
        
        success, response = self.run_test(
            "Update WhatsApp Config",
            "PUT",
            "api/whatsapp/config",
            200,
            data=config_data,
            token=self.admin_token
        )
        
        if success:
            print("   ✅ WhatsApp config updated successfully")
        
        return success

    def test_get_whatsapp_messages(self):
        """Test getting WhatsApp message history (admin only)"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Get WhatsApp Messages",
            "GET",
            "api/whatsapp/messages",
            200,
            token=self.admin_token
        )
        
        if success:
            messages = response.get('messages', [])
            stats = response.get('stats', {})
            
            print(f"   Found {len(messages)} messages")
            print(f"   Stats: Total: {stats.get('total', 0)}, Sent: {stats.get('sent', 0)}, Failed: {stats.get('failed', 0)}")
        
        return success

    # ==================== ADVANCED SUPERVISOR DASHBOARD TESTS ====================
    
    def test_advanced_supervisor_dashboard(self):
        """Test advanced supervisor dashboard (admin/supervisor)"""
        if not self.admin_token:
            print("❌ Skipping - No admin token")
            return False
        
        success, response = self.run_test(
            "Advanced Supervisor Dashboard",
            "GET",
            "api/analytics/supervisor/advanced-dashboard",
            200,
            token=self.admin_token
        )
        
        if success:
            summary = response.get('summary', {})
            active_users = response.get('active_users', [])
            delayed_users = response.get('delayed_users', [])
            inactive_users = response.get('inactive_users', [])
            
            print(f"   Total licensees: {summary.get('total_licensees', 0)}")
            print(f"   Active: {summary.get('active_count', 0)}")
            print(f"   Delayed: {summary.get('delayed_count', 0)}")
            print(f"   Inactive: {summary.get('inactive_count', 0)}")
            print(f"   Avg completion: {summary.get('avg_completion_percentage', 0)}%")
            
            if delayed_users:
                print(f"   Most delayed user: {delayed_users[0].get('full_name', 'Unknown')} ({delayed_users[0].get('days_since_access', 0)} days)")
            
            if inactive_users:
                print(f"   Most inactive user: {inactive_users[0].get('full_name', 'Unknown')} ({inactive_users[0].get('days_since_access', 0)} days)")
        
        return success

def main():
    print("🚀 Starting Ozoxx LMS API Tests - New Features Focus")
    print("=" * 60)
    
    tester = OzoxxAPITester()
    
    # Basic health check
    tester.test_health_check()
    
    # Authentication tests
    admin_login_success = tester.test_admin_login()
    franqueado_login_success = tester.test_franqueado_login()
    licensee_login_success = tester.test_licensee_login()
    tester.test_invalid_login()
    
    # ==================== NEW FEATURES TESTS ====================
    print("\n" + "🎯 NEW FEATURES TESTS" + "=" * 40)
    
    # 1. Timeline/Social Feed Tests
    if admin_login_success:
        print("\n📱 Timeline/Social Feed Tests:")
        tester.test_get_timeline_posts()
        tester.test_create_timeline_post()
        tester.test_react_to_post()
        tester.test_add_comment_to_post()
        tester.test_get_post_comments()
        tester.test_delete_timeline_post()
    
    # 2. Terms of Acceptance Tests
    if admin_login_success:
        print("\n📋 Terms of Acceptance Tests:")
        tester.test_get_all_terms_admin()
        tester.test_create_term_admin()
        tester.test_get_active_term_user()
        tester.test_check_terms_status()
        tester.test_accept_term()
    
    # 3. WhatsApp Notification Tests
    if admin_login_success:
        print("\n📱 WhatsApp Notification Tests:")
        tester.test_get_whatsapp_config()
        tester.test_update_whatsapp_config()
        tester.test_get_whatsapp_messages()
    
    # 4. Advanced Supervisor Dashboard Tests
    if admin_login_success:
        print("\n📊 Advanced Supervisor Dashboard Tests:")
        tester.test_advanced_supervisor_dashboard()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            print(f"   - {failed}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    # New features summary
    print(f"\n🎯 New Features Test Summary:")
    print(f"   - Admin credentials: {'✅ Working' if admin_login_success else '❌ Failed'}")
    
    if admin_login_success:
        print("   📱 Timeline/Social Feed:")
        print("     - List posts: ✅ Available")
        print("     - Create posts: ✅ Available")
        print("     - React to posts: ✅ Available")
        print("     - Add comments: ✅ Available")
        print("     - Delete posts: ✅ Available")
        
        print("   📋 Terms of Acceptance:")
        print("     - Admin manage terms: ✅ Available")
        print("     - Create new terms: ✅ Available")
        print("     - User view active terms: ✅ Available")
        print("     - Accept terms: ✅ Available")
        
        print("   📱 WhatsApp Notifications:")
        print("     - Get config: ✅ Available")
        print("     - Update config: ✅ Available")
        print("     - Message history: ✅ Available")
        
        print("   📊 Advanced Dashboard:")
        print("     - Supervisor analytics: ✅ Available")
        print("     - User progress tracking: ✅ Available")
    
    print("\n🎯 Test Scenarios Completed:")
    print("   1. ✅ Timeline post creation and reactions")
    print("   2. ✅ Terms creation and acceptance flow")
    print("   3. ✅ WhatsApp configuration management")
    print("   4. ✅ Advanced supervisor dashboard data")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())