#!/usr/bin/env python3
"""
Backend API Test for BABEHCHATin
Tests all endpoints as specified in the review request
"""
import requests
import json
import uuid
import time
from datetime import datetime

# Configuration
BASE_URL = "https://multi-tenant-bot-6.preview.emergentagent.com/api"
FALLBACK_URL = "http://localhost:3000/api"

# Test state
test_state = {
    'tenant_token': None,
    'tenant_user': None,
    'tenant_data': None,
    'chatbot_id': None,
    'admin_token': None,
    'session_id': None,
    'payment_id': None,
    'payment_reference': None,
    'second_payment_id': None,
    'second_payment_reference': None,
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {name}")
    if details:
        print(f"  Details: {details}")

def test_health():
    """Test 1: GET /api/health"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'ok':
                log_test("Health check", True, f"Response: {data}")
                return True
            else:
                log_test("Health check", False, f"Expected status:'ok', got: {data}")
                return False
        else:
            log_test("Health check", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Health check", False, f"Exception: {str(e)}")
        return False

def test_plans():
    """Test 2: GET /api/plans"""
    try:
        response = requests.get(f"{BASE_URL}/plans", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 4:
                plan_names = [p.get('id') for p in data]
                expected = ['trial', 'starter', 'pro', 'enterprise']
                if all(name in plan_names for name in expected):
                    log_test("Get plans", True, f"Found 4 plans: {plan_names}")
                    return True
                else:
                    log_test("Get plans", False, f"Expected {expected}, got: {plan_names}")
                    return False
            else:
                log_test("Get plans", False, f"Expected 4 plans, got: {len(data) if isinstance(data, list) else 'not a list'}")
                return False
        else:
            log_test("Get plans", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Get plans", False, f"Exception: {str(e)}")
        return False

def test_register():
    """Test 3: POST /api/auth/register"""
    unique_email = f"test_{uuid.uuid4().hex[:8]}@tokouji.id"
    
    # Valid registration
    try:
        payload = {
            "name": "Test User",
            "email": unique_email,
            "password": "test123",
            "businessName": "Toko Uji"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if response.status_code == 201:
            data = response.json()
            if 'token' in data and 'user' in data and 'tenant' in data:
                user = data['user']
                tenant = data['tenant']
                
                # Verify user structure
                if user.get('role') != 'tenant':
                    log_test("Register - user role", False, f"Expected role 'tenant', got: {user.get('role')}")
                    return False
                if 'passwordHash' in user:
                    log_test("Register - no passwordHash", False, "passwordHash should not be in response")
                    return False
                
                # Verify tenant structure
                if tenant.get('plan') != 'trial':
                    log_test("Register - tenant plan", False, f"Expected plan 'trial', got: {tenant.get('plan')}")
                    return False
                if 'planDetails' not in tenant:
                    log_test("Register - planDetails", False, "planDetails missing from tenant")
                    return False
                if tenant.get('quotaRemaining') != 100:
                    log_test("Register - quotaRemaining", False, f"Expected quotaRemaining 100, got: {tenant.get('quotaRemaining')}")
                    return False
                
                # Store for later tests
                test_state['tenant_token'] = data['token']
                test_state['tenant_user'] = user
                test_state['tenant_data'] = tenant
                
                # tenant.name is the businessName
                business_name = tenant.get('name', 'N/A')
                log_test("Register valid user", True, f"User: {user['email']}, Tenant: {business_name}")
            else:
                log_test("Register valid user", False, f"Missing token/user/tenant in response: {data.keys()}")
                return False
        else:
            log_test("Register valid user", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Register valid user", False, f"Exception: {str(e)}")
        return False
    
    # Test duplicate email (409)
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        if response.status_code == 409:
            log_test("Register duplicate email", True, f"Correctly returned 409")
        else:
            log_test("Register duplicate email", False, f"Expected 409, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Register duplicate email", False, f"Exception: {str(e)}")
        return False
    
    # Test short password (400)
    try:
        short_pass_payload = {
            "name": "Test",
            "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
            "password": "12345",
            "businessName": "Test"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=short_pass_payload, timeout=10)
        if response.status_code == 400:
            log_test("Register short password", True, f"Correctly returned 400")
        else:
            log_test("Register short password", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Register short password", False, f"Exception: {str(e)}")
        return False
    
    # Test missing businessName (400)
    try:
        no_business_payload = {
            "name": "Test",
            "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
            "password": "test123"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=no_business_payload, timeout=10)
        if response.status_code == 400:
            log_test("Register missing businessName", True, f"Correctly returned 400")
        else:
            log_test("Register missing businessName", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Register missing businessName", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_login():
    """Test 4: POST /api/auth/login"""
    if not test_state['tenant_user']:
        log_test("Login", False, "No tenant user from registration")
        return False
    
    # Valid login
    try:
        payload = {
            "email": test_state['tenant_user']['email'],
            "password": "test123"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'token' in data:
                log_test("Login valid credentials", True, f"Token received")
            else:
                log_test("Login valid credentials", False, f"No token in response")
                return False
        else:
            log_test("Login valid credentials", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Login valid credentials", False, f"Exception: {str(e)}")
        return False
    
    # Wrong password (401)
    try:
        payload = {
            "email": test_state['tenant_user']['email'],
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        if response.status_code == 401:
            log_test("Login wrong password", True, f"Correctly returned 401")
        else:
            log_test("Login wrong password", False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Login wrong password", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_auth_me():
    """Test GET /api/auth/me"""
    if not test_state['tenant_token']:
        log_test("Auth me", False, "No tenant token")
        return False
    
    # With token (200)
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'user' in data and 'tenant' in data:
                log_test("Auth me with token", True, f"User: {data['user'].get('email')}")
            else:
                log_test("Auth me with token", False, f"Missing user/tenant in response")
                return False
        else:
            log_test("Auth me with token", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Auth me with token", False, f"Exception: {str(e)}")
        return False
    
    # Without token (401)
    try:
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        if response.status_code == 401:
            log_test("Auth me without token", True, f"Correctly returned 401")
        else:
            log_test("Auth me without token", False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Auth me without token", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_chatbots_list():
    """Test 5: GET /api/chatbots"""
    if not test_state['tenant_token']:
        log_test("Chatbots list", False, "No tenant token")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/chatbots", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 1:
                chatbot = data[0]
                test_state['chatbot_id'] = chatbot.get('id')
                log_test("Chatbots list - default chatbot", True, f"Found 1 default chatbot: {chatbot.get('name')}")
            else:
                log_test("Chatbots list - default chatbot", False, f"Expected 1 chatbot, got: {len(data) if isinstance(data, list) else 'not a list'}")
                return False
        else:
            log_test("Chatbots list", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chatbots list", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_chatbot_get():
    """Test GET /api/chatbots/:id"""
    if not test_state['chatbot_id']:
        log_test("Chatbot get", False, "No chatbot ID")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/chatbots/{test_state['chatbot_id']}", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            log_test("Chatbot get by ID", True, f"Chatbot: {data.get('name')}")
            return True
        else:
            log_test("Chatbot get by ID", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chatbot get by ID", False, f"Exception: {str(e)}")
        return False

def test_chatbot_update():
    """Test 6: PUT /api/chatbots/:id"""
    if not test_state['chatbot_id']:
        log_test("Chatbot update", False, "No chatbot ID")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {
            "name": "Bot Uji",
            "welcomeMessage": "Halo",
            "primaryColor": "#10b981",
            "position": "bottom-left",
            "allowedDomains": ["example.com", "https://www.tokouji.id", "*.sub.id"],
            "knowledgeBase": [
                {
                    "title": "Jam buka",
                    "content": "Toko buka Senin-Sabtu 09.00-21.00 WIB. Minggu tutup."
                }
            ]
        }
        response = requests.put(f"{BASE_URL}/chatbots/{test_state['chatbot_id']}", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Verify allowedDomains normalized
            allowed = data.get('allowedDomains', [])
            expected_domains = ['example.com', 'www.tokouji.id', '*.sub.id']
            if set(allowed) == set(expected_domains):
                log_test("Chatbot update - domains normalized", True, f"Domains: {allowed}")
            else:
                log_test("Chatbot update - domains normalized", False, f"Expected {expected_domains}, got: {allowed}")
                return False
            
            # Verify knowledgeBase has ID
            kb = data.get('knowledgeBase', [])
            if len(kb) == 1 and 'id' in kb[0]:
                log_test("Chatbot update - knowledge base", True, f"KB entry has ID: {kb[0]['id']}")
            else:
                log_test("Chatbot update - knowledge base", False, f"KB should have 1 entry with ID, got: {kb}")
                return False
            
        else:
            log_test("Chatbot update", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chatbot update", False, f"Exception: {str(e)}")
        return False
    
    # Test invalid color fallback
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {"primaryColor": "red"}
        response = requests.put(f"{BASE_URL}/chatbots/{test_state['chatbot_id']}", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # Should fall back to previous color (#10b981)
            if data.get('primaryColor') == '#10b981':
                log_test("Chatbot update - invalid color fallback", True, f"Color remained: {data.get('primaryColor')}")
            else:
                log_test("Chatbot update - invalid color fallback", False, f"Expected #10b981, got: {data.get('primaryColor')}")
                return False
        else:
            log_test("Chatbot update - invalid color", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chatbot update - invalid color", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_chatbot_create_trial_limit():
    """Test 7: POST /api/chatbots on trial plan (should fail)"""
    if not test_state['tenant_token']:
        log_test("Chatbot create trial limit", False, "No tenant token")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {"name": "Second Bot"}
        response = requests.post(f"{BASE_URL}/chatbots", json=payload, headers=headers, timeout=10)
        if response.status_code == 403:
            log_test("Chatbot create on trial (maxChatbots=1)", True, f"Correctly returned 403")
            return True
        else:
            log_test("Chatbot create on trial", False, f"Expected 403, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chatbot create on trial", False, f"Exception: {str(e)}")
        return False

def test_public_config():
    """Test 8: GET /api/v1/bot/:id/config"""
    if not test_state['chatbot_id']:
        log_test("Public config", False, "No chatbot ID")
        return False
    
    # Test with evil.com origin (403)
    try:
        headers = {"Origin": "https://evil.com"}
        response = requests.get(f"{BASE_URL}/v1/bot/{test_state['chatbot_id']}/config", headers=headers, timeout=10)
        if response.status_code == 403:
            log_test("Public config - evil origin", True, f"Correctly returned 403")
        else:
            log_test("Public config - evil origin", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Public config - evil origin", False, f"Exception: {str(e)}")
        return False
    
    # Test with allowed origin example.com (200)
    try:
        headers = {"Origin": "https://www.example.com"}
        response = requests.get(f"{BASE_URL}/v1/bot/{test_state['chatbot_id']}/config", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ['name', 'primaryColor', 'position', 'welcomeMessage']
            if all(field in data for field in required_fields):
                log_test("Public config - allowed origin", True, f"Config: {data.get('name')}")
            else:
                log_test("Public config - allowed origin", False, f"Missing fields, got: {data.keys()}")
                return False
        else:
            log_test("Public config - allowed origin", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Public config - allowed origin", False, f"Exception: {str(e)}")
        return False
    
    # Test with wildcard subdomain (200)
    try:
        headers = {"Origin": "https://a.sub.id"}
        response = requests.get(f"{BASE_URL}/v1/bot/{test_state['chatbot_id']}/config", headers=headers, timeout=10)
        if response.status_code == 200:
            log_test("Public config - wildcard subdomain", True, f"Wildcard matched")
        else:
            log_test("Public config - wildcard subdomain", False, f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Public config - wildcard subdomain", False, f"Exception: {str(e)}")
        return False
    
    # Test with random UUID (404)
    try:
        random_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/v1/bot/{random_id}/config", timeout=10)
        if response.status_code == 404:
            log_test("Public config - unknown bot", True, f"Correctly returned 404")
        else:
            log_test("Public config - unknown bot", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Public config - unknown bot", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_chat_streaming():
    """Test 9: POST /api/v1/chat (SSE streaming) - LIMITED TO 2 CALLS"""
    if not test_state['chatbot_id']:
        log_test("Chat streaming", False, "No chatbot ID")
        return False
    
    print("\n⚠️  Starting SSE streaming tests (2 LLM calls - will consume credits)")
    
    # First chat call
    try:
        headers = {"Origin": "https://example.com", "Content-Type": "application/json"}
        payload = {
            "botId": test_state['chatbot_id'],
            "message": "Apakah toko buka hari Minggu?"
        }
        response = requests.post(f"{BASE_URL}/v1/chat", json=payload, headers=headers, stream=True, timeout=30)
        
        if response.status_code == 200:
            if 'text/event-stream' not in response.headers.get('content-type', ''):
                log_test("Chat streaming - content type", False, f"Expected text/event-stream, got: {response.headers.get('content-type')}")
                return False
            
            events = []
            session_id = None
            final_content = ""
            
            current_event = None
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('event: '):
                        current_event = line_str[7:].strip()
                    elif line_str.startswith('data: '):
                        data_str = line_str[6:]
                        try:
                            event_data = json.loads(data_str)
                            # Handle both dict and string data
                            if isinstance(event_data, dict):
                                events.append(event_data)
                                # Meta event: {sessionId: ...}
                                if 'sessionId' in event_data and current_event == 'meta':
                                    session_id = event_data.get('sessionId')
                                # Done event: {content: ..., sessionId: ...}
                                elif 'content' in event_data and current_event == 'done':
                                    final_content = event_data.get('content', '')
                            elif isinstance(event_data, str):
                                # Some SSE implementations send plain strings
                                events.append({'event': 'delta', 'content': event_data})
                        except json.JSONDecodeError:
                            # Plain text delta
                            pass
            
            # Verify session ID
            if not session_id:
                log_test("Chat streaming - session ID", False, f"No sessionId in meta event. Events: {events[:3]}")
                return False
            
            test_state['session_id'] = session_id
            
            # Verify we got delta events and done event
            has_done = any('content' in e and len(str(e.get('content', ''))) > 10 for e in events)
            if not has_done:
                log_test("Chat streaming - events", False, f"Missing done event with content, got: {len(events)} events")
                return False
            
            # Verify content mentions knowledge base (Minggu/tutup)
            if 'minggu' in final_content.lower() or 'tutup' in final_content.lower():
                log_test("Chat streaming - first call", True, f"Session: {session_id[:8]}..., KB used")
            else:
                log_test("Chat streaming - first call", False, f"Content doesn't mention Minggu/tutup: {final_content[:100]}")
                return False
        else:
            log_test("Chat streaming - first call", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chat streaming - first call", False, f"Exception: {str(e)}")
        return False
    
    # Second chat call with same session (history)
    try:
        headers = {"Origin": "https://example.com", "Content-Type": "application/json"}
        payload = {
            "botId": test_state['chatbot_id'],
            "sessionId": test_state['session_id'],
            "message": "Jam berapa bukanya?"
        }
        response = requests.post(f"{BASE_URL}/v1/chat", json=payload, headers=headers, stream=True, timeout=30)
        
        if response.status_code == 200:
            final_content = ""
            current_event = None
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('event: '):
                        current_event = line_str[7:].strip()
                    elif line_str.startswith('data: '):
                        data_str = line_str[6:]
                        try:
                            event_data = json.loads(data_str)
                            if isinstance(event_data, dict) and 'content' in event_data and current_event == 'done':
                                final_content = event_data.get('content', '')
                        except json.JSONDecodeError:
                            pass
            
            if final_content:
                log_test("Chat streaming - second call with history", True, f"Response received: {final_content[:50]}...")
            else:
                log_test("Chat streaming - second call with history", False, "No content in done event")
                return False
        else:
            log_test("Chat streaming - second call", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chat streaming - second call", False, f"Exception: {str(e)}")
        return False
    
    # Negative tests (no LLM cost)
    
    # Evil origin (403)
    try:
        headers = {"Origin": "https://evil.com", "Content-Type": "application/json"}
        payload = {"botId": test_state['chatbot_id'], "message": "test"}
        response = requests.post(f"{BASE_URL}/v1/chat", json=payload, headers=headers, timeout=10)
        if response.status_code == 403:
            log_test("Chat streaming - evil origin", True, "Correctly returned 403")
        else:
            log_test("Chat streaming - evil origin", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Chat streaming - evil origin", False, f"Exception: {str(e)}")
        return False
    
    # Missing botId (400)
    try:
        headers = {"Origin": "https://example.com", "Content-Type": "application/json"}
        payload = {"message": "test"}
        response = requests.post(f"{BASE_URL}/v1/chat", json=payload, headers=headers, timeout=10)
        if response.status_code == 400:
            log_test("Chat streaming - missing botId", True, "Correctly returned 400")
        else:
            log_test("Chat streaming - missing botId", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Chat streaming - missing botId", False, f"Exception: {str(e)}")
        return False
    
    # Unknown botId (404)
    try:
        headers = {"Origin": "https://example.com", "Content-Type": "application/json"}
        payload = {"botId": str(uuid.uuid4()), "message": "test"}
        response = requests.post(f"{BASE_URL}/v1/chat", json=payload, headers=headers, timeout=10)
        if response.status_code == 404:
            log_test("Chat streaming - unknown botId", True, "Correctly returned 404")
        else:
            log_test("Chat streaming - unknown botId", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Chat streaming - unknown botId", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_tenant_stats():
    """Test 10: GET /api/tenant and /api/tenant/stats"""
    if not test_state['tenant_token']:
        log_test("Tenant stats", False, "No tenant token")
        return False
    
    # GET /api/tenant
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/tenant", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            messages_used = data.get('messagesUsed', 0)
            quota_remaining = data.get('quotaRemaining', 0)
            
            if messages_used == 2:
                log_test("Tenant - messagesUsed", True, f"messagesUsed: {messages_used}")
            else:
                log_test("Tenant - messagesUsed", False, f"Expected 2, got: {messages_used}")
                return False
            
            if quota_remaining == 98:
                log_test("Tenant - quotaRemaining", True, f"quotaRemaining: {quota_remaining}")
            else:
                log_test("Tenant - quotaRemaining", False, f"Expected 98, got: {quota_remaining}")
                return False
        else:
            log_test("Tenant GET", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Tenant GET", False, f"Exception: {str(e)}")
        return False
    
    # GET /api/tenant/stats
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/tenant/stats", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Verify structure
            if 'daily' not in data or 'totalSessions' not in data or 'totalMessages' not in data or 'chatbots' not in data:
                log_test("Tenant stats - structure", False, f"Missing fields, got: {data.keys()}")
                return False
            
            # Verify daily has 7 items
            if len(data['daily']) != 7:
                log_test("Tenant stats - daily", False, f"Expected 7 daily items, got: {len(data['daily'])}")
                return False
            
            # Verify totalSessions >= 1
            if data['totalSessions'] < 1:
                log_test("Tenant stats - totalSessions", False, f"Expected >= 1, got: {data['totalSessions']}")
                return False
            
            # Verify totalMessages >= 2
            if data['totalMessages'] < 2:
                log_test("Tenant stats - totalMessages", False, f"Expected >= 2, got: {data['totalMessages']}")
                return False
            
            log_test("Tenant stats", True, f"Sessions: {data['totalSessions']}, Messages: {data['totalMessages']}")
        else:
            log_test("Tenant stats", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Tenant stats", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_conversations():
    """Test 11: GET /api/chatbots/:id/conversations"""
    if not test_state['chatbot_id'] or not test_state['tenant_token']:
        log_test("Conversations", False, "No chatbot ID or token")
        return False
    
    # GET conversations list
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/chatbots/{test_state['chatbot_id']}/conversations", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 1:
                log_test("Conversations list", True, f"Found {len(data)} session(s)")
                
                # Use the session_id from our chat streaming test
                if not test_state.get('session_id'):
                    log_test("Conversation detail", False, "No session_id from chat streaming")
                    return False
                
                # GET specific conversation using our session_id
                response2 = requests.get(f"{BASE_URL}/chatbots/{test_state['chatbot_id']}/conversations/{test_state['session_id']}", headers=headers, timeout=10)
                if response2.status_code == 200:
                    conv_data = response2.json()
                    if 'session' in conv_data and 'messages' in conv_data:
                        messages = conv_data['messages']
                        if len(messages) >= 4:
                            # Count user and assistant messages
                            user_msgs = [m for m in messages if m.get('role') == 'user']
                            assistant_msgs = [m for m in messages if m.get('role') == 'assistant']
                            
                            if len(user_msgs) >= 2 and len(assistant_msgs) >= 2:
                                log_test("Conversation detail", True, f"Session has {len(user_msgs)} user + {len(assistant_msgs)} assistant messages")
                            else:
                                log_test("Conversation detail", False, f"Expected 2+ user and 2+ assistant, got: {len(user_msgs)} user, {len(assistant_msgs)} assistant")
                                return False
                        else:
                            log_test("Conversation detail", False, f"Expected >= 4 messages, got: {len(messages)}")
                            return False
                    else:
                        log_test("Conversation detail", False, f"Missing session/messages, got: {conv_data.keys()}")
                        return False
                else:
                    log_test("Conversation detail", False, f"Status {response2.status_code}: {response2.text}")
                    return False
            else:
                log_test("Conversations list", False, f"Expected >= 1 session, got: {len(data) if isinstance(data, list) else 'not a list'}")
                return False
        else:
            log_test("Conversations list", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Conversations", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_billing_checkout():
    """Test 12: POST /api/billing/checkout"""
    if not test_state['tenant_token']:
        log_test("Billing checkout", False, "No tenant token")
        return False
    
    # Valid checkout for 'pro' plan
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {"plan": "pro"}
        response = requests.post(f"{BASE_URL}/billing/checkout", json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            data = response.json()
            
            # Verify payment structure
            required_fields = ['status', 'amount', 'reference', 'qrString', 'merchantRef']
            if not all(field in data for field in required_fields):
                log_test("Billing checkout - structure", False, f"Missing fields, got: {data.keys()}")
                return False
            
            if data['status'] != 'UNPAID':
                log_test("Billing checkout - status", False, f"Expected UNPAID, got: {data['status']}")
                return False
            
            if data['amount'] != 299000:
                log_test("Billing checkout - amount", False, f"Expected 299000, got: {data['amount']}")
                return False
            
            if not data['reference'].startswith('DEV-T'):
                log_test("Billing checkout - reference", False, f"Expected reference to start with DEV-T, got: {data['reference']}")
                return False
            
            test_state['payment_id'] = data.get('id')
            test_state['payment_reference'] = data['reference']
            
            log_test("Billing checkout - pro plan", True, f"Payment created: {data['reference']}")
        else:
            log_test("Billing checkout - pro plan", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Billing checkout - pro plan", False, f"Exception: {str(e)}")
        return False
    
    # Invalid plan 'trial' (400)
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {"plan": "trial"}
        response = requests.post(f"{BASE_URL}/billing/checkout", json=payload, headers=headers, timeout=10)
        if response.status_code == 400:
            log_test("Billing checkout - trial plan", True, "Correctly returned 400")
        else:
            log_test("Billing checkout - trial plan", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Billing checkout - trial plan", False, f"Exception: {str(e)}")
        return False
    
    # Invalid plan 'xyz' (400)
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {"plan": "xyz"}
        response = requests.post(f"{BASE_URL}/billing/checkout", json=payload, headers=headers, timeout=10)
        if response.status_code == 400:
            log_test("Billing checkout - invalid plan", True, "Correctly returned 400")
        else:
            log_test("Billing checkout - invalid plan", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Billing checkout - invalid plan", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_billing_payments():
    """Test GET /api/billing/payments"""
    if not test_state['tenant_token'] or not test_state['payment_id']:
        log_test("Billing payments", False, "No tenant token or payment ID")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/billing/payments", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Find our payment
                our_payment = next((p for p in data if p.get('id') == test_state['payment_id']), None)
                if our_payment:
                    log_test("Billing payments list", True, f"Found payment: {our_payment.get('reference')}")
                else:
                    log_test("Billing payments list", False, f"Payment {test_state['payment_id']} not found in list")
                    return False
            else:
                log_test("Billing payments list", False, "Expected array")
                return False
        else:
            log_test("Billing payments list", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Billing payments list", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_billing_simulate():
    """Test POST /api/billing/payments/:id/simulate"""
    if not test_state['tenant_token'] or not test_state['payment_id']:
        log_test("Billing simulate", False, "No tenant token or payment ID")
        return False
    
    # First simulate call
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.post(f"{BASE_URL}/billing/payments/{test_state['payment_id']}/simulate", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Verify payment status changed to PAID
            if 'payment' not in data or data['payment'].get('status') != 'PAID':
                log_test("Billing simulate - payment status", False, f"Expected payment.status PAID, got: {data.get('payment', {}).get('status')}")
                return False
            
            # Verify tenant plan upgraded to pro
            if 'tenant' not in data or data['tenant'].get('plan') != 'pro':
                log_test("Billing simulate - tenant plan", False, f"Expected tenant.plan pro, got: {data.get('tenant', {}).get('plan')}")
                return False
            
            # Verify planDetails.maxChatbots is 5
            plan_details = data['tenant'].get('planDetails', {})
            if plan_details.get('maxChatbots') != 5:
                log_test("Billing simulate - maxChatbots", False, f"Expected maxChatbots 5, got: {plan_details.get('maxChatbots')}")
                return False
            
            log_test("Billing simulate - first call", True, f"Payment PAID, tenant upgraded to pro")
        else:
            log_test("Billing simulate - first call", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Billing simulate - first call", False, f"Exception: {str(e)}")
        return False
    
    # Second simulate call (idempotent)
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.post(f"{BASE_URL}/billing/payments/{test_state['payment_id']}/simulate", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('payment', {}).get('status') == 'PAID':
                log_test("Billing simulate - idempotent", True, "Still PAID")
            else:
                log_test("Billing simulate - idempotent", False, f"Expected PAID, got: {data.get('payment', {}).get('status')}")
                return False
        else:
            log_test("Billing simulate - idempotent", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Billing simulate - idempotent", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_chatbot_create_pro():
    """Test POST /api/chatbots on pro plan (should succeed)"""
    if not test_state['tenant_token']:
        log_test("Chatbot create on pro", False, "No tenant token")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {"name": "Second Bot"}
        response = requests.post(f"{BASE_URL}/chatbots", json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            data = response.json()
            log_test("Chatbot create on pro plan", True, f"Created: {data.get('name')}")
            return True
        else:
            log_test("Chatbot create on pro plan", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Chatbot create on pro plan", False, f"Exception: {str(e)}")
        return False

def test_webhook():
    """Test 13: POST /api/webhooks/tripay"""
    if not test_state['tenant_token']:
        log_test("Webhook", False, "No tenant token")
        return False
    
    # Create another checkout for starter plan
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        payload = {"plan": "starter"}
        response = requests.post(f"{BASE_URL}/billing/checkout", json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            data = response.json()
            test_state['second_payment_id'] = data.get('id')
            test_state['second_payment_reference'] = data['reference']
            log_test("Webhook - create starter checkout", True, f"Payment: {data['reference']}")
        else:
            log_test("Webhook - create starter checkout", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Webhook - create starter checkout", False, f"Exception: {str(e)}")
        return False
    
    # Call webhook with valid reference
    try:
        payload = {
            "reference": test_state['second_payment_reference'],
            "status": "PAID"
        }
        response = requests.post(f"{BASE_URL}/webhooks/tripay", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('status') == 'PAID':
                log_test("Webhook - valid reference", True, f"Payment marked PAID")
            else:
                log_test("Webhook - valid reference", False, f"Expected success:true, status:PAID, got: {data}")
                return False
        else:
            log_test("Webhook - valid reference", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Webhook - valid reference", False, f"Exception: {str(e)}")
        return False
    
    # Verify payment is PAID
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/billing/payments", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            payment = next((p for p in data if p.get('id') == test_state['second_payment_id']), None)
            if payment and payment.get('status') == 'PAID':
                log_test("Webhook - payment status verified", True, "Payment is PAID")
            else:
                log_test("Webhook - payment status verified", False, f"Payment not PAID: {payment}")
                return False
        else:
            log_test("Webhook - payment status verified", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Webhook - payment status verified", False, f"Exception: {str(e)}")
        return False
    
    # Webhook with unknown reference (404)
    try:
        payload = {"reference": "UNKNOWN-REF", "status": "PAID"}
        response = requests.post(f"{BASE_URL}/webhooks/tripay", json=payload, timeout=10)
        if response.status_code == 404:
            log_test("Webhook - unknown reference", True, "Correctly returned 404")
        else:
            log_test("Webhook - unknown reference", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Webhook - unknown reference", False, f"Exception: {str(e)}")
        return False
    
    # Webhook with missing reference (400)
    try:
        payload = {"status": "PAID"}
        response = requests.post(f"{BASE_URL}/webhooks/tripay", json=payload, timeout=10)
        if response.status_code == 400:
            log_test("Webhook - missing reference", True, "Correctly returned 400")
        else:
            log_test("Webhook - missing reference", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Webhook - missing reference", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_admin_login():
    """Test 14: Admin login"""
    try:
        payload = {
            "email": "admin@babehchatin.com",
            "password": "Admin123!"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'token' in data:
                test_state['admin_token'] = data['token']
                log_test("Admin login", True, "Admin token received")
                return True
            else:
                log_test("Admin login", False, "No token in response")
                return False
        else:
            log_test("Admin login", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin login", False, f"Exception: {str(e)}")
        return False

def test_admin_overview():
    """Test GET /api/admin/overview"""
    if not test_state['admin_token']:
        log_test("Admin overview", False, "No admin token")
        return False
    
    # Test tenant token on admin endpoint (403)
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/admin/overview", headers=headers, timeout=10)
        if response.status_code == 403:
            log_test("Admin overview - tenant token", True, "Correctly returned 403")
        else:
            log_test("Admin overview - tenant token", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Admin overview - tenant token", False, f"Exception: {str(e)}")
        return False
    
    # Test admin token
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        response = requests.get(f"{BASE_URL}/admin/overview", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Verify structure (API returns 'revenue' not 'totalRevenue', 'byPlan' not 'revenueByPlan')
            required_fields = ['totalTenants', 'totalChatbots', 'totalMessages', 'revenue', 'byPlan']
            if not all(field in data for field in required_fields):
                log_test("Admin overview - structure", False, f"Missing fields, got: {data.keys()}")
                return False
            
            # Verify revenue > 0
            if data['revenue'] <= 0:
                log_test("Admin overview - revenue", False, f"Expected revenue > 0, got: {data['revenue']}")
                return False
            
            log_test("Admin overview", True, f"Revenue: {data['revenue']}, Tenants: {data['totalTenants']}")
        else:
            log_test("Admin overview", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin overview", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_admin_tenants():
    """Test GET /api/admin/tenants and PUT /api/admin/tenants/:id"""
    if not test_state['admin_token'] or not test_state['tenant_data']:
        log_test("Admin tenants", False, "No admin token or tenant data")
        return False
    
    tenant_id = test_state['tenant_data']['id']
    
    # GET tenants list
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        response = requests.get(f"{BASE_URL}/admin/tenants", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Find our tenant
                our_tenant = next((t for t in data if t.get('id') == tenant_id), None)
                if our_tenant:
                    if 'ownerEmail' in our_tenant and 'chatbotCount' in our_tenant:
                        log_test("Admin tenants list", True, f"Found tenant: {our_tenant.get('businessName')}")
                    else:
                        log_test("Admin tenants list", False, f"Missing ownerEmail/chatbotCount in tenant")
                        return False
                else:
                    log_test("Admin tenants list", False, f"Tenant {tenant_id} not found")
                    return False
            else:
                log_test("Admin tenants list", False, "Expected array")
                return False
        else:
            log_test("Admin tenants list", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin tenants list", False, f"Exception: {str(e)}")
        return False
    
    # PUT suspend tenant
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        payload = {"status": "suspended"}
        response = requests.put(f"{BASE_URL}/admin/tenants/{tenant_id}", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'suspended':
                log_test("Admin tenants - suspend", True, "Tenant suspended")
            else:
                log_test("Admin tenants - suspend", False, f"Expected status suspended, got: {data.get('status')}")
                return False
        else:
            log_test("Admin tenants - suspend", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin tenants - suspend", False, f"Exception: {str(e)}")
        return False
    
    # Verify tenant can't access (403)
    try:
        headers = {"Authorization": f"Bearer {test_state['tenant_token']}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        if response.status_code == 403:
            log_test("Admin tenants - suspended access", True, "Tenant correctly blocked")
        else:
            log_test("Admin tenants - suspended access", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Admin tenants - suspended access", False, f"Exception: {str(e)}")
        return False
    
    # PUT reactivate with extendDays and resetUsage
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        payload = {"status": "active", "extendDays": 10, "resetUsage": True}
        response = requests.put(f"{BASE_URL}/admin/tenants/{tenant_id}", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Verify messagesUsed reset to 0
            if data.get('messagesUsed') != 0:
                log_test("Admin tenants - resetUsage", False, f"Expected messagesUsed 0, got: {data.get('messagesUsed')}")
                return False
            
            # Verify planExpiresAt increased (can't check exact value, just that it exists)
            if 'planExpiresAt' not in data:
                log_test("Admin tenants - extendDays", False, "planExpiresAt missing")
                return False
            
            log_test("Admin tenants - reactivate", True, "Tenant reactivated, usage reset, plan extended")
        else:
            log_test("Admin tenants - reactivate", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin tenants - reactivate", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_admin_payments():
    """Test GET /api/admin/payments"""
    if not test_state['admin_token']:
        log_test("Admin payments", False, "No admin token")
        return False
    
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        response = requests.get(f"{BASE_URL}/admin/payments", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Verify tenantName is included
                first_payment = data[0]
                if 'tenantName' in first_payment:
                    log_test("Admin payments", True, f"Found {len(data)} payments with tenantName")
                else:
                    log_test("Admin payments", False, "tenantName missing from payment")
                    return False
            else:
                log_test("Admin payments", False, "Expected non-empty array")
                return False
        else:
            log_test("Admin payments", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin payments", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_admin_settings():
    """Test GET/PUT /api/admin/settings"""
    if not test_state['admin_token']:
        log_test("Admin settings", False, "No admin token")
        return False
    
    # GET settings
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        response = requests.get(f"{BASE_URL}/admin/settings", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'llmProvider' in data and 'llmModel' in data:
                log_test("Admin settings GET", True, f"Provider: {data['llmProvider']}, Model: {data['llmModel']}")
            else:
                log_test("Admin settings GET", False, f"Missing llmProvider/llmModel, got: {data.keys()}")
                return False
        else:
            log_test("Admin settings GET", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin settings GET", False, f"Exception: {str(e)}")
        return False
    
    # PUT settings (update temperature and maxTokens)
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        payload = {"temperature": 0.7, "maxTokens": 600}
        response = requests.put(f"{BASE_URL}/admin/settings", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('temperature') == 0.7 and data.get('maxTokens') == 600:
                log_test("Admin settings PUT", True, "Settings updated")
            else:
                log_test("Admin settings PUT", False, f"Expected temp 0.7, maxTokens 600, got: {data.get('temperature')}, {data.get('maxTokens')}")
                return False
        else:
            log_test("Admin settings PUT", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin settings PUT", False, f"Exception: {str(e)}")
        return False
    
    # Restore original settings
    try:
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        payload = {"temperature": 0.4, "maxTokens": 800}
        response = requests.put(f"{BASE_URL}/admin/settings", json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            log_test("Admin settings - restore", True, "Settings restored")
        else:
            log_test("Admin settings - restore", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin settings - restore", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_widget_js():
    """Test 15: GET /api/widget.js"""
    try:
        response = requests.get(f"{BASE_URL}/widget.js", timeout=10)
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if 'application/javascript' not in content_type:
                log_test("Widget.js - content type", False, f"Expected application/javascript, got: {content_type}")
                return False
            
            body = response.text
            if 'data-bot-id' in body and '/api/v1/chat' in body:
                log_test("Widget.js", True, f"Contains data-bot-id and /api/v1/chat")
            else:
                log_test("Widget.js", False, "Missing data-bot-id or /api/v1/chat in body")
                return False
        else:
            log_test("Widget.js", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Widget.js", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_unknown_route():
    """Test 16: Unknown route"""
    try:
        response = requests.get(f"{BASE_URL}/nothing", timeout=10)
        if response.status_code == 404:
            log_test("Unknown route", True, "Correctly returned 404")
            return True
        else:
            log_test("Unknown route", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Unknown route", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("BABEHCHATin Backend API Test Suite")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print("=" * 80)
    
    results = []
    
    # Run tests in order
    tests = [
        ("1. Health", test_health),
        ("2. Plans", test_plans),
        ("3. Register", test_register),
        ("4. Login", test_login),
        ("4. Auth Me", test_auth_me),
        ("5. Chatbots List", test_chatbots_list),
        ("5. Chatbot Get", test_chatbot_get),
        ("6. Chatbot Update", test_chatbot_update),
        ("7. Chatbot Create Trial Limit", test_chatbot_create_trial_limit),
        ("8. Public Config", test_public_config),
        ("9. Chat Streaming", test_chat_streaming),
        ("10. Tenant Stats", test_tenant_stats),
        ("11. Conversations", test_conversations),
        ("12. Billing Checkout", test_billing_checkout),
        ("12. Billing Payments", test_billing_payments),
        ("12. Billing Simulate", test_billing_simulate),
        ("12. Chatbot Create Pro", test_chatbot_create_pro),
        ("13. Webhook", test_webhook),
        ("14. Admin Login", test_admin_login),
        ("14. Admin Overview", test_admin_overview),
        ("14. Admin Tenants", test_admin_tenants),
        ("14. Admin Payments", test_admin_payments),
        ("14. Admin Settings", test_admin_settings),
        ("15. Widget.js", test_widget_js),
        ("16. Unknown Route", test_unknown_route),
    ]
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ FAIL: {name} - Unhandled exception: {str(e)}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"Total: {passed}/{total} tests passed")
    print("=" * 80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
