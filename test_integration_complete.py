#!/usr/bin/env python3
"""End-to-end integration test for Design Agents API with ProcessDesignAgents."""

import requests
import time
import json
import sys
import subprocess
import signal
import os

BASE_URL = "http://localhost:8000"

def start_api_server():
    """Start the API server in the background."""
    print("🚀 Starting API server...")

    # Change to API directory
    os.chdir("apps/api")

    # Start server
    server_process = subprocess.Popen([
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--log-level", "warning"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Wait for server to start
    time.sleep(3)

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ API server started successfully")
            return server_process
        else:
            print(f"❌ API server failed to start: {response.status_code}")
            server_process.terminate()
            return None
    except Exception as e:
        print(f"❌ API server connection failed: {e}")
        server_process.terminate()
        return None

def stop_api_server(process):
    """Stop the API server."""
    if process:
        process.terminate()
        process.wait()
        print("🛑 API server stopped")

def test_health():
    """Test API health endpoint."""
    print("🩺 Testing API health...")
    try:
        response = requests.get(f"{BASE_URL}/design-agents/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API health: {data}")
            return data.get('process_design_agents') == 'available'
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
        "problem_statement": "Design a small-scale hydrogen production facility using methane reforming with a capacity of 1000 Nm³/h",
        "config": {
            "llm_provider": "openrouter",
            "quick_think_model": "google/gemini-2.5-flash-lite-preview-09-2025",
            "deep_think_model": "google/gemini-2.5-flash-preview-09-2025",
            "temperature": 0.7,
            "resume_from_last": True
        }
    }

    try:
        response = requests.post(f"{BASE_URL}/design-agents/workflows", json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            workflow_id = data["workflow_id"]
            print(f"✅ Workflow created: {workflow_id}")
            print(f"   Status: {data['status']}")
            print(f"   Message: {data.get('message', 'N/A')}")
            return workflow_id
        else:
            print(f"❌ Workflow creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Workflow creation error: {e}")
        return None

def test_workflow_status(workflow_id):
    """Test getting workflow status."""
    print(f"\n📊 Testing workflow status for {workflow_id}...")
    try:
        response = requests.get(f"{BASE_URL}/design-agents/workflows/{workflow_id}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Workflow status retrieved:")
            print(f"   Status: {data['status']}")
            print(f"   Current step: {data['current_step']}")
            print(f"   Steps completed: {sum(1 for s in data['step_statuses'].values() if s == 'completed')}/12")
            print(f"   Outputs count: {len(data['outputs'])}")
            return data
        else:
            print(f"❌ Status check failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Status check error: {e}")
        return None

def test_step_execution(workflow_id, step_index):
    """Test executing a workflow step."""
    print(f"\n⚙️ Testing step execution: {step_index}")

    # First check if step can be executed
    status = test_workflow_status(workflow_id)
    if not status:
        return None

    if status.get('step_statuses', {}).get(step_index) == 'completed':
        print(f"ℹ️ Step {step_index} already completed, skipping")
        return True

    payload = {"step_index": step_index}

    try:
        response = requests.post(
            f"{BASE_URL}/design-agents/workflows/{workflow_id}/execute/{step_index}",
            json=payload,
            timeout=60  # Allow time for LLM calls
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Step {step_index} execution initiated:")
            print(f"   Status: {data['status']}")
            print(f"   Message: {data['message']}")
            print(f"   Next step available: {data['next_step_available']}")

            # Wait a bit for execution to complete
            print("   Waiting for execution to complete...")
            time.sleep(5)

            # Check final status
            final_status = test_workflow_status(workflow_id)
            if final_status and final_status['step_statuses'][step_index] == 'completed':
                print(f"   ✅ Step {step_index} completed successfully!")
                return True
            else:
                print(f"   ⚠️ Step {step_index} status: {final_status['step_statuses'][step_index] if final_status else 'unknown'}")
                return False

        else:
            print(f"❌ Step execution failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Step execution error: {e}")
        return False

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
    """Run the end-to-end integration tests."""
    print("🎯 Starting End-to-End Design Agents Integration Tests")
    print("=" * 70)

    # Start API server
    server_process = start_api_server()
    if not server_process:
        print("❌ Cannot proceed without API server")
        sys.exit(1)

    try:
        # Test 1: API Health
        pda_available = test_health()
        if not pda_available:
            print("⚠️ ProcessDesignAgents not available - some tests may fail")

        # Test 2: Create workflow
        workflow_id = test_workflow_creation()
        if not workflow_id:
            print("❌ Cannot continue without workflow")
            return

        # Test 3: Check initial status
        status = test_workflow_status(workflow_id)
        if not status:
            return

        # Test 4: Test streaming endpoint
        streaming_ok = test_streaming(workflow_id)

        # Test 5: Execute first step (Process Requirements Analysis)
        step_success = test_step_execution(workflow_id, 0)

        # Test 6: Check updated status
        final_status = test_workflow_status(workflow_id)

        # Summary
        print("\n" + "=" * 70)
        print("📋 TEST SUMMARY")
        print("=" * 70)
        print(f"✅ API Health: {'PASS' if pda_available else 'WARN'}")
        print(f"✅ Workflow Creation: {'PASS' if workflow_id else 'FAIL'}")
        print(f"✅ Status Retrieval: {'PASS' if status else 'FAIL'}")
        print(f"✅ Streaming Access: {'PASS' if streaming_ok else 'FAIL'}")
        print(f"✅ Step Execution: {'PASS' if step_success else 'FAIL'}")
        print(f"✅ Final Status: {'PASS' if final_status else 'FAIL'}")

        success_count = sum([
            1 if pda_available else 0,
            1 if workflow_id else 0,
            1 if status else 0,
            1 if streaming_ok else 0,
            1 if step_success else 0,
            1 if final_status else 0
        ])

        print(f"\n🎯 Overall Result: {success_count}/6 tests passed")

        if success_count >= 5:
            print("🎉 Integration test PASSED! Design Agents API is ready for production.")
        elif success_count >= 3:
            print("⚠️ Partial success - core functionality works but some features need attention.")
        else:
            print("❌ Integration test FAILED - major issues detected.")

    finally:
        # Clean up
        stop_api_server(server_process)

if __name__ == "__main__":
    main()