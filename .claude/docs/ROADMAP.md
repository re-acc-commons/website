# OPAL Feature Roadmap

## The Open Protocol Librarian's Swiss Army Knife

This document envisions the complete feature set for OPAL - everything an open protocol librarian needs to build, curate, and steward a thriving knowledge commons.

---

## 1. Capture Layer: Getting Knowledge In

The librarian's first challenge is **capturing knowledge wherever it lives**. OPAL should be omnivorous.

### 1.1 Conversation Capture
**Current:** Otter, Fathom, Read.ai, Meetily integration
**Enhanced:**
- **Voice Memos** - Process audio files directly (Whisper/local transcription)
- **Phone Integration** - Telegram bot accepts voice messages, auto-transcribes
- **Live Capture Mode** - Real-time transcription during calls (via system audio)
- **Speaker Diarization** - Know who said what, map to Person entities
- **Multi-language** - Transcribe and optionally translate non-English content

### 1.2 Document Capture
**Current:** File ingestion, PDF (planned)
**Enhanced:**
- **Email Forwarding** - Dedicated email address that ingests forwarded content
- **Browser Extension** - One-click capture of any webpage with context
- **Bookmarklet** - Lightweight alternative for quick saves
- **Screenshot OCR** - Extract text from images of whiteboards, slides, etc.
- **Academic Import** - arXiv, SSRN, Google Scholar with proper citation extraction
- **Book Import** - Kindle highlights, Readwise, Hypothesis annotations

### 1.3 Stream Capture
**Enhanced:**
- **RSS/Atom Monitoring** - Subscribe to feeds, auto-ingest relevant content
- **Newsletter Parsing** - Process Substack, Buttondown, etc.
- **Social Listening** - Monitor Twitter/X, Mastodon, LinkedIn for keywords
- **YouTube/Podcast** - Extract transcripts from media URLs
- **GitHub Activity** - Watch repos, discussions, issues for patterns
- **Discord/Slack Channels** - Archive important threads

### 1.4 Collaborative Capture
**Enhanced:**
- **Shared Inbox** - Multiple librarians can triage incoming content
- **Community Submissions** - Public form for suggesting additions
- **Import from Other Commons** - One-click fork from federated sources
- **Bulk Import** - CSV/JSON for migrating existing knowledge bases

---

## 2. Processing Layer: Making Sense of Content

Raw content needs intelligence. OPAL should understand context deeply.

### 2.1 Content Understanding
**Current:** Classification, transcript cleanup, entity extraction
**Enhanced:**
- **Multi-pass Extraction** - First pass: obvious entities. Second pass: implied relationships. Third pass: cross-reference with existing corpus
- **Contextual Classification** - Use conversation context, not just content
- **Confidence Calibration** - Learn from librarian corrections over time
- **Ambiguity Flagging** - Highlight uncertain extractions for review

### 2.2 Content Enrichment
**Enhanced:**
- **Auto-summarization** - Generate summaries at multiple lengths (tweet, paragraph, page)
- **Key Quotes Extraction** - Pull the most quotable/important statements
- **Reading Level Assessment** - Flesch-Kincaid and accessibility scoring
- **Complexity Mapping** - Rate conceptual difficulty, prerequisite knowledge
- **Sentiment Analysis** - Understand tone, controversy level
- **Temporal Extraction** - When was this relevant? Extract dates, deadlines

### 2.3 Relationship Discovery
**Enhanced:**
- **Implicit Connections** - Find relationships not explicitly stated
- **Contradiction Detection** - Flag when new content conflicts with existing
- **Gap Identification** - "This pattern references a protocol that doesn't exist yet"
- **Precedent Linking** - Connect to historical examples, case studies
- **Citation Graph** - Track who references whom

### 2.4 Quality Assessment
**Enhanced:**
- **Completeness Scoring** - Does this entity have all expected fields?
- **Source Quality** - Rate reliability of source
- **Freshness Tracking** - When was this last verified?
- **Duplication Risk** - How similar to existing content?
- **Impact Prediction** - Will this be frequently referenced?

---

## 3. Curation Layer: Human-AI Collaboration

Librarians need powerful tools for review and organization.

### 3.1 Review Experience
**Current:** Basic /review command
**Enhanced:**
- **Batch Review** - Process multiple items with keyboard shortcuts
- **Side-by-Side Diff** - Compare extracted entities to source
- **Quick Edit** - Inline corrections without leaving review flow
- **Confidence Sorting** - Review lowest-confidence items first
- **Category Filters** - Review all "Person" entities at once
- **Undo/Redo Stack** - Recover from mistakes

