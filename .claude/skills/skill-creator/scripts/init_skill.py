#!/usr/bin/env python3
"""
Skill Initializer - Creates a new skill from template

Usage:
    init_skill.py <skill-name> --path <path>
"""

import sys
from pathlib import Path

SKILL_TEMPLATE = """---
name: {skill_name}
description: [TODO: Complete description of what the skill does and when to use it]
---

# {skill_title}

[TODO: Add skill content here]

## Resources

This skill includes example resource directories:
- scripts/ - Executable code
- references/ - Documentation loaded as needed
- assets/ - Files used in output (templates, etc.)
"""

EXAMPLE_SCRIPT = """#!/usr/bin/env python3
"""
Example script for {skill_name}
Replace with actual implementation or delete.
"""

def main():
    print("Example script for {skill_name}")

if __name__ == "__main__":
    main()
"""

EXAMPLE_REFERENCE = """# Reference Documentation

Replace with actual content or delete.
"""

def title_case_skill_name(skill_name):
    return ' '.join(word.capitalize() for word in skill_name.split('-'))

def init_skill(skill_name, path):
    skill_dir = Path(path).resolve() / skill_name
    
    if skill_dir.exists():
        print(f"Error: Directory already exists: {skill_dir}")
        return None
    
    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return None
    
    skill_title = title_case_skill_name(skill_name)
    skill_content = SKILL_TEMPLATE.format(skill_name=skill_name, skill_title=skill_title)
    
    skill_md_path = skill_dir / 'SKILL.md'
    try:
        skill_md_path.write_text(skill_content)
        print("Created SKILL.md")
    except Exception as e:
        print(f"Error creating SKILL.md: {e}")
        return None
    
    try:
        scripts_dir = skill_dir / 'scripts'
        scripts_dir.mkdir(exist_ok=True)
        example_script = scripts_dir / 'example.py'
        example_script.write_text(EXAMPLE_SCRIPT.format(skill_name=skill_name))
        example_script.chmod(0o755)
        print("Created scripts/example.py")
        
        references_dir = skill_dir / 'references'
        references_dir.mkdir(exist_ok=True)
        example_ref = references_dir / 'example.md'
        example_ref.write_text(EXAMPLE_REFERENCE)
        print("Created references/example.md")
        
        assets_dir = skill_dir / 'assets'
        assets_dir.mkdir(exist_ok=True)
        print("Created assets/")
    except Exception as e:
        print(f"Error creating resource directories: {e}")
        return None
    
    print(f"\nSkill '{skill_name}' initialized at {skill_dir}")
    print("Next steps:")
    print("1. Edit SKILL.md")
    print("2. Customize or delete example files")
    return skill_dir

if __name__ == "__main__":
    if len(sys.argv) < 4 or sys.argv[2] != '--path':
        print("Usage: init_skill.py <skill-name> --path <path>")
        sys.exit(1)
    
    skill_name = sys.argv[1]
    path = sys.argv[3]
    
    result = init_skill(skill_name, path)
    sys.exit(0 if result else 1)
