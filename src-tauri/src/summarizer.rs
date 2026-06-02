use serde::Deserialize;
use serde_json::json;

const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const MODEL: &str = "moonshotai/kimi-k2";

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: ChoiceMessage,
}

#[derive(Deserialize)]
struct ChoiceMessage {
    content: String,
}

pub async fn summarize_task(transcript_tail: &str) -> Option<String> {
    let api_key = std::env::var("OPENROUTER_API_KEY").ok()?;
    if api_key.is_empty() {
        return None;
    }

    let snippet: String = transcript_tail.chars().rev().take(2400).collect::<String>()
        .chars().rev().collect();

    let body = json!({
        "model": MODEL,
        "max_tokens": 24,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": "You name coding tasks for a developer's terminal-pane UI. Reply with at most 6 words, no punctuation at the end, no quotes, no preamble — just the title. Examples: 'fix login redirect bug', 'add stripe webhook handler', 'refactor pane state hook'."
            },
            {
                "role": "user",
                "content": format!(
                    "Here is the start of a Claude Code session. Write a 3-6 word task title summarizing what the developer is working on.\n\n--- transcript ---\n{}",
                    snippet.trim()
                )
            }
        ]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(OPENROUTER_URL)
        .bearer_auth(api_key)
        .header("HTTP-Referer", "https://github.com/junop/terminal-panes")
        .header("X-Title", "Terminal Panes")
        .json(&body)
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let parsed: ChatResponse = resp.json().await.ok()?;
    let raw = parsed.choices.first()?.message.content.trim().to_string();
    Some(clean_title(&raw))
}

/// Heuristic fallback (no API key, or call failed) — extract first useful phrase from transcript tail.
pub fn heuristic_title(transcript_tail: &str) -> Option<String> {
    let cleaned = transcript_tail.lines().rev().find(|l| {
        let t = l.trim();
        t.len() > 6 && !t.starts_with('>') && !t.starts_with('$')
    })?;
    Some(clean_title(cleaned))
}

fn clean_title(s: &str) -> String {
    let trimmed = s
        .trim()
        .trim_matches(|c: char| c == '"' || c == '\'' || c == '.' || c == ':' || c == '*');
    let words: Vec<&str> = trimmed.split_whitespace().take(8).collect();
    let mut title = words.join(" ");
    if title.len() > 60 {
        title.truncate(60);
    }
    title
}
