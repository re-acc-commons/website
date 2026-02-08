# /profile Command

Manage configuration profiles for different knowledge contexts.

## Usage

```
/profile                    # Show current profile and list all
/profile list               # List available profiles
/profile show <name>        # Show profile details
/profile use <name>         # Switch to a profile
/profile create <name>      # Create new profile
/profile edit <name>        # Edit profile configuration
/profile delete <name>      # Delete a profile
/profile export <name>      # Export profile as template
```

## Philosophy

Profiles let you maintain multiple knowledge contexts:
- **Work**: Project documentation, meeting notes, decisions
- **Personal**: Life memories, journal, personal growth
- **Research**: Academic papers, citations, study notes
- **Creative**: Projects, ideas, inspirations

Each profile has its own schema, sources, and processing rules.

## Profile Structure

```
~/.opal/
├── profiles/
│   ├── work/
│   │   ├── config.yaml
│   │   ├── schema.yaml
│   │   └── sources.yaml
│   ├── personal/
│   │   ├── config.yaml
│   │   ├── schema.yaml
│   │   └── sources.yaml
│   └── research/
│       ├── config.yaml
│       ├── schema.yaml
│       └── sources.yaml
└── active_profile        # Points to current profile
```

## List Profiles

```
/profile list

📁 Available Profiles
━━━━━━━━━━━━━━━━━━━━━

  ● work (active)
    Template: projects
    Path: ~/Documents/work-kb/
    Sources: meetily, filesystem
    Entities: 234

  ○ personal
    Template: life-archive
    Path: ~/Documents/life/
    Sources: filesystem
    Entities: 156

  ○ research
    Template: research
    Path: ~/Documents/research/
    Sources: filesystem (Zotero)
    Entities: 89

  ○ creative
    Template: creative
    Path: ~/Documents/creative/
    Sources: filesystem
    Entities: 45

Switch: /profile use <name>
```

## Show Profile Details

```
/profile show personal

📁 Profile: personal
━━━━━━━━━━━━━━━━━━━

Template: life-archive
Path: ~/Documents/life/
Created: 2026-01-15
Last used: 2026-02-01

Schema:
  Resource types: 6
  ├── memory (67 entities)
  ├── person (34 entities)
  ├── place (23 entities)
  ├── event (18 entities)
  ├── artifact (12 entities)
  └── journal (2 entities)

  Dimensions: 2
  ├── life_period
  └── theme

Sources:
  ├── filesystem: ~/Pictures/ → artifacts
  └── manual: always enabled

Processing:
  ├── extract_entities: true
  ├── detect_people: true
  ├── detect_places: true
  └── create_timeline: true

Actions:
• /profile use personal - Switch to this profile
• /profile edit personal - Modify configuration
```

## Switch Profiles

```
/profile use personal

🔄 Switching Profile
━━━━━━━━━━━━━━━━━━━

From: work
To: personal

Saving work profile state...
✓ Index state saved
✓ Pending items noted (3 in staging)

Loading personal profile...
✓ Configuration loaded
✓ Schema loaded
✓ Sources configured
✓ Index loaded

━━━━━━━━━━━━━━━━━━━
✅ Now using: personal

Path: ~/Documents/life/
Pending: 2 items in inbox

Quick actions:
• /status - See current state
• /process - Process inbox items
```

## Create Profile

```
/profile create side-project

📁 Create New Profile
━━━━━━━━━━━━━━━━━━━━━

Name: side-project

How would you like to set it up?

  [1] Start from template
      Use a pre-built template as starting point

  [2] Copy existing profile
      Duplicate and customize another profile

  [3] Build from scratch
      Define everything yourself

Choice: 1

━━━━━━━━━━━━━━━━━━━━━

Select a template:

  [1] minimal - Just notes
  [2] zettelkasten - Personal knowledge garden
  [3] life-archive - Personal history
  [4] research - Academic work
  [5] creative - Portfolio and ideas
  [6] projects - Work documentation
  [7] opl - Open Protocol Library
  [8] activity-index - Events and grants

Choice: 6

━━━━━━━━━━━━━━━━━━━━━

Where should this knowledge base live?

Path: ~/Documents/side-project/

Creating profile...
✓ Configuration created
✓ Schema from template
✓ Directories created
✓ Profile registered

✅ Profile 'side-project' created!

Switch to it: /profile use side-project
```

## Edit Profile

```
/profile edit work

📝 Edit Profile: work
━━━━━━━━━━━━━━━━━━━━━

What would you like to modify?

  [1] Schema - Resource types and dimensions
  [2] Sources - Content sources and routing
  [3] Processing - Extraction and indexing settings
  [4] Path - Knowledge base location
  [5] Template - Change base template
  [6] Name - Rename profile

Choice: 2

━━━━━━━━━━━━━━━━━━━━━

Current Sources:

  ✓ meetily
    Database: ~/Library/.../meeting_minutes.sqlite
    Sync: manual
    Filter: min 5 min, exclude standup

  ✓ filesystem
    Watch: ~/Downloads/*.pdf → sources

  ○ fathom (not configured)
  ○ otter (not configured)
  ○ telegram (not configured)

Actions:
  [1] Enable a source
  [2] Disable a source
  [3] Configure existing source
  [4] Done

Choice:
```

## Profile Agents

Each profile can have an associated persona/agent style:

```yaml
# ~/.opal/profiles/personal/config.yaml
profile:
  name: personal
  template: life-archive
  path: ~/Documents/life/

  # Optional persona customization
  persona:
    name: Memory Keeper
    style: warm, reflective, encouraging
    focus: helping preserve and connect life memories
    prompts:
      greeting: "Welcome back. What memories shall we capture today?"
      processing: "Let me help you preserve this moment..."
```

## Export as Template

Share your configuration as a template:

```
/profile export work --name my-work-template

📤 Export Profile
━━━━━━━━━━━━━━━━━

Exporting: work
Template name: my-work-template

What to include?
  [✓] Schema (resource types, dimensions)
  [✓] Directory structure
  [✓] Processing settings
  [ ] Source configurations (may contain secrets)
  [ ] Entity index (contains your data)

Creating template...
✓ Schema exported
✓ Directory structure mapped
✓ Templates copied
✓ Manifest generated

✅ Template created!

Location: ~/.opal/templates/my-work-template/

Share this folder to let others use your setup.
```

## Profile Sync

Keep profiles in sync across machines:

```yaml
# ~/.opal/config.yaml
sync:
  enabled: true
  provider: git
  repository: git@github.com:user/opal-profiles.git
  include:
    - profiles/*/config.yaml
    - profiles/*/schema.yaml
    - profiles/*/sources.yaml
  exclude:
    - profiles/*/secrets.yaml
    - "*.sqlite"
```

## Environment Variables

Override active profile:

```bash
# Use specific profile for this session
OPAL_PROFILE=research claude

# Or set in shell
export OPAL_PROFILE=work
```

## Related Commands

- `/setup` - Initial setup and profile creation
- `/status` - Current profile status
- `/sync` - Sync content for active profile
- `/process` - Process inbox for active profile
