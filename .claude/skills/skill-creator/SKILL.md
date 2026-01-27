---
name: skill-creator
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
license: See LICENSE.txt in original repository
---

# Skill Creator

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks—they transform Claude from a general-purpose agent into a specialized agent equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex tasks

## Core Principles

### Concise is Key

The context window is a public good. Skills share context with system prompt, conversation history, other skills' metadata, and the actual user request.

**Default assumption: Claude is already very smart.** Only add context Claude doesn't already have.

### Set Appropriate Degrees of Freedom

Match specificity to task fragility:
- **High freedom** (text-based instructions): Multiple approaches valid
- **Medium freedom** (scripts with parameters): Preferred pattern exists
- **Low freedom** (specific scripts): Operations fragile, consistency critical

### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── Frontmatter: name + description
│   └── Body: Instructions
└── Bundled Resources (optional)
    ├── scripts/       # Executable code
    ├── references/    # Documentation loaded as needed
    └── assets/        # Files used in output (templates, etc.)
```

## Skill Creation Process

1. Understand the skill with concrete examples
2. Plan reusable contents (scripts, references, assets)
3. Initialize the skill (run init_skill.py)
4. Edit the skill (implement and write SKILL.md)
5. Package the skill (run package_skill.py)
6. Iterate based on real usage

### Step 3: Initialize the Skill

Create a new skill from template:

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

This creates:
- SKILL.md with frontmatter template and TODO markers
- Example resource directories (scripts/, references/, assets/)
- Example files for reference

### Step 4: Edit the Skill

See references/workflows.md for multi-step processes and conditional logic.
See references/output-patterns.md for template and example patterns.

**Writing Guidelines:** Always use imperative/infinitive form.

**Frontmatter:**
- `name`: Skill name (hyphen-case)
- `description`: Complete description of what skill does and WHEN to use it (important for triggering)

**Body:** Instructions for using skill and bundled resources.

### Step 5: Package the Skill

Package into .skill file for distribution:

```bash
scripts/package_skill.py <path/to/skill-folder> [output-directory]
```

This validates and packages the skill automatically.

## Progressive Disclosure

Keep SKILL.md under 500 lines. Split content into references files when approaching this limit.

**Reference from SKILL.md** when creating separate files:
- Describe when to read each reference file
- Keep references one level deep from SKILL.md
- Include TOC for files >100 lines

## Resources

- Full skill template: SKILL.md (this file)
- Initialization script: scripts/init_skill.py
- Packaging script: scripts/package_skill.py
- Workflow patterns: references/workflows.md
- Output patterns: references/output-patterns.md