### 3.2 Organization Tools
**Enhanced:**
- **Drag-and-Drop Taxonomy** - Visual taxonomy editor
- **Bulk Recategorization** - Move many entities at once
- **Merge Wizard** - Combine duplicate entities with field selection
- **Split Tool** - Break compound entities into separate entries
- **Archive/Restore** - Soft-delete with recovery
- **Collections** - Create curated lists across types

### 3.3 Editorial Workflow
**Enhanced:**
- **Draft Mode** - Work-in-progress entities not yet public
- **Editorial Calendar** - Schedule reviews, publications
- **Assignment System** - Route items to specific librarians
- **Review Requests** - Ask experts to verify specific content
- **Style Guide Enforcement** - Check against writing standards
- **Template Compliance** - Ensure required fields are filled

### 3.4 Annotation & Discussion
**Enhanced:**
- **Inline Comments** - Annotate specific passages
- **Discussion Threads** - Debate interpretations
- **@Mentions** - Notify collaborators
- **Decision Log** - Record why choices were made
- **Question Flags** - Mark items needing clarification

---

## 4. Discovery Layer: Finding and Connecting Knowledge

The commons is only valuable if knowledge is findable.

### 4.1 Search & Query
**Current:** /search planned
**Enhanced:**
- **Semantic Search** - Natural language queries across all content
- **Faceted Search** - Filter by type, sector, scale, date, contributor
- **Fuzzy Matching** - Find misspellings, variations
- **Regex Search** - Power-user pattern matching
- **Saved Searches** - Store and rerun common queries
- **Search Analytics** - What are people looking for? (Gap signal)

### 4.2 Exploration & Visualization
**Enhanced:**
- **Knowledge Graph** - Interactive visualization of entity relationships
- **Taxonomy Browser** - Navigate the classification hierarchy
- **Timeline View** - See content chronologically
- **Map View** - Geographic visualization for place-linked content
- **Contributor Graph** - Who contributed what, collaboration patterns
- **Heat Maps** - Coverage intensity across taxonomy

### 4.3 Recommendations & Discovery
**Enhanced:**
- **"Similar To"** - Find related entities
- **"You Might Also Like"** - Based on browsing patterns
- **"Missing Links"** - Suggest relationships that should exist
- **"New This Week"** - Digest of recent additions
- **"Trending"** - Most viewed/referenced content
- **"Random Walk"** - Serendipitous exploration

### 4.4 Intelligence & Analytics
**Enhanced:**
- **Coverage Reports** - What sectors/scales are underserved?
- **Freshness Reports** - What content is getting stale?
- **Contributor Metrics** - Who's contributing? Diversity of perspectives?
- **Usage Analytics** - What's being accessed, cited, shared?
- **Network Analysis** - Central nodes, bridges, clusters
- **Trend Detection** - Topics gaining/losing attention

---

## 5. Publishing Layer: Sharing Knowledge

Knowledge commons exist to be shared.

### 5.1 Static Site Generation
**Enhanced:**
- **Quartz Integration** - Beautiful wiki-style sites from markdown
- **Hugo/Jekyll Themes** - Alternative static site generators
- **Custom Domains** - Publish to your-commons.org
- **Incremental Builds** - Only rebuild changed pages
- **Preview Deployments** - See changes before publishing

### 5.2 Syndication & Distribution
**Enhanced:**
- **RSS/Atom Feeds** - Per-category, per-author, custom feeds
- **Newsletter Generation** - Weekly/monthly digests
- **Social Posting** - Auto-share to Twitter, Mastodon, LinkedIn
- **ActivityPub** - Native fediverse publishing
- **IPFS Pinning** - Decentralized, permanent hosting
- **API Access** - REST/GraphQL for developers

### 5.3 Export & Interoperability
**Enhanced:**
- **PDF Export** - Print-ready documents
- **EPUB/MOBI** - E-reader formats
- **Obsidian Vault** - Direct sync to local knowledge base
- **Notion Export** - Formatted for Notion import
- **Zotero/Mendeley** - Reference manager integration
- **JSON-LD** - Semantic web / linked data export

### 5.4 Embedding & Widgets
**Enhanced:**
- **Entity Cards** - Embeddable previews for any entity
- **Search Widget** - Add search to external sites
- **Graph Widget** - Embed relationship visualizations
- **Citation Generator** - Copy citations in any format
- **Badge Generator** - "Featured in [Commons]" badges

---

## 6. Federation Layer: Connected Commons

No commons is an island.

### 6.1 Source Synchronization
**Current:** Basic federation planned
**Enhanced:**
- **Selective Sync** - Subscribe to specific categories only
- **Transform Rules** - Map external taxonomies to local
- **Conflict Resolution** - Handle divergent versions
- **Attribution Tracking** - Maintain provenance across forks
- **Sync Scheduling** - Real-time, daily, weekly options

