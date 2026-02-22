---
description: Propose and create a new specialist skill when a knowledge gap is detected during planning.
---

# Request New Skill 🆕

> [!IMPORTANT]
> Run this workflow when `/plan-feature` Step 2b finds that **no existing skill covers a required area**. Do NOT skip this step and proceed with general knowledge — a missing skill means real domain-specific risk.

---

## Step 1: Confirm the Gap

Before creating a new skill, verify no existing skill covers it:

1. List all skills: `find .agent/skills -name "SKILL.md"`
2. Read the `skills-maintainer/SKILL.md` inventory section.
3. Answer: "Is this gap truly new, or is it covered under a different skill name?"

**If already covered** → use the existing skill. Stop here.  
**If genuinely new** → continue to Step 2.

---

## Step 2: Define the New Skill

Propose the skill to the user with this structure:

```
🆕 NEW SKILL PROPOSAL: [Skill Name]

GAP IDENTIFIED:
[Describe what the current planning task needs that no existing skill covers]

PROPOSED SKILL: [skill-name-kebab-case]

SCOPE:
- What this skill covers: [1-3 sentence description]
- When it should be used: [trigger conditions]
- What it will NOT cover: [boundaries, to avoid overlap with existing skills]

OVERLAPS TO WATCH:
- [Existing skill X] covers [Y], this new skill covers [Z]

EXAMPLE SCENARIOS WHERE THIS SKILL IS NEEDED:
1. [scenario 1]
2. [scenario 2]
```

**WAIT for user approval before creating the skill.**

---

## Step 3: Create the Skill (After Approval)

1. Create folder: `.agent/skills/[skill-name]/`
2. Create `.agent/skills/[skill-name]/SKILL.md` using this template:

```markdown
---
name: [Human Readable Skill Name]
description: [One-line description of what this skill covers]
---

# [Skill Name]

## Core Responsibilities
1. [Responsibility 1]
2. [Responsibility 2]

## Key Patterns

### [Pattern Name]
[When to use]
[Code example or checklist]

## Anti-Patterns (What NOT to Do)
- ❌ [Thing to avoid] → ✅ [Do this instead]

## Security Considerations
[Security rules specific to this domain]

## Integration with Other Skills
> See also: [related-skill-name] for [what it covers]

## Checklist
- [ ] [Quality check 1]
- [ ] [Quality check 2]
```

---

## Step 4: Register the New Skill

After creating the skill file:

1. **Update `skills-maintainer/SKILL.md`** — add the new skill to the inventory table.
2. **Update `plan-feature.md` Step 2b** — add the new skill to the layer-to-skill mapping table.
3. **Update `CODEMAP.md`** if the skill introduces new file patterns to track.
4. Inform user: "New skill `[name]` created and registered. It will now be consulted automatically during planning for [trigger scenario]."

---

## Step 5: Return to Planning

Once the skill is created and registered:
- Return to `/plan-feature` Step 2b.
- Re-read the new skill.
- Continue the planning process with the new domain knowledge applied.
