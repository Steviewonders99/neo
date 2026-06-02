/// Best-effort task title extracted from the tail of a Claude session's
/// first response. Pure heuristic — no network calls.
pub fn summarize_task(transcript_tail: &str) -> Option<String> {
    // Find a non-empty, non-prompt-looking line near the end of the transcript
    let candidate = transcript_tail.lines().rev().find(|l| {
        let t = l.trim();
        t.len() > 6
            && !t.starts_with('>')
            && !t.starts_with('$')
            && !t.starts_with('❯')
            && !t.starts_with('#')
    })?;
    Some(clean_title(candidate))
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
