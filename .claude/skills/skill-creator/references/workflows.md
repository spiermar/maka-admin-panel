# Workflow Patterns

## Sequential Workflows

For complex tasks, break operations into clear, sequential steps:

```markdown
Filling a form involves these steps:

1. Analyze the form
2. Create field mapping
3. Validate mapping
4. Fill the form
5. Verify output
```

## Conditional Workflows

For tasks with branching logic:

```markdown
1. Determine type:
   **Creating new?** → Creation workflow
   **Editing existing?** → Editing workflow
```
