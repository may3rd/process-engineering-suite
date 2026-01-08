#!/usr/bin/env python3
"""Test script to see LLM messages sent during ProcessDesignGraph execution."""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_llm_messages():
    """Test to see LLM messages during step execution."""
    print("🔍 Testing LLM Messages During ProcessDesignGraph Execution")
    print("=" * 60)

    # Test 1: Create workflow
    print("1. Creating workflow...")
    payload = {
        "problem_statement": "Design a small-scale hydrogen production plant using steam methane reforming with a capacity of 500 Nm³/h",
        "config": {
            "llm_provider": "openrouter",
            "quick_think_model": "google/gemini-2.5-flash-lite-preview-09-2025",
            "deep_think_model": "google/gemini-2.5-flash-preview-09-2025",
            "temperature": 0.7
        }
    }

    response = requests.post(f"{BASE_URL}/design-agents/workflows", json=payload)
    assert response.status_code == 200
    workflow_data = response.json()
    workflow_id = workflow_data["workflow_id"]
    print(f"✅ Workflow created: {workflow_id}")

    # Test 2: Execute step 0 (Process Requirements Analysis)
    print("\n2. Executing Step 0: Process Requirements Analysis")
    print("🎯 Watch for LLM messages in the server logs...")
    print("🔍 This will show actual LLM calls being made!")

    step_payload = {"step_index": 0}
    start_time = time.time()

    try:
        response = requests.post(f"{BASE_URL}/design-agents/workflows/{workflow_id}/execute/0", json=step_payload, timeout=120)
        end_time = time.time()

        if response.status_code == 200:
            step_data = response.json()
            print(f"✅ Step execution completed in {end_time - start_time:.1f} seconds")
            print(f"   Status: {step_data['status']}")
            print(f"   Message: {step_data['message']}")
        else:
            print(f"❌ Step execution failed: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏰ Step execution timed out after 120 seconds")
    except Exception as e:
        print(f"❌ Step execution error: {e}")

    # Test 3: Check workflow status
    print("\n3. Checking final workflow status...")
    response = requests.get(f"{BASE_URL}/design-agents/workflows/{workflow_id}")
    if response.status_code == 200:
        status_data = response.json()
        print(f"✅ Workflow status: {status_data['status']}")
        print(f"   Completed steps: {sum(1 for s in status_data['step_statuses'].values() if s == 'completed')}/12")
        print(f"   Outputs generated: {len(status_data['outputs'])}")

        # Show some output content
        if 'processRequirements' in status_data['outputs']:
            content = status_data['outputs']['processRequirements']
            print(f"\n📝 Process Requirements Output (first 200 chars):")
            print(f"   {content[:200]}{'...' if len(content) > 200 else ''}")
    else:
        print(f"❌ Status check failed: {response.status_code}")

    # Cleanup
    print("\n4. Cleaning up...")
    requests.delete(f"{BASE_URL}/design-agents/workflows/{workflow_id}")
    print("✅ Test completed!")

    print("\n" + "=" * 60)
    print("🔍 CHECK SERVER LOGS ABOVE for LLM messages!")
    print("Look for lines containing:")
    print("  - 'LLM Provider:'")
    print("  - 'Quick Thinking LLM:'")
    print("  - 'Deep Thinking LLM:'")
    print("  - '🚀 Calling ProcessDesignGraph.propagate()'")
    print("  - '📋 ProcessDesignGraph stdout output:'")
    print("  - Any messages about LLM API calls")
    print("=" * 60)

if __name__ == "__main__":
    test_llm_messages()