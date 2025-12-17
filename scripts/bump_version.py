#!/usr/bin/env python3
"""
Version bump script for Multi Git Obsidian plugin.

This script bumps the version number in manifest.json and package.json
according to semantic versioning rules.
"""

import json
import sys
import argparse
from pathlib import Path
from typing import Tuple


def parse_version(version: str) -> Tuple[int, int, int]:
    """Parse a semantic version string into major, minor, patch components."""
    parts = version.split('.')
    if len(parts) != 3:
        raise ValueError(f"Invalid version format: {version}")
    
    try:
        return int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        raise ValueError(f"Invalid version format: {version}")


def bump_version(version: str, bump_type: str) -> str:
    """Bump the version according to the specified type."""
    major, minor, patch = parse_version(version)
    
    if bump_type == 'major':
        major += 1
        minor = 0
        patch = 0
    elif bump_type == 'minor':
        minor += 1
        patch = 0
    elif bump_type == 'patch':
        patch += 1
    else:
        raise ValueError(f"Invalid bump type: {bump_type}. Must be 'major', 'minor', or 'patch'")
    
    return f"{major}.{minor}.{patch}"


def update_json_file(file_path: Path, new_version: str) -> None:
    """Update the version field in a JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data['version'] = new_version
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')  # Add trailing newline


def main():
    """Main entry point for the version bump script."""
    parser = argparse.ArgumentParser(
        description='Bump version numbers in manifest.json and package.json'
    )
    parser.add_argument(
        'bump_type',
        choices=['major', 'minor', 'patch'],
        help='Type of version bump to perform'
    )
    
    args = parser.parse_args()
    
    # Determine project root (script is in scripts/ subdirectory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    manifest_path = project_root / 'manifest.json'
    package_path = project_root / 'package.json'
    
    # Verify files exist
    if not manifest_path.exists():
        print(f"Error: manifest.json not found at {manifest_path}", file=sys.stderr)
        sys.exit(1)
    
    if not package_path.exists():
        print(f"Error: package.json not found at {package_path}", file=sys.stderr)
        sys.exit(1)
    
    # Read current version from manifest.json
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest_data = json.load(f)
    
    current_version = manifest_data.get('version')
    if not current_version:
        print("Error: No version field found in manifest.json", file=sys.stderr)
        sys.exit(1)
    
    # Calculate new version
    try:
        new_version = bump_version(current_version, args.bump_type)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Update both files
    try:
        update_json_file(manifest_path, new_version)
        update_json_file(package_path, new_version)
    except Exception as e:
        print(f"Error updating files: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Output new version to stdout (for Cline to capture)
    print(new_version)


if __name__ == '__main__':
    main()