### 6.2 Cross-Commons Discovery
**Enhanced:**
- **Federated Search** - Query across multiple commons
- **Global Entity Registry** - Unique IDs across the network
- **Commons Directory** - Discover related commons
- **Reputation Sharing** - Trust scores across network
- **Link Suggestions** - "Entity X in Commons Y is similar"

### 6.3 Collaborative Curation
**Enhanced:**
- **Cross-Commons PRs** - Propose changes to upstream
- **Joint Governance** - Shared voting on shared entities
- **Attribution Chains** - Track the full history of remixing
- **License Compliance** - Ensure proper attribution

### 6.4 Network Health
**Enhanced:**
- **Federation Dashboard** - Status of all connected commons
- **Sync Logs** - Audit trail of federation activity
- **Health Checks** - Detect broken links, stale syncs
- **Network Metrics** - Global commons statistics

---

## 7. Governance Layer: Democratic Stewardship

Commons require collective decision-making.

### 7.1 Voting & Consensus
**Current:** PR-based voting (3 approvals)
**Enhanced:**
- **Configurable Thresholds** - Different rules for different content types
- **Weighted Voting** - Based on reputation/stake
- **Delegation** - Liquid democracy, delegate to trusted curators
- **Quorum Requirements** - Minimum participation thresholds
- **Time-Locked Decisions** - Mandatory waiting periods
- **Supermajority Rules** - For constitutional changes

### 7.2 Roles & Permissions
**Enhanced:**
- **Role Templates** - Curator, Contributor, Reader, Admin
- **Granular Permissions** - Per-action, per-category
- **Invitation System** - Onboard new contributors
- **Mentorship Mode** - New contributors paired with veterans
- **Sabbatical/Hiatus** - Temporary role suspension
- **Succession Planning** - Role handoff workflows

### 7.3 Conflict Resolution
**Enhanced:**
- **Dispute Flags** - Mark contested content
- **Arbitration Queue** - Escalation path for conflicts
- **Evidence Attachments** - Support claims with sources
- **Binding Decisions** - Final rulings that stick
- **Appeal Process** - Reconsideration pathway
- **Transparency Reports** - Public conflict logs

### 7.4 Policy & Constitution
**Enhanced:**
- **Living Documents** - Version-controlled governance docs
- **Amendment Process** - Formal change proposals
- **Referendum System** - Community-wide votes
- **Policy Templates** - Best practices for new commons
- **Compliance Checks** - Ensure content meets policies

---

## 8. Intelligence Layer: AI-Powered Insights

Claude isn't just for extraction - it's a thinking partner.

### 8.1 Question Answering
**Enhanced:**
- **Ask the Commons** - Natural language Q&A over all content
- **Citation-Backed Answers** - Always show sources
- **Multi-Document Synthesis** - Combine insights from many entities
- **Uncertainty Expression** - "Based on available content, likely..."
- **Follow-up Suggestions** - "You might also want to know..."

### 8.2 Writing Assistance
**Enhanced:**
- **Draft Generation** - Create initial entity drafts
- **Improvement Suggestions** - "This could be clearer if..."
- **Consistency Checks** - Match style across entries
- **Translation** - Convert between languages
- **Simplification** - Reduce complexity for broader audience
- **Expansion** - Add depth where needed

### 8.3 Strategic Analysis
**Enhanced:**
- **Gap Analysis** - "Your commons lacks coverage of X"
- **Trend Reports** - "These topics are emerging..."
- **Comparison Reports** - "How does your coverage compare to Commons Y?"
- **Impact Assessment** - "Adding this would connect to N entities"
- **Priority Suggestions** - "Based on usage, focus on..."

### 8.4 Automation & Agents
**Enhanced:**
- **Scheduled Tasks** - Run ingestion/processing on schedule
- **Triggered Workflows** - "When X happens, do Y"
- **Background Monitoring** - Continuous source watching
- **Proactive Alerts** - "A new relevant article was published"
- **Self-Healing** - Auto-fix broken links, stale content

---

## 9. Experience Layer: Delightful Interfaces

Tools should be a joy to use.

### 9.1 Command Experience
**Current:** Slash commands
**Enhanced:**
- **Autocomplete** - Suggest commands as you type
- **Command Chaining** - Pipe output between commands
- **History** - Recall and rerun previous commands
- **Aliases** - Custom shortcuts for common workflows
- **Help System** - Context-sensitive, progressive disclosure

### 9.2 Conversation Experience
**Enhanced:**
- **Persistent Memory** - Remember preferences, past decisions
- **Proactive Suggestions** - "You haven't processed the inbox in 3 days"
- **Progress Indicators** - Visual feedback during long operations
- **Interruptibility** - Pause and resume long tasks
- **Undo** - Recover from any mistake

