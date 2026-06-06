#!/usr/bin/env python3
"""
FlowPay Setup Script
Initializes the development environment
"""

import os
import subprocess
import sys
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run shell command"""
    print(f"🚀 Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=False)
    if result.returncode != 0:
        print(f"❌ Command failed: {cmd}")
        return False
    return True

def setup_project():
    """Setup FlowPay development environment"""
    
    project_root = Path(__file__).parent
    
    print("🎯 FlowPay Setup")
    print("=" * 50)
    
    # Setup frontend
    print("\n📦 Setting up Frontend...")
    frontend_dir = project_root / "frontend"
    if not run_command("npm install", cwd=frontend_dir):
        print("❌ Frontend setup failed")
        return False
    
    if not (frontend_dir / ".env").exists():
        with open(frontend_dir / ".env", "w") as f:
            f.write(open(frontend_dir / ".env.example").read())
        print("✅ Created frontend/.env")
    
    # Setup backend
    print("\n📦 Setting up Backend...")
    backend_dir = project_root / "backend"
    if not run_command("npm install", cwd=backend_dir):
        print("❌ Backend setup failed")
        return False
    
    if not (backend_dir / ".env").exists():
        with open(backend_dir / ".env", "w") as f:
            f.write(open(backend_dir / ".env.example").read())
        print("✅ Created backend/.env")
    
    print("\n" + "=" * 50)
    print("✅ Setup Complete!")
    print("\nNext steps:")
    print("1. Update .env files with your configuration")
    print("2. Run: npm run dev")
    print("\nDocumentation:")
    print("- Getting Started: docs/GETTING_STARTED.md")
    print("- API: docs/API.md")
    print("- Architecture: docs/ARCHITECTURE.md")

if __name__ == "__main__":
    setup_project()
