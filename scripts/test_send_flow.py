#!/usr/bin/env python3
"""Test complete send flow: register -> contacts -> template -> campaign -> verify deliveries"""

import requests
import json
import time
import sys

BASE_URL = "http://localhost:3000"

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")

def test_send_flow():
    log("=" * 60)
    log("TEST: Complete Message Send Flow")
    log("=" * 60)

    # Step 1: Register
    log("\n[1/5] Registering workspace...")
    try:
        email = f"test-{int(time.time())}@example.com"
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "ownerEmail": email,
            "ownerPassword": "Test@1234567890!",
            "ownerName": "Test User",
            "workspaceName": "Test Workspace",
            "timezone": "UTC"
        }, timeout=180)
        response.raise_for_status()

        workspace_id = response.json()["data"]["workspaceId"]
        access_token = response.json()["data"]["accessToken"]
        log(f"SUCCESS: Workspace {workspace_id}")
    except Exception as e:
        log(f"FAILED: {e}", "ERROR")
        return False

    headers = {"Authorization": f"Bearer {access_token}"}

    # Step 2: Create contact
    log("\n[2/5] Creating test contact...")
    try:
        response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/contacts",
            json={
                "identity": {"firstName": "Test", "lastName": "User"},
                "channels": [{"type": "whatsapp", "value": "+5493513199552", "isPrimary": True}]
            },
            headers=headers,
            timeout=30
        )
        response.raise_for_status()

        contact_id = response.json()["data"]["id"]
        log(f"SUCCESS: Contact {contact_id}")
    except Exception as e:
        log(f"FAILED: {e}", "ERROR")
        return False

    # Step 3: Create template
    log("\n[3/5] Creating template...")
    try:
        response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/templates",
            json={
                "name": "Test Template",
                "channel": "whatsapp",
                "body": "Hola {{name}}, esto es un test",
                "variables": ["name"]
            },
            headers=headers,
            timeout=30
        )
        response.raise_for_status()

        template_id = response.json()["data"]["id"]
        log(f"SUCCESS: Template {template_id}")
    except Exception as e:
        log(f"FAILED: {e}", "ERROR")
        return False

    # Step 4: Create campaign with sendNow=true
    log("\n[4/5] Creating campaign with sendNow=true...")
    try:
        response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/campaigns",
            json={
                "name": "Test Campaign",
                "channel": "whatsapp",
                "templateId": template_id,
                "audienceType": "manual",
                "audienceContactIds": [contact_id],
                "sendNow": True,
                "maxRetries": 3,
                "retryDelays": [60, 300, 3600]
            },
            headers=headers,
            timeout=30
        )
        response.raise_for_status()

        campaign_id = response.json()["data"]["campaignId"]
        log(f"SUCCESS: Campaign {campaign_id} created and started")
    except Exception as e:
        log(f"FAILED: {e}", "ERROR")
        return False

    # Step 5: Wait and verify deliveries
    log("\n[5/5] Waiting for message processing...")
    for i in range(15):  # Wait up to 15 seconds
        time.sleep(1)
        try:
            response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/campaigns/{campaign_id}/deliveries",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()

            deliveries = response.json()["data"]
            if not deliveries:
                log(f"  Waiting... ({i+1}s)")
                continue

            log(f"\nDELIVERIES: {len(deliveries)} found")

            sent_count = 0
            failed_count = 0
            pending_count = 0

            for delivery in deliveries:
                status = delivery["status"]
                address = delivery["address"]
                provider_id = delivery.get("providerMessageId", "N/A")

                if status == "sent":
                    sent_count += 1
                    log(f"  [SENT] {address} -> {provider_id}")
                elif status == "failed":
                    failed_count += 1
                    log(f"  [FAILED] {address}")
                else:
                    pending_count += 1
                    log(f"  [PENDING] {address}")

            log(f"\nSUMMARY: Sent={sent_count}, Failed={failed_count}, Pending={pending_count}")

            if sent_count > 0:
                log("\nSUCCESS: Messages were sent!", "SUCCESS")
                return True
            elif failed_count > 0:
                log("\nFAILURE: Messages failed to send", "ERROR")
                return False
        except Exception as e:
            log(f"  Waiting... error: {e}")

    log("\nFAILURE: No deliveries found after 15 seconds", "ERROR")
    return False

if __name__ == "__main__":
    success = test_send_flow()
    sys.exit(0 if success else 1)
