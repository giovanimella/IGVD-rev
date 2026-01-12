import requests
import json

def test_licensee_cannot_see_answers():
    """Test that licensee cannot see correct answers after fix"""
    base_url = "https://recent-modules.preview.emergentagent.com"
    
    # Login as licensee
    login_response = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "licenciado.teste@ozoxx.com", "password": "licenciado123"}
    )
    
    if login_response.status_code != 200:
        print("❌ Failed to login as licensee")
        return False
    
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get assessment for the test module
    module_id = "d4301253-c9df-4995-a801-d873edfaf8d5"  # From previous test
    assessment_response = requests.get(
        f"{base_url}/api/assessments/module/{module_id}",
        headers=headers
    )
    
    if assessment_response.status_code != 200:
        print("❌ Failed to get assessment")
        return False
    
    assessment_data = assessment_response.json()
    questions = assessment_data.get('questions', [])
    
    print(f"📋 Assessment has {len(questions)} questions")
    
    # Check if licensee can see correct answers
    can_see_answers = False
    for i, question in enumerate(questions):
        print(f"\n🔍 Question {i+1}:")
        print(f"   Text: {question.get('question_text', 'No text')[:50]}...")
        
        if 'correct_answer' in question:
            print(f"   ❌ SECURITY ISSUE: Can see correct_answer: {question['correct_answer']}")
            can_see_answers = True
        
        if 'correct_answers' in question:
            print(f"   ❌ SECURITY ISSUE: Can see correct_answers: {question['correct_answers']}")
            can_see_answers = True
        
        if 'correct_answer' not in question and 'correct_answers' not in question:
            print(f"   ✅ Good: Cannot see correct answers")
    
    if can_see_answers:
        print("\n❌ CRITICAL SECURITY ISSUE: Licensee can see correct answers!")
        return False
    else:
        print("\n✅ SECURITY OK: Licensee cannot see correct answers")
        return True

if __name__ == "__main__":
    success = test_licensee_cannot_see_answers()
    exit(0 if success else 1)