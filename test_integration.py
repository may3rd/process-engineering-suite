#!/usr/bin/env python3
"""Integration test for Design Agents API with frontend."""

import requests
import time
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """Test API health endpoint."""
    print("🩺 Testing API health...")
    try:
        response = requests.get(f"{BASE_URL}/design-agents/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API health: {data}")
            return True
        else:
            print(f"❌ API health failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API health error: {e}")
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
        response = requests.post(f"{BASE_URL}/design-agents/workflows", json=payload, timeout=10)
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
        response = requests.get(f"{BASE_URL}/design-agents/workflows/{workflow_id}", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Workflow status: {data['status']}")
            print(f"   Current step: {data['current_step']}")
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
            json=payload,
            timeout=30  # Allow time for step execution
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Step {step_index} execution initiated: {data['message']}")
            return data
        else:
            print(f"❌ Step execution failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Step execution error: {e}")
        return None

def test_streaming(workflow_id):
    """Test streaming endpoint."""
    print(f"\n📡 Testing streaming for {workflow_id}...")
    try:
        # Just test that the endpoint is accessible
        response = requests.get(f"{BASE_URL}/design-agents/workflows/{workflow_id}/stream", timeout=5)
        if response.status_code == 200:
            print("✅ Streaming endpoint accessible")
            return True
        else:
            print(f"❌ Streaming endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Streaming test error: {e}")
        return False

def main():
    """Run the integration tests."""
    print("🚀 Starting Design Agents API Integration Tests")
    print("=" * 60)

    # Test 1: API Health
    if not test_health():
        print("❌ API not available, exiting")
        sys.exit(1)

    # Test 2: Create workflow
    workflow_id = test_workflow_creation()
    if not workflow_id:
        print("❌ Cannot continue without workflow, exiting")
        sys.exit(1)

    # Test 3: Check initial status
    status = test_workflow_status(workflow_id)
    if not status:
        sys.exit(1)

    # Test 4: Test streaming endpoint
    if not test_streaming(workflow_id):
        print("⚠️ Streaming test failed, but continuing...")

    # Test 5: Execute first step
    result = test_step_execution(workflow_id, 0)
    if result:
        print("✅ Step execution initiated successfully")

        # Wait a bit and check status again
        time.sleep(2)
        final_status = test_workflow_status(workflow_id)
        if final_status:
            print(f"📊 Final status: {final_status['status']}")

    print("\n✅ Integration testing completed!")
    print(f"📝 Workflow ID: {workflow_id}")
    print("💡 The workflow will remain active for further testing")

if __name__ == "__main__":
    main()