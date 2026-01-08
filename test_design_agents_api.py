#!/usr/bin/env python3
"""Test script for Design Agents API."""

import requests
import json
import time
import threading
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint."""
    print("🩺 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/design-agents/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_workflow_creation():
    """Test workflow creation."""
    print("\n🔧 Testing workflow creation...")
    payload = {
        "problem_statement": "Design a small-scale hydrogen production facility using methane reforming",
        "config": {
            "llm_provider": "openrouter",
            "quick_think_model": "google/gemini-2.5-flash-lite-preview-09-2025",
            "deep_think_model": "google/gemini-2.5-flash-preview-09-2025",
            "temperature": 0.7,
            "resume_from_last": True
        }
    }

    try:
        response = requests.post(f"{BASE_URL}/design-agents/workflows", json=payload)
        if response.status_code == 200:
            data = response.json()
            workflow_id = data["workflow_id"]
            print(f"✅ Workflow created: {workflow_id}")
            return workflow_id
        else:
            print(f"❌ Workflow creation failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Workflow creation error: {e}")
        return None

def test_workflow_status(workflow_id):
    """Test getting workflow status."""
    print(f"\n📊 Testing workflow status for {workflow_id}...")
    try:
        response = requests.get(f"{BASE_URL}/design-agents/workflows/{workflow_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Workflow status: {data['status']}")
            print(f"   Current step: {data['current_step']}")
            print(f"   Steps completed: {sum(1 for s in data['step_statuses'].values() if s == 'completed')}/12")
            return data
        else:
            print(f"❌ Status check failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Status check error: {e}")
        return None

def test_step_execution(workflow_id, step_index):
    """Test executing a workflow step."""
    print(f"\n⚙️ Testing step execution: {step_index}")
    payload = {"step_index": step_index}

    try:
        response = requests.post(
            f"{BASE_URL}/design-agents/workflows/{workflow_id}/execute/{step_index}",
            json=payload
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Step {step_index} execution: {data['status']}")
            print(f"   Message: {data['message']}")
            return data
        else:
            print(f"❌ Step execution failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Step execution error: {e}")
        return None

def stream_listener(workflow_id):
    """Listen to workflow stream in a separate thread."""
    print(f"\n📡 Starting stream listener for {workflow_id}...")
    try:
        response = requests.get(f"{BASE_URL}/design-agents/workflows/{workflow_id}/stream", stream=True)
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data = line_str[6:]  # Remove 'data: ' prefix
                    if data.strip():
                        try:
                            update = json.loads(data)
                            if update.get('type') != 'heartbeat':
                                print(f"📡 Stream: {update}")
                        except:
                            print(f"📡 Raw stream: {data}")
    except Exception as e:
        print(f"❌ Stream listener error: {e}")

def main():
    """Run the API tests."""
    print("🚀 Starting Design Agents API Tests")
    print("=" * 50)

    # Test 1: Health check
    if not test_health():
        print("❌ API not available, exiting")
        return

    # Test 2: Create workflow
    workflow_id = test_workflow_creation()
    if not workflow_id:
        print("❌ Cannot continue without workflow, exiting")
        return

    # Test 3: Check initial status
    status = test_workflow_status(workflow_id)
    if not status:
        return

    # Start stream listener in background
    stream_thread = threading.Thread(target=stream_listener, args=(workflow_id,))
    stream_thread.daemon = True
    stream_thread.start()

    # Test 4: Execute a few steps
    for step in [0, 1, 2]:  # Execute first 3 steps
        result = test_step_execution(workflow_id, step)
        if result:
            time.sleep(1)  # Brief pause between steps
            test_workflow_status(workflow_id)  # Check updated status
        else:
            break

    print("\n✅ API testing completed!")
    print(f"📝 Workflow ID: {workflow_id}")
    print("💡 The workflow will remain active for testing.")

if __name__ == "__main__":
    main()