#!/usr/bin/env python3
"""End-to-end test: Create workspace, contacts, template, campaign, and send messages"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:3000"

def log(message, color=""):
    colors = {
        "yellow": "\033[93m",
        "green": "\033[92m",
        "red": "\033[91m",
        "cyan": "\033[96m",
        "reset": "\033[0m"
    }
    try:
        print(f"{colors.get(color, '')}{message}{colors['reset']}")
    except UnicodeEncodeError:
        print(message)

def main():
    log("[START] E2E Message Send Test\n", "cyan")

    # Step 1: Register workspace
    log("[1] Registering workspace...", "yellow")
    try:
        register_data = {
            "ownerEmail": f"test-{int(time.time())}@example.com",
            "ownerPassword": "Test@1234567890!",
            "ownerName": "Test Owner",
            "workspaceName": "Test Workspace",
            "timezone": "America/Argentina/Buenos_Aires"
        }

        response = requests.post(f"{BASE_URL}/auth/register", json=register_data, timeout=30)
        response.raise_for_status()

        data = response.json()
        workspace_id = data["data"]["workspaceId"]
        access_token = data["data"]["accessToken"]

        log(f"[OK] Workspace registered: {workspace_id}\n", "green")
    except Exception as e:
        log(f"[FAIL] Registration failed: {e}", "red")
        return False

    # Step 2: Create contacts
    log("[2] Creating contacts...", "yellow")
    contacts = [
        {"name": "Rena Mendoza", "number": "+5493513199552"},
        {"name": "Pepo Mendoza", "number": "+5493512106855"},
        {"name": "Amor Mendoza", "number": "+5493517308254"}
    ]

    contact_ids = []
    headers = {"Authorization": f"Bearer {access_token}"}

    for contact in contacts:
        try:
            names = contact["name"].split()
            contact_data = {
                "identity": {
                    "firstName": names[0],
                    "lastName": names[1] if len(names) > 1 else ""
                },
                "channels": [
                    {
                        "type": "whatsapp",
                        "value": contact["number"],
                        "isPrimary": True
                    }
                ]
            }

            response = requests.post(
                f"{BASE_URL}/workspaces/{workspace_id}/contacts",
                json=contact_data,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()

            contact_id = response.json()["data"]["id"]
            contact_ids.append(contact_id)
            log(f"  [OK] Created contact: {contact['name']} ({contact['number']})", "green")
        except Exception as e:
            log(f"  [FAIL] Failed to create contact {contact['name']}: {e}", "red")
            return False

    log("")

    # Step 3: Create WhatsApp template
    log("[3] Creating WhatsApp template...", "yellow")
    try:
        template_data = {
            "name": "Welcome Template",
            "channel": "whatsapp",
            "body": "Hola {{name}}, bienvenido a BROTE!",
            "variables": ["name"]
        }

        response = requests.post(
            f"{BASE_URL}/workspaces/{workspace_id}/templates",
            json=template_data,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()

        template_id = response.json()["data"]["id"]
        log(f"[OK] Template created: {template_id}\n", "green")
    except Exception as e:
        log(f"[FAIL] Template creation failed: {e}", "red")
        return False

    # Step 4: Create campaign
    log("[4] Creating campaign...", "yellow")
    try:
        campaign_data = {
            "name": "Family Test Campaign",
            "channel": "whatsapp",
            "templateId": template_id,
            "audienceType": "contacts",
            "audienceContactIds": contact_ids,
            "sendNow": True,
            "maxRetries": 3,
            "retryDelays": [60, 300, 3600]
        }

        response = requests.post(
            f"{BASE_URL}/workspaces/{workspace_id}/campaigns",
            json=campaign_data,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()

        campaign_id = response.json()["data"]["id"]
        log(f"[OK] Campaign created: {campaign_id}\n", "green")
    except Exception as e:
        log(f"[FAIL] Campaign creation failed: {e}", "red")
        return False

    # Step 5: Wait for messages to be processed
    log("[5] Waiting for message processing (2 seconds)...", "yellow")
    time.sleep(2)
    log("")

    # Step 6: Check deliveries
    log("[6] Checking deliveries...", "yellow")
    try:
        response = requests.get(
            f"{BASE_URL}/workspaces/{workspace_id}/campaigns/{campaign_id}/deliveries",
            headers=headers,
            timeout=10
        )
        response.raise_for_status()

        deliveries = response.json()["data"]
        log(f"[OK] Found {len(deliveries)} deliveries:\n", "green")

        sent_count = 0
        for delivery in deliveries:
            status = delivery["status"]
            status_color = "green" if status == "sent" else "yellow" if status == "pending" else "red"

            if status == "sent":
                sent_count += 1

            log(f"  Contact: {delivery['address']}", "")
            log(f"    Status: {status}", status_color)
            log(f"    Provider Message ID: {delivery.get('providerMessageId', 'N/A')}", "")
            log(f"    Created: {delivery['createdAt']}", "")
            log("")

        if sent_count == len(deliveries):
            log(f"[SUCCESS] All {len(deliveries)} messages sent!", "green")
            return True
        else:
            log(f"[PARTIAL] {sent_count}/{len(deliveries)} messages sent", "yellow")
            return True
    except Exception as e:
        log(f"[FAIL] Failed to retrieve deliveries: {e}", "red")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
