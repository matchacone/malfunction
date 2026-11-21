# Spec Delta

## Purpose

Demonstrate a mock school AI gateway whose academic-integrity intervention and deliberately unhelpful chat produce a repeatable hackathon demo.

## ADDED Requirements

### Requirement: Standalone demo portal
The portal SHALL offer single-page chat with one live model provider, a clearly labeled preview of the other provider, and simulated school policy branding.

#### Scenario: Open the demo
- **WHEN** a visitor opens the portal
- **THEN** the header reads “CSU” and displays a non-interactive “School Admin Mode” badge
- **AND** the model control identifies the live provider and labels the other as preview-only without sending requests to it.
- **AND** the welcome screen keeps the full app name and Bible Mode hidden.

#### Scenario: Request is pending
- **WHEN** a chat request stays pending
- **THEN** the portal uses neutral loading copy before the first parable and cycles parody loading messages about every 1.4 seconds after the reveal
- **AND** the loading feedback stops when the request settles
- **AND** no loading message corresponds to any actual browser history access.

### Requirement: Academic integrity intervention
The gateway SHALL check unlocked requests for attempts to outsource graded work and SHALL decline a detected request with a verified local scripture quote and citation, locking only the originating session without calling the chat generator.

#### Scenario: Pasted graded exam question
- **WHEN** an unlocked user pastes a fake multiple-choice exam question and asks for the correct choice
- **THEN** the portal shows a distinct “Integrity Intervention” reply with a quote and citation from the local verse bank instead of an answer
- **AND** the session enters confession-only mode.

#### Scenario: Benign study request
- **WHEN** an unlocked user asks for study tips or conceptual help without outsourcing graded work
- **THEN** mention of schoolwork alone does not trigger the lock and the request proceeds to normal malfunction routing.

### Requirement: Confession-only recovery
While locked, the gateway SHALL route messages only to the confession check, except for the explicit demo reset. The portal SHALL show an amber cooldown banner and a confession prompt in place of the normal composer.

#### Scenario: Non-confession
- **WHEN** a locked user sends an unrelated message or a negated apology such as “I'm not sorry”
- **THEN** the session stays locked and receives a reminder without a chat completion.

#### Scenario: Apology or admission
- **WHEN** a locked user submits a clear first-person apology or admission of cheating
- **THEN** the portal displays “Go and study no more—wait, no, go and actually study. Chat unlocked.”
- **AND** normal chat resumes from Turn 1 on the next message.

### Requirement: Turn 1 parable
For an accepted new prompt, the gateway SHALL request a warm Jesus-themed tangent of three or four paragraphs that ends with a blessing and does not answer the question. After returning a successful parable, the session SHALL await an answer follow-up.

#### Scenario: Plain factual prompt
- **WHEN** a fresh user asks “What is the boiling point of water in Celsius?”
- **THEN** a tangential parable appears with a closing blessing and without giving the boiling point.
- **AND** the first parable reveals “Bible Mode active · Christ Sees You” inside the reply.

### Requirement: Turn 2 cliffhanger
When awaiting an answer follow-up, the gateway SHALL return exactly `Ah, the answer is` with `freezeCursor: true` for a recognized answer-only follow-up without any model call. The portal SHALL reveal the text over approximately 900 ms and retain the cursor on that reply until the transcript is cleared.

#### Scenario: Ask for the missing answer
- **WHEN** the user follows a parable with “Okay but what's the actual answer?”
- **THEN** the reply stops after the exact phrase, with no punctuation or answer appended
- **AND** the cursor remains visible without keeping the network request pending or disabling the composer.

#### Scenario: Start a different topic
- **WHEN** the user submits an unrelated benign prompt while awaiting a follow-up or after a cliffhanger
- **THEN** the portal starts a new Turn 1 exchange, leaving any earlier frozen reply in the transcript.

### Requirement: Repeatable demo sessions
The portal SHALL isolate session state, offer quick-fill controls that populate the composer without submitting, and support the hidden exact `/reset` command in either composer to return that session to Turn 1 and clear the transcript.

#### Scenario: Reset after an intervention or cliffhanger
- **WHEN** the user submits `/reset`
- **THEN** the gateway clears that session's lock and follow-up state without a model call, and the portal clears the transcript and frozen cursor
- **AND** other browser sessions remain unchanged.

### Requirement: Recoverable provider errors
The gateway SHALL report provider failures as retryable errors without advancing the session or disclosing provider credentials or raw diagnostics.

#### Scenario: Provider times out or classifier returns invalid data
- **WHEN** a provider call times out, fails, or returns an invalid classifier response
- **THEN** the portal clears its loader and offers a retry with session state unchanged.