### 9.3 Notification Experience
**Enhanced:**
- **Multi-Channel** - Telegram, email, desktop, etc.
- **Digest Options** - Real-time, daily, weekly
- **Priority Levels** - Urgent vs. FYI
- **Quiet Hours** - Respect focus time
- **Customizable Triggers** - Choose what you're notified about

### 9.4 Mobile Experience
**Enhanced:**
- **Telegram Bot** - Full OPAL access via chat
- **Quick Actions** - Approve/reject from notifications
- **Voice Input** - Dictate queries and commands
- **Offline Queue** - Queue actions when disconnected

---

## 10. Integration Layer: Ecosystem Connections

OPAL should play well with existing tools.

### 10.1 Knowledge Management
- **Obsidian** - Bidirectional sync
- **Notion** - Database mirroring (enhanced)
- **Roam/Logseq** - Graph-based tools
- **Tana** - Supertag-compatible export
- **Capacities** - Object-based sync

### 10.2 Communication
- **Slack** - Channel integration
- **Discord** - Bot + webhook integration
- **Matrix** - Decentralized chat
- **Email** - Forward-to-ingest + notification

### 10.3 Project Management
- **Linear** - Issue linking
- **GitHub Issues** - Bidirectional sync
- **Airtable** - Structured data bridge
- **Coda** - Doc automation

### 10.4 Research Tools
- **Zotero** - Reference management
- **Hypothesis** - Web annotation
- **Readwise** - Reading highlights
- **Pocket/Instapaper** - Read-later integration

### 10.5 Media Tools
- **YouTube** - Transcript extraction
- **Spotify/Apple Podcasts** - Podcast transcripts
- **Loom** - Video transcript + screenshot
- **Figma/Miro** - Visual artifact extraction

---

## Priority Features for V1.1

Based on librarian needs, these are the highest-impact additions:

### Must Have (V1.1)
1. **Semantic Search** - `/search` with natural language
2. **Voice Memo Processing** - Direct audio file ingestion
3. **Browser Extension** - One-click webpage capture
4. **Knowledge Graph View** - Visual entity relationships
5. **Coverage Reports** - Identify gaps in taxonomy
6. **Email Forwarding** - inbox@yourcommons.org
7. **RSS Monitoring** - Subscribe to external feeds
8. **PDF Processing** - Convert PDF to entities
9. **Weekly Digest** - Automated activity summary
10. **Ask the Commons** - Q&A over corpus

### Should Have (V1.2)
1. **Multi-language** - Translation support
2. **Quartz Publishing** - Static site generation
3. **Obsidian Sync** - Local vault integration
4. **Federated Search** - Cross-commons queries
5. **Role System** - Beyond GitHub permissions
6. **Activity Timeline** - What changed when
7. **Batch Operations** - Bulk edit/move/delete
8. **Custom Taxonomies** - Beyond OPL preset
9. **API Access** - External integrations
10. **Conflict Resolution** - Dispute handling

### Nice to Have (V1.3+)
1. **ActivityPub** - Fediverse publishing
2. **IPFS Pinning** - Decentralized storage
3. **Liquid Democracy** - Delegated voting
4. **AI Agents** - Autonomous monitoring
5. **Mobile App** - Native experience
6. **Graph Analytics** - Network analysis
7. **Real-time Collaboration** - Multi-user editing
8. **Custom Workflows** - Visual automation builder
9. **Plugin System** - Community extensions
10. **Self-Hosted** - Full local deployment

---

## Architecture Implications

### New Skills Needed
- `search-semantic` - Vector search over corpus
- `transcribe-audio` - Whisper integration
- `capture-web` - URL to markdown
- `generate-graph` - Knowledge graph rendering
- `analyze-coverage` - Gap detection
- `monitor-rss` - Feed watching
- `process-pdf` - PDF extraction
- `generate-digest` - Summary compilation
- `qa-corpus` - Question answering
- `translate` - Multi-language

### New Commands Needed
- `/search <query>` - Semantic search
- `/ask <question>` - Q&A interface
- `/graph [entity]` - Show relationships
- `/coverage [sector]` - Gap analysis
- `/digest` - Generate summary
- `/watch <url>` - Monitor source
- `/translate <entity> <lang>` - Translate content
- `/export <format>` - Export data

### Infrastructure Additions
- Vector database (for semantic search)
- Audio processing pipeline
- RSS aggregator
- Graph database or materialized views
- Scheduled task runner

---

*This roadmap represents the full vision. Implementation should be prioritized based on librarian feedback and community needs.*
