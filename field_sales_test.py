#!/usr/bin/env python3
"""
Focused test for field sales validation with licensee user
"""
import requests
import json

BASE_URL = "https://subs-payment-1.preview.emergentagent.com/api"
LICENSEE_EMAIL = "test.licensee@ozoxx.com"
LICENSEE_PASSWORD = "test123"

def test_field_sales_validation():
    """Test the specific sale number validation (1-5 vs 1-10)"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Accept": "application/json"
    })
    
    # Login as licensee
    try:
        response = session.post(f"{BASE_URL}/auth/login", json={
            "email": LICENSEE_EMAIL,
            "password": LICENSEE_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            session.headers.update({
                "Authorization": f"Bearer {token}"
            })
            print("✅ Licensee login successful")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return False
    
    # Test valid range (1-5)
    print("\n🧪 Testing valid sale numbers (1-5):")
    for sale_number in [1, 2, 3, 4, 5]:
        note_data = {
            "sale_number": sale_number,
            "date": "2024-01-01",
            "note": f"Valid test sale {sale_number}"
        }
        
        try:
            response = session.post(f"{BASE_URL}/onboarding/field-sales/note", json=note_data)
            if response.status_code == 200:
                print(f"✅ Sale {sale_number}: Accepted (200)")
            else:
                print(f"ℹ️  Sale {sale_number}: {response.status_code} - {response.text[:100]}...")
        except Exception as e:
            print(f"❌ Sale {sale_number}: Error - {str(e)}")
    
    # Test invalid range (above 5, specifically old max of 10)
    print("\n🧪 Testing invalid sale numbers (6-10, old range):")
    for sale_number in [6, 7, 8, 9, 10]:
        note_data = {
            "sale_number": sale_number,
            "date": "2024-01-01", 
            "note": f"Invalid test sale {sale_number}"
        }
        
        try:
            response = session.post(f"{BASE_URL}/onboarding/field-sales/note", json=note_data)
            if response.status_code == 400:
                if "inválido" in response.text.lower() or "1-5" in response.text:
                    print(f"✅ Sale {sale_number}: Correctly rejected (validation working)")
                else:
                    print(f"⚠️  Sale {sale_number}: Rejected but unclear reason - {response.text[:100]}...")
            else:
                print(f"❌ Sale {sale_number}: Should be rejected but got {response.status_code}")
        except Exception as e:
            print(f"❌ Sale {sale_number}: Error - {str(e)}")
    
    # Test boundary cases
    print("\n🧪 Testing boundary cases:")
    for sale_number in [0, 11, 15]:
        note_data = {
            "sale_number": sale_number,
            "date": "2024-01-01",
            "note": f"Boundary test sale {sale_number}"
        }
        
        try:
            response = session.post(f"{BASE_URL}/onboarding/field-sales/note", json=note_data)
            if response.status_code == 400:
                print(f"✅ Sale {sale_number}: Correctly rejected")
            else:
                print(f"❌ Sale {sale_number}: Should be rejected but got {response.status_code}")
        except Exception as e:
            print(f"❌ Sale {sale_number}: Error - {str(e)}")

if __name__ == "__main__":
    test_field_sales_validation()